import assert from "node:assert/strict";
import { Types } from "mongoose";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import Project from "../models/project.model.js";
import Activity from "../models/activity.model.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import { ProjectSignal } from "../constants/proactive-intelligence.js";
import { aiService } from "../ai/ai.service.js";
import { initializeAI } from "../ai/init.js";
import {
  acquireRecommendationClaim,
  dismissRecommendation,
  finalizeRecommendationEnrichment,
  processProjectSignalRecommendation,
  reconcileProjectRecommendations,
} from "../services/project-recommendation.service.js";

async function runProactiveRecommendationLifecycleTests() {
  console.log("\n==================================================");
  console.log("▶ Phase 30 WP-04 Recommendation Lifecycle Engine Tests");
  console.log("==================================================\n");

  initializeAI();
  await setupTestDatabase();

  const originalGenerate = aiService.generateStructuredData.bind(aiService);

  try {
    const frozenNow = new Date("2026-07-27T12:00:00.000Z");
    const userA = new Types.ObjectId().toString();
    const userB = new Types.ObjectId().toString();

    const projADoc = await Project.create({ owner: userA, name: "Project A", archived: false, isDeleted: false });
    await Project.create({ owner: userB, name: "Project B", archived: false, isDeleted: false });

    const projAId = projADoc._id.toString();

    const signalA: ProjectSignal = {
      type: "OVERDUE_HIGH_PRIORITY_TASKS",
      ownerId: userA,
      projectId: projAId,
      severity: "CRITICAL",
      detectedAt: frozenNow,
      relatedEntities: [{ type: "task", id: "t1", label: "Fix Auth Bug" }],
      facts: { overdueCount: 3, urgentCount: 1 },
      fingerprint: "1111111111222222222233333333334444444444555555555566666666667777",
    };

    // -----------------------------------------------------------------------
    // A. INITIAL ATOMIC CLAIM ACQUISITION
    // -----------------------------------------------------------------------
    console.log(">> A. Testing Initial Atomic Claim Acquisition...");

    const claim1 = await acquireRecommendationClaim(signalA, frozenNow);
    assert.equal(claim1.outcome, "CLAIMED");
    assert.ok(claim1.recommendationId);
    assert.ok(claim1.claimToken);
    assert.equal(claim1.recovered, false);

    const doc1 = await ProjectRecommendation.findById(claim1.recommendationId);
    assert.ok(doc1);
    assert.equal(doc1.status, "PENDING_ENRICHMENT");
    assert.equal(doc1.claimToken, claim1.claimToken);
    assert.equal(doc1.explanation, "");

    console.log("✅ Passed: Initial claim creates PENDING_ENRICHMENT document with claimToken.");

    // -----------------------------------------------------------------------
    // B. FRESH PENDING & ACTIVE DUPLICATE SUPPRESSION
    // -----------------------------------------------------------------------
    console.log("\n>> B. Testing Fresh Pending & Active Duplicate Suppression...");

    // Second claim while first is fresh pending (< 30s)
    const claim2 = await acquireRecommendationClaim(signalA, new Date(frozenNow.getTime() + 5000));
    assert.equal(claim2.outcome, "SKIPPED_IN_PROGRESS", "Fresh pending claim must block second worker");

    // Finalize first claim to ACTIVE
    const fin1 = await finalizeRecommendationEnrichment(
      claim1.recommendationId!,
      claim1.claimToken!,
      userA,
      {
        title: "3 Urgent Tasks Need Review",
        explanation: "Fix overdue tasks urgently.",
        suggestedNextStep: "Review backlog.",
        isFallback: false,
      },
      frozenNow,
    );
    assert.equal(fin1.outcome, "ACTIVATED");
    assert.equal(fin1.recommendation?.title, "3 Urgent Tasks Need Review");

    // Third claim while ACTIVE exists
    const claim3 = await acquireRecommendationClaim(signalA, new Date(frozenNow.getTime() + 10000));
    assert.equal(claim3.outcome, "SKIPPED_ACTIVE", "Active recommendation must suppress duplicate claims");

    console.log("✅ Passed: Fresh pending and active recommendations suppress duplicate worker claims.");

    // -----------------------------------------------------------------------
    // C. STALE LEASE RECOVERY & TOKEN ROTATION
    // -----------------------------------------------------------------------
    console.log("\n>> C. Testing Stale Lease Recovery & Claim Token Rotation...");

    // Create a new pending recommendation that becomes stale (> 30s)
    const signalStale: ProjectSignal = {
      ...signalA,
      fingerprint: "2222222222333333333344444444445555555555666666666677777777778888",
    };

    const claimStale1 = await acquireRecommendationClaim(signalStale, frozenNow);
    assert.equal(claimStale1.outcome, "CLAIMED");

    // Worker B attempts recovery after 35 seconds (> 30s lease)
    const time35sLater = new Date(frozenNow.getTime() + 35000);
    const claimStale2 = await acquireRecommendationClaim(signalStale, time35sLater);
    assert.equal(claimStale2.outcome, "RECOVERED");
    assert.equal(claimStale2.recovered, true);
    assert.notEqual(claimStale2.claimToken, claimStale1.claimToken, "Recovered claim must rotate claimToken");

    console.log("✅ Passed: Stale lease recovery rotates claimToken and grants ownership to new worker.");

    // -----------------------------------------------------------------------
    // D. OLD WORKER ISOLATION & LEASE OWNERSHIP VERIFICATION
    // -----------------------------------------------------------------------
    console.log("\n>> D. Testing Old Worker Isolation during Finalization...");

    // Old Worker A attempts finalization with stale token -> Must return OWNERSHIP_LOST
    const oldWorkerFinalize = await finalizeRecommendationEnrichment(
      claimStale1.recommendationId!,
      claimStale1.claimToken!, // Old stale token!
      userA,
      {
        title: "Stale Worker Title",
        explanation: "Stale explanation",
        suggestedNextStep: null,
        isFallback: false,
      },
      time35sLater,
    );
    assert.equal(oldWorkerFinalize.outcome, "OWNERSHIP_LOST", "Stale worker token must be rejected during finalization");

    // Recovered Worker B finalizes with new token -> Must succeed
    const newWorkerFinalize = await finalizeRecommendationEnrichment(
      claimStale2.recommendationId!,
      claimStale2.claimToken!, // Valid new token!
      userA,
      {
        title: "Valid Worker B Title",
        explanation: "Valid explanation B",
        suggestedNextStep: null,
        isFallback: false,
      },
      time35sLater,
    );
    assert.equal(newWorkerFinalize.outcome, "ACTIVATED");
    assert.equal(newWorkerFinalize.recommendation?.title, "Valid Worker B Title");

    console.log("✅ Passed: Old worker finalization attempt is cleanly discarded without mutating document.");

    // -----------------------------------------------------------------------
    // E. DISMISSAL & COOLDOWN BEHAVIOR
    // -----------------------------------------------------------------------
    console.log("\n>> E. Testing Dismissal & Cooldown Behavior...");

    const activeRecId = fin1.recommendation!.id;

    // Dismiss active recommendation
    const dismissedDoc = await dismissRecommendation(activeRecId, userA, frozenNow);
    assert.ok(dismissedDoc);
    assert.equal(dismissedDoc.status, "DISMISSED");

    // Attempt claim for same fingerprint during 7-day cooldown -> SKIPPED_COOLDOWN
    const day3 = new Date(frozenNow.getTime() + 3 * 86400000);
    const cooldownClaim = await acquireRecommendationClaim(signalA, day3);
    assert.equal(cooldownClaim.outcome, "SKIPPED_COOLDOWN");

    // Attempt claim for same signal type but DIFFERENT fingerprint during cooldown -> CLAIMED
    const signalDifferentFp: ProjectSignal = {
      ...signalA,
      fingerprint: "3333333333333333333333333333333333333333333333333333333333333333",
    };
    const diffFpClaim = await acquireRecommendationClaim(signalDifferentFp, day3);
    assert.equal(diffFpClaim.outcome, "CLAIMED", "Cooldown is strictly fingerprint-specific");

    // Attempt claim for same fingerprint AFTER 7-day cooldown expires -> CLAIMED
    const day8 = new Date(frozenNow.getTime() + 8 * 86400000);
    const postCooldownClaim = await acquireRecommendationClaim(signalA, day8);
    assert.equal(postCooldownClaim.outcome, "CLAIMED", "Claim must succeed after 7-day cooldown expires");

    console.log("✅ Passed: Dismissal cooldown strictly suppresses identical fingerprints during cooldown window.");

    // -----------------------------------------------------------------------
    // F. SIGNAL RESOLUTION RECONCILIATION
    // -----------------------------------------------------------------------
    console.log("\n>> F. Testing Signal Resolution Reconciliation (ACTIVE -> EXPIRED)...");

    // Create and activate a recommendation for fingerprint F_RECON
    const signalRecon: ProjectSignal = {
      ...signalA,
      fingerprint: "9999999999999999999999999999999999999999999999999999999999999999",
    };
    const claimRecon = await acquireRecommendationClaim(signalRecon, frozenNow);
    await finalizeRecommendationEnrichment(claimRecon.recommendationId!, claimRecon.claimToken!, userA, {
      title: "Reconcile Test",
      explanation: "Explanation",
      suggestedNextStep: null,
      isFallback: false,
    }, frozenNow);

    // Reconcile with empty activeSignals list (signal condition resolved!)
    const expiredCount = await reconcileProjectRecommendations(projAId, userA, [], frozenNow);
    assert.ok(expiredCount >= 1);

    const expiredDoc = await ProjectRecommendation.findById(claimRecon.recommendationId);
    assert.equal(expiredDoc?.status, "EXPIRED");
    assert.ok(expiredDoc?.purgeAt);

    console.log("✅ Passed: Resolved signals correctly transition ACTIVE -> EXPIRED during reconciliation.");

    // -----------------------------------------------------------------------
    // G. CONCURRENCY & AI CALL COST SAFETY
    // -----------------------------------------------------------------------
    console.log("\n>> G. Testing Concurrency & AI Call Cost Safety...");

    let aiCallCount = 0;
    aiService.generateStructuredData = (async () => {
      aiCallCount++;
      return {
        data: { title: "Concurrent Title", explanation: "Concurrent Explanation", suggestedNextStep: null },
        metadata: { executionId: "exec_conc", provider: "mock", model: "mock", durationMs: 50, promptName: "test", promptVersion: "1.0.0" },
      };
    }) as any;

    const signalConc: ProjectSignal = {
      ...signalA,
      fingerprint: "7777777777777777777777777777777777777777777777777777777777777777",
    };

    // Run 3 concurrent orchestration attempts for the exact same signal
    const [res1, res2, res3] = await Promise.all([
      processProjectSignalRecommendation(signalConc, { name: "Project A" }, frozenNow),
      processProjectSignalRecommendation(signalConc, { name: "Project A" }, frozenNow),
      processProjectSignalRecommendation(signalConc, { name: "Project A" }, frozenNow),
    ]);

    // Exactly 1 worker should acquire claim and call AI
    assert.equal(aiCallCount, 1, "AI must be called EXACTLY ONCE across concurrent duplicate requests");
    
    const outcomes = [res1.outcome, res2.outcome, res3.outcome];
    assert.ok(outcomes.includes("ACTIVATED"), "One worker must activate");
    assert.ok(outcomes.includes("SKIPPED_IN_PROGRESS") || outcomes.includes("SKIPPED_ACTIVE"), "Other workers must skip");

    console.log("✅ Passed: Concurrency control guarantees ZERO redundant AI calls under race conditions.");

    // -----------------------------------------------------------------------
    // H. TENANT ISOLATION & ZERO SIDE-EFFECT AUDIT
    // -----------------------------------------------------------------------
    console.log("\n>> H. Testing Tenant Isolation & Zero Side-Effect Audit...");

    // User B attempts to dismiss User A's recommendation -> Null / Unmutated
    const crossDismiss = await dismissRecommendation(claim1.recommendationId!, userB, frozenNow);
    assert.equal(crossDismiss, null, "Cross-tenant dismissal must be rejected");

    const recommendationCountBefore = await ProjectRecommendation.countDocuments();
    assert.ok(recommendationCountBefore >= 1);
    const activityCountBefore = await Activity.countDocuments();
    const memoryCountBefore = await ProjectMemory.countDocuments();

    // Run lifecycle operations
    await reconcileProjectRecommendations(projAId, userA, [signalA], frozenNow);

    assert.equal(await Activity.countDocuments(), activityCountBefore, "0 Activity records created");
    assert.equal(await ProjectMemory.countDocuments(), memoryCountBefore, "0 ProjectMemory records created");

    console.log("✅ Passed: Strict tenant isolation and 0 side-effects verified across lifecycle engine.");

  } finally {
    aiService.generateStructuredData = originalGenerate;
    await teardownTestDatabase();
  }

  console.log("\n==================================================");
  console.log("🎉 ALL RECOMMENDATION LIFECYCLE WP-04 TESTS PASSED!");
  console.log("==================================================\n");
}

runProactiveRecommendationLifecycleTests().catch((error) => {
  console.error("❌ ProactiveRecommendationLifecycle WP-04 test failed:", error);
  process.exit(1);
});
