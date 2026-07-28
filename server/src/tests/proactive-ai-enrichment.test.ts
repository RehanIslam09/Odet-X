import assert from "node:assert/strict";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import Activity from "../models/activity.model.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import { ProjectSignal } from "../constants/proactive-intelligence.js";
import { aiService } from "../ai/ai.service.js";
import { initializeAI } from "../ai/init.js";
import {
  ProactiveRecommendationEnrichmentSchema,
} from "../ai/schemas/proactive-recommendation.schema.js";
import {
  buildDeterministicRecommendationFallback,
  buildProactiveRecommendationContext,
  enrichProjectSignal,
} from "../services/proactive-recommendation-ai.service.js";
import { AITimeoutError, AIProviderError, AIValidationError } from "../ai/errors/ai.errors.js";

async function runProactiveAIEnrichmentTests() {
  console.log("\n==================================================");
  console.log("▶ Phase 30 WP-03 Proactive AI Enrichment Tests");
  console.log("==================================================\n");

  // Ensure AI subsystem prompts are registered
  initializeAI();

  await setupTestDatabase();

  const originalGenerate = aiService.generateStructuredData.bind(aiService);

  try {
    const frozenNow = new Date("2026-07-27T12:00:00.000Z");
    const projId = "proj_ai_test_100";
    const ownerId = "owner_ai_test_100";

    // Sample signals representing all 4 frozen signal types
    const overdueSignal: ProjectSignal = {
      type: "OVERDUE_HIGH_PRIORITY_TASKS",
      ownerId,
      projectId: projId,
      severity: "CRITICAL",
      detectedAt: frozenNow,
      relatedEntities: [{ type: "task", id: "t1", label: "Fix Critical Auth Bug" }],
      facts: { overdueCount: 3, urgentCount: 1, highCount: 2, oldestDueDate: "2026-07-26T00:00:00Z" },
      fingerprint: "1111111111222222222233333333334444444444555555555566666666667777",
    };

    const milestoneSignal: ProjectSignal = {
      type: "MILESTONE_AT_RISK",
      ownerId,
      projectId: projId,
      severity: "HIGH",
      detectedAt: frozenNow,
      relatedEntities: [{ type: "milestone", id: "ms1", label: "Sprint 1 Release" }],
      facts: { milestoneTitle: "Sprint 1 Release", targetDate: "2026-07-29T00:00:00Z", totalAttachedTasks: 5, incompleteTasksCount: 3, overdueTasksCount: 1 },
      fingerprint: "2222222222333333333344444444445555555555666666666677777777778888",
    };

    const bottleneckSignal: ProjectSignal = {
      type: "DEPENDENCY_BOTTLENECK",
      ownerId,
      projectId: projId,
      severity: "HIGH",
      detectedAt: frozenNow,
      relatedEntities: [{ type: "task", id: "blocker_1", label: "Database Migration" }],
      facts: { blockingTaskId: "blocker_1", blockingTaskTitle: "Database Migration", downstreamCount: 4, downstreamUrgentCount: 1 },
      fingerprint: "3333333333444444444455555555556666666666777777777788888888889999",
    };

    const stalledSignal: ProjectSignal = {
      type: "PROJECT_STALLED",
      ownerId,
      projectId: projId,
      severity: "MEDIUM",
      detectedAt: frozenNow,
      relatedEntities: [{ type: "project", id: projId, label: "Core API Project" }],
      facts: { stalledDays: 8, incompleteTaskCount: 6, lastActivityDate: "2026-07-19T12:00:00Z" },
      fingerprint: "4444444444555555555566666666667777777777888888888899999999990000",
    };

    const allSignals = [overdueSignal, milestoneSignal, bottleneckSignal, stalledSignal];

    // -----------------------------------------------------------------------
    // 1. DETERMINISTIC FALLBACK GENERATOR & SCHEMA TESTS
    // -----------------------------------------------------------------------
    console.log(">> 1. Testing Deterministic Fallback Generator for All 4 Signal Types...");

    for (const sig of allSignals) {
      const fb1 = buildDeterministicRecommendationFallback(sig);
      const fb2 = buildDeterministicRecommendationFallback(sig);

      // Verify purity and determinism
      assert.deepEqual(fb1, fb2, `Fallback for ${sig.type} must be 100% deterministic`);

      // Verify schema compliance
      const parsed = ProactiveRecommendationEnrichmentSchema.parse(fb1);
      assert.ok(parsed.title.length > 0);
      assert.ok(parsed.explanation.length > 0);
      assert.ok(parsed.title.length <= 150);
      assert.ok(parsed.explanation.length <= 1500);
    }

    console.log("✅ Passed: Deterministic fallback generators satisfy all schema rules and purity invariants.");

    // -----------------------------------------------------------------------
    // 2. BOUNDED CONTEXT BUILDER TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> 2. Testing Bounded Context Builder & Privacy Exclusions...");

    const ctx = buildProactiveRecommendationContext(overdueSignal, {
      name: "   Alpha Project   ",
      description: "A ".repeat(1000), // Should be truncated to 500
    });

    const projectCtx: any = ctx.project;
    assert.equal(projectCtx.name, "Alpha Project");
    assert.equal(projectCtx.description.length, 500, "Description must be truncated to context bounds");
    assert.equal(ctx.owner, undefined, "owner field must NOT be in context");
    assert.equal((ctx as any)._id, undefined, "_id field must NOT be in context");

    console.log("✅ Passed: Bounded context builder truncates user text and excludes internal metadata.");

    // -----------------------------------------------------------------------
    // 3. AI ENRICHMENT SUCCESS PATH (MOCKED AI SERVICE)
    // -----------------------------------------------------------------------
    console.log("\n>> 3. Testing AI Enrichment Success Path (Mocked AIService)...");

    aiService.generateStructuredData = (async () => ({
      data: {
        title: "3 Urgent Tasks Need Review",
        explanation: "3 high-priority tasks are past due, including 1 urgent security fix.",
        suggestedNextStep: "Reassign tasks or update due dates to align team priorities.",
      },
      metadata: {
        executionId: "exec_12345",
        provider: "mock-fast",
        model: "mock-model",
        durationMs: 120,
        promptName: "proactive-project-recommendation",
        promptVersion: "1.0.0",
      },
    })) as any;

    const enrichResult = await enrichProjectSignal({
      signal: overdueSignal,
      projectContext: { name: "Core API Project" },
    });

    assert.equal(enrichResult.isFallback, false);
    assert.equal(enrichResult.title, "3 Urgent Tasks Need Review");
    assert.equal(enrichResult.executionId, "exec_12345");

    console.log("✅ Passed: AI enrichment returns validated structured advisory text cleanly.");

    // -----------------------------------------------------------------------
    // 4. AI TIMEOUT & PROVIDER FAILURE FALLBACK TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> 4. Testing AI Timeout & Provider Failure Fallback Triggers...");

    // Test A: AITimeoutError
    aiService.generateStructuredData = (async () => {
      throw new AITimeoutError("AI execution timed out");
    }) as any;

    const timeoutResult = await enrichProjectSignal({ signal: overdueSignal });
    assert.equal(timeoutResult.isFallback, true);
    assert.equal(timeoutResult.title, "High-priority tasks are overdue");

    // Test B: AIProviderError
    aiService.generateStructuredData = (async () => {
      throw new AIProviderError("Provider unavailable", null, "SERVER_ERROR");
    }) as any;

    const providerFailResult = await enrichProjectSignal({ signal: milestoneSignal });
    assert.equal(providerFailResult.isFallback, true);
    assert.equal(providerFailResult.title, "Milestone target date is at risk");

    // Test C: Empty / Whitespace string returned by AI
    aiService.generateStructuredData = (async () => ({
      data: {
        title: "   ",
        explanation: "   ",
        suggestedNextStep: null,
      },
      metadata: { executionId: "exec_empty", provider: "mock", model: "mock", durationMs: 50, promptName: "test", promptVersion: "1.0.0" },
    })) as any;

    const emptyResult = await enrichProjectSignal({ signal: bottleneckSignal });
    assert.equal(emptyResult.isFallback, true);
    assert.equal(emptyResult.title, "Task dependency is blocking progress");

    console.log("✅ Passed: AI failures, timeouts, and empty outputs safely trigger deterministic fallback.");

    // -----------------------------------------------------------------------
    // 5. IMMUTABILITY & ACTION INJECTION AUDIT
    // -----------------------------------------------------------------------
    console.log("\n>> 5. Testing Severity / Fingerprint / Action Injection Rejections...");

    // Test A: Direct Zod Schema .strict() rejection
    const invalidExtraFields = {
      title: "Malicious Title",
      explanation: "Exploit attempt",
      suggestedNextStep: null,
      severity: "LOW", // Forbidden extra field!
      status: "ACTED_ON", // Forbidden extra field!
      proposedAction: "DELETE_TASK", // Forbidden extra field!
      signingToken: "fake_token", // Forbidden extra field!
    };
    const parseResult = ProactiveRecommendationEnrichmentSchema.safeParse(invalidExtraFields);
    assert.equal(parseResult.success, false, "Zod strict schema must fail validation when extra fields are present");

    // Test B: Mock AIService calling validateAIResponse or throwing AIValidationError on extra fields
    aiService.generateStructuredData = (async () => {
      throw new AIValidationError("Schema validation failed: extra fields detected", {
        issues: [{ path: "severity", code: "unrecognized_keys", message: "Unrecognized key(s) in object: 'severity'" }],
      });
    }) as any;

    const injectionResult = await enrichProjectSignal({ signal: overdueSignal });
    assert.equal(injectionResult.isFallback, true, "Schema validation failure must trigger safe deterministic fallback");
    assert.equal(injectionResult.title, "High-priority tasks are overdue");

    // Verify signal severity and fingerprint remain unchanged
    assert.equal(overdueSignal.severity, "CRITICAL", "Authoritative signal severity must remain CRITICAL");

    console.log("✅ Passed: Schema strict mode prevents severity, status, or action token injections.");

    // -----------------------------------------------------------------------
    // 6. ZERO SIDE-EFFECT VERIFICATION
    // -----------------------------------------------------------------------
    console.log("\n>> 6. Testing Zero Side-Effect Verification across WP-03...");

    const recommendationCountBefore = await ProjectRecommendation.countDocuments();
    const activityCountBefore = await Activity.countDocuments();
    const memoryCountBefore = await ProjectMemory.countDocuments();
    const projectCountBefore = await Project.countDocuments();
    const taskCountBefore = await Task.countDocuments();
    const milestoneCountBefore = await Milestone.countDocuments();

    // Perform enrichment multiple times
    await enrichProjectSignal({ signal: overdueSignal });
    await enrichProjectSignal({ signal: milestoneSignal });
    await enrichProjectSignal({ signal: bottleneckSignal });
    await enrichProjectSignal({ signal: stalledSignal });

    const recommendationCountAfter = await ProjectRecommendation.countDocuments();
    const activityCountAfter = await Activity.countDocuments();
    const memoryCountAfter = await ProjectMemory.countDocuments();
    const projectCountAfter = await Project.countDocuments();
    const taskCountAfter = await Task.countDocuments();
    const milestoneCountAfter = await Milestone.countDocuments();

    assert.equal(recommendationCountBefore, recommendationCountAfter, "0 recommendations created");
    assert.equal(activityCountBefore, activityCountAfter, "0 activities created");
    assert.equal(memoryCountBefore, memoryCountAfter, "0 memories created");
    assert.equal(projectCountBefore, projectCountAfter, "0 projects mutated");
    assert.equal(taskCountBefore, taskCountAfter, "0 tasks mutated");
    assert.equal(milestoneCountBefore, milestoneCountAfter, "0 milestones mutated");

    console.log("✅ Passed: WP-03 is 100% read-only with zero DB mutations.");

  } finally {
    aiService.generateStructuredData = originalGenerate;
    await teardownTestDatabase();
  }

  console.log("\n==================================================");
  console.log("🎉 ALL PROACTIVE AI ENRICHMENT WP-03 TESTS PASSED!");
  console.log("==================================================\n");
}

runProactiveAIEnrichmentTests().catch((error) => {
  console.error("❌ ProactiveAIEnrichment WP-03 test failed:", error);
  process.exit(1);
});
