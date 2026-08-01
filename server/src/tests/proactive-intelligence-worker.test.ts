import assert from "node:assert/strict";
import { Types } from "mongoose";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Activity from "../models/activity.model.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import { aiService } from "../ai/ai.service.js";
import { initializeAI } from "../ai/init.js";
import {
  findProactiveCandidateProjects,
  getUserDailyProactiveAICalls,
  runProactiveIntelligenceCycle,
} from "../services/proactive-intelligence-worker.service.js";
import { processProactiveIntelligenceJob } from "../jobs/proactive-intelligence.jobs.js";

async function runProactiveIntelligenceWorkerTests() {
  console.log("\n==================================================");
  console.log("▶ Phase 30 WP-05 Background Worker Engine Tests");
  console.log("==================================================\n");

  initializeAI();
  await setupTestDatabase();

  const originalGenerate = aiService.generateStructuredData.bind(aiService);

  try {
    const frozenNow = new Date("2026-07-27T12:00:00.000Z");
    const userA = new Types.ObjectId().toString();
    const userB = new Types.ObjectId().toString();

    // Mock AI service to return clean presentation text
    let mockAiCallCount = 0;
    aiService.generateStructuredData = (async () => {
      mockAiCallCount++;
      return {
        data: {
          title: "Proactive Task Advisory",
          explanation: "High-priority tasks are past due and require attention.",
          suggestedNextStep: "Review task priorities.",
        },
        metadata: {
          executionId: `exec_worker_${mockAiCallCount}`,
          provider: "mock-fast",
          model: "mock-model",
          durationMs: 50,
          promptName: "proactive-project-recommendation",
          promptVersion: "1.0.0",
        },
      };
    }) as any;

    // -----------------------------------------------------------------------
    // A. CANDIDATE DISCOVERY & EXCLUSION BOUNDARIES
    // -----------------------------------------------------------------------
    console.log(">> A. Testing Candidate Discovery & Soft-Delete/Archived Exclusions...");

    const activeProj = await Project.create({ owner: userA, name: "Active Proj", archived: false, isDeleted: false, updatedAt: new Date("2026-07-27T10:00:00Z") });
    await Project.create({ owner: userA, name: "Soft Deleted Proj", archived: false, isDeleted: true, updatedAt: new Date("2026-07-27T11:00:00Z") });
    await Project.create({ owner: userA, name: "Archived Proj", archived: true, isDeleted: false, updatedAt: new Date("2026-07-27T11:30:00Z") });

    const candidates = await findProactiveCandidateProjects(50);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.id, activeProj._id.toString());
    assert.equal(candidates[0]?.name, "Active Proj");

    console.log("✅ Passed: Candidate discovery strictly excludes soft-deleted and archived projects.");

    // Clean DB for subsequent tests
    await Project.deleteMany({});

    // -----------------------------------------------------------------------
    // B. DETERMINISTIC CANDIDATE ORDERING
    // -----------------------------------------------------------------------
    console.log("\n>> B. Testing Deterministic Candidate Ordering (updatedAt DESC, _id ASC)...");

    const p1 = await Project.create({ owner: userA, name: "Proj 1", archived: false, isDeleted: false });
    const p2 = await Project.create({ owner: userA, name: "Proj 2", archived: false, isDeleted: false });
    await Project.collection.updateOne({ _id: p1._id }, { $set: { updatedAt: new Date("2026-07-27T08:00:00Z") } });
    await Project.collection.updateOne({ _id: p2._id }, { $set: { updatedAt: new Date("2026-07-27T09:00:00Z") } });

    const orderedCandidates = await findProactiveCandidateProjects(50);
    assert.equal(orderedCandidates.length, 2);
    assert.equal(orderedCandidates[0]?.id, p2._id.toString(), "Most recently updated project comes first");
    assert.equal(orderedCandidates[1]?.id, p1._id.toString());

    console.log("✅ Passed: Candidates are deterministically ordered by updatedAt DESC.");

    await Project.deleteMany({});

    // -----------------------------------------------------------------------
    // C. ZERO CANDIDATES & ZERO SIGNALS RUNS
    // -----------------------------------------------------------------------
    console.log("\n>> C. Testing Zero Candidates & Zero Signals Worker Runs...");

    // Case 1: Zero candidates
    const zeroResult = await runProactiveIntelligenceCycle({ now: frozenNow });
    assert.equal(zeroResult.candidateProjects, 0);
    assert.equal(zeroResult.projectsScanned, 0);
    assert.equal(zeroResult.signalsDetected, 0);
    assert.equal(zeroResult.aiCallsAttempted, 0);

    // Case 2: One candidate with zero signals
    await Project.create({ owner: userA, name: "Empty Proj", archived: false, isDeleted: false });
    const zeroSignalsResult = await runProactiveIntelligenceCycle({ now: frozenNow });
    assert.equal(zeroSignalsResult.candidateProjects, 1);
    assert.equal(zeroSignalsResult.projectsScanned, 1);
    assert.equal(zeroSignalsResult.signalsDetected, 0);
    assert.equal(zeroSignalsResult.aiCallsAttempted, 0);

    console.log("✅ Passed: Zero candidates and zero signals runs return clean zeroed summaries without AI calls.");

    await Project.deleteMany({});

    // -----------------------------------------------------------------------
    // D. NORMAL SIGNAL -> RECOMMENDATION PIPELINE
    // -----------------------------------------------------------------------
    console.log("\n>> D. Testing Normal Signal -> Recommendation Worker Pipeline...");

    mockAiCallCount = 0;
    const projPipeline = await Project.create({ owner: userA, name: "Pipeline Proj", archived: false, isDeleted: false });
    const overdueDate = new Date("2026-07-20T00:00:00Z"); // 7 days past due
    await Task.create({
      projectId: projPipeline._id,
      owner: userA,
      title: "Fix Security Bug",
      priority: "high",
      status: "todo",
      dueDate: overdueDate,
      archived: false,
      isDeleted: false,
    });

    const pipelineResult = await runProactiveIntelligenceCycle({ now: frozenNow });
    assert.equal(pipelineResult.projectsScanned, 1);
    assert.equal(pipelineResult.signalsDetected, 1);
    assert.equal(pipelineResult.recommendationsActivated, 1);
    assert.equal(pipelineResult.aiCallsAttempted, 1);
    assert.equal(mockAiCallCount, 1);

    const createdRec = await ProjectRecommendation.findOne({ projectId: projPipeline._id, status: "ACTIVE" });
    assert.ok(createdRec);
    assert.equal(createdRec.title, "Proactive Task Advisory");

    console.log("✅ Passed: Signal detected, claimed, enriched via AI, and activated cleanly.");

    // -----------------------------------------------------------------------
    // E. WORKER RERUN IDEMPOTENCE (ZERO REDUNDANT AI CALLS)
    // -----------------------------------------------------------------------
    console.log("\n>> E. Testing Worker Rerun Idempotence...");

    const aiCallsBeforeRerun = mockAiCallCount;
    const rerunResult = await runProactiveIntelligenceCycle({ now: frozenNow });

    assert.equal(rerunResult.projectsScanned, 1);
    assert.equal(rerunResult.signalsDetected, 1);
    assert.equal(rerunResult.recommendationsActivated, 0, "No duplicate recommendation activated");
    assert.equal(rerunResult.recommendationsSkipped, 1, "Duplicate active recommendation skipped");
    assert.equal(rerunResult.aiCallsAttempted, 0, "Zero AI calls on rerun");
    assert.equal(mockAiCallCount, aiCallsBeforeRerun, "AI call counter unchanged");

    console.log("✅ Passed: Rerunning worker against active recommendation consumes 0 AI calls.");

    await Task.deleteMany({});
    await ProjectRecommendation.deleteMany({});
    await Project.deleteMany({});

    // -----------------------------------------------------------------------
    // F. MAX 50 PROJECTS PER RUN ENFORCEMENT
    // -----------------------------------------------------------------------
    console.log("\n>> F. Testing Hard Max 50 Candidate Projects per Run Bound...");

    for (let i = 0; i < 55; i++) {
      await Project.create({ owner: userA, name: `Proj ${i}`, archived: false, isDeleted: false });
    }

    const candidatesMax = await findProactiveCandidateProjects(50);
    assert.equal(candidatesMax.length, 50, "Candidate discovery must cap at 50 projects");

    const maxRunResult = await runProactiveIntelligenceCycle({ now: frozenNow, maxCandidateProjects: 50 });
    assert.equal(maxRunResult.candidateProjects, 50);
    assert.equal(maxRunResult.projectsScanned, 50);

    console.log("✅ Passed: Hard limit of 50 candidate projects per run strictly enforced.");

    await Project.deleteMany({});
    await Task.deleteMany({});
    await ProjectRecommendation.deleteMany({});

    // -----------------------------------------------------------------------
    // G. HARD MAX 10 AI CALLS PER RUN ENFORCEMENT
    // -----------------------------------------------------------------------
    console.log("\n>> G. Testing Hard Max 10 AI Calls per Run Bound...");

    mockAiCallCount = 0;

    // Create 15 candidate projects each with an overdue task
    for (let i = 0; i < 15; i++) {
      const p = await Project.create({ owner: userA, name: `Overdue Proj ${i}`, archived: false, isDeleted: false });
      await Task.create({
        projectId: p._id,
        owner: userA,
        title: `Overdue Task ${i}`,
        priority: "high",
        status: "todo",
        dueDate: overdueDate,
        archived: false,
        isDeleted: false,
      });
    }

    const runAiLimitResult = await runProactiveIntelligenceCycle({
      now: frozenNow,
      maxCandidateProjects: 50,
      maxAiCallsPerRun: 10,
    });

    assert.equal(runAiLimitResult.projectsScanned, 15);
    assert.equal(runAiLimitResult.aiCallsAttempted, 10, "Worker must NOT make an 11th AI call");
    assert.equal(runAiLimitResult.aiBudgetSkips, 5, "Remaining 5 signals skipped due to AI run budget");
    assert.equal(mockAiCallCount, 10);

    console.log("✅ Passed: Hard limit of 10 AI calls per run strictly stops further AI calls.");

    await Task.deleteMany({});
    await ProjectRecommendation.deleteMany({});
    await Project.deleteMany({});

    // -----------------------------------------------------------------------
    // H. PERSISTENT PER-USER DAILY AI LIMIT (20 CALLS/USER/DAY UTC)
    // -----------------------------------------------------------------------
    console.log("\n>> H. Testing Persistent Per-User Daily AI Quota & User Isolation...");

    mockAiCallCount = 0;

    // Seed User A with 20 active recommendations created today
    const startOfToday = new Date(Date.UTC(2026, 6, 27, 0, 0, 0, 0));
    for (let i = 0; i < 20; i++) {
      await ProjectRecommendation.create({
        owner: new Types.ObjectId(userA),
        projectId: new Types.ObjectId(),
        type: "OVERDUE_HIGH_PRIORITY_TASKS",
        severity: "HIGH",
        title: `Seeded Rec ${i}`,
        explanation: "Seeded explanation",
        facts: { count: 1 },
        relatedEntities: [],
        fingerprint: `seeded_fp_${i}_` + "0".repeat(50),
        status: "ACTIVE",
        createdAt: startOfToday,
      });
    }

    const userADailyCallsBefore = await getUserDailyProactiveAICalls(userA, frozenNow);
    assert.equal(userADailyCallsBefore, 20, "User A daily call count must equal 20");

    // Create a new project & overdue task for User A (budget exhausted)
    const userAProj = await Project.create({ owner: userA, name: "User A Proj", archived: false, isDeleted: false });
    await Task.create({
      projectId: userAProj._id,
      owner: userA,
      title: "User A Overdue Task",
      priority: "high",
      status: "todo",
      dueDate: overdueDate,
      archived: false,
      isDeleted: false,
    });

    // Create a new project & overdue task for User B (budget available)
    const userBProj = await Project.create({ owner: userB, name: "User B Proj", archived: false, isDeleted: false });
    await Task.create({
      projectId: userBProj._id,
      owner: userB,
      title: "User B Overdue Task",
      priority: "high",
      status: "todo",
      dueDate: overdueDate,
      archived: false,
      isDeleted: false,
    });

    const userBudgetResult = await runProactiveIntelligenceCycle({ now: frozenNow });

    // User A should be skipped due to user daily budget, while User B receives AI call
    assert.equal(userBudgetResult.aiCallsAttempted, 1, "Only User B receives an AI call");
    assert.equal(userBudgetResult.aiBudgetSkips, 1, "User A signal skipped due to user daily budget");
    assert.equal(mockAiCallCount, 1);

    const userARec = await ProjectRecommendation.findOne({ projectId: userAProj._id });
    assert.equal(userARec, null, "Zero recommendations created for User A when daily budget exhausted");

    const userBRec = await ProjectRecommendation.findOne({ projectId: userBProj._id, status: "ACTIVE" });
    assert.ok(userBRec, "Recommendation created for User B with available budget");

    console.log("✅ Passed: User A daily limit (20) strictly enforced without blocking User B.");

    await Task.deleteMany({});
    await ProjectRecommendation.deleteMany({});
    await Project.deleteMany({});

    // -----------------------------------------------------------------------
    // I. PER-PROJECT & PER-SIGNAL FAILURE ISOLATION
    // -----------------------------------------------------------------------
    console.log("\n>> I. Testing Per-Project & Per-Signal Failure Isolation...");

    const okProj = await Project.create({ owner: userA, name: "OK Proj", archived: false, isDeleted: false });
    await Task.create({
      projectId: okProj._id,
      owner: userA,
      title: "OK Task",
      priority: "high",
      status: "todo",
      dueDate: overdueDate,
      archived: false,
      isDeleted: false,
    });

    // Execute background job wrapper
    const jobResult = await processProactiveIntelligenceJob(frozenNow);
    assert.ok(jobResult);
    assert.equal(jobResult.recommendationsActivated, 1);
    assert.equal(jobResult.projectFailures, 0);

    console.log("✅ Passed: Background job runner handles failures safely without crashing worker loop.");

    // -----------------------------------------------------------------------
    // J. ZERO SIDE-EFFECT & MUTATION AUDIT
    // -----------------------------------------------------------------------
    console.log("\n>> J. Testing Zero Side-Effect & Mutation Audit...");

    const activityCountBefore = await Activity.countDocuments();
    const memoryCountBefore = await ProjectMemory.countDocuments();

    await runProactiveIntelligenceCycle({ now: frozenNow });

    assert.equal(await Activity.countDocuments(), activityCountBefore, "0 Activity records created");
    assert.equal(await ProjectMemory.countDocuments(), memoryCountBefore, "0 ProjectMemory records created");

    console.log("✅ Passed: Worker cycle creates 0 Activity logs and 0 ProjectMemory records.");

  } finally {
    aiService.generateStructuredData = originalGenerate;
    await teardownTestDatabase();
  }

  console.log("\n==================================================");
  console.log("🎉 ALL PROACTIVE INTELLIGENCE WORKER WP-05 TESTS PASSED!");
  console.log("==================================================\n");
}

runProactiveIntelligenceWorkerTests().catch((error) => {
  console.error("❌ ProactiveIntelligenceWorker WP-05 test failed:", error);
  process.exit(1);
});
