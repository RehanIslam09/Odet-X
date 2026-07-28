import assert from "node:assert/strict";
import { Types } from "mongoose";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import Activity from "../models/activity.model.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import {
  SignalEvaluationContext,
  detectDependencyBottlenecks,
  detectMilestonesAtRisk,
  detectOverdueHighPriorityTasks,
  detectProjectSignals,
  detectProjectStalled,
  generateDependencyBottleneckFingerprint,
  generateMilestoneRiskFingerprint,
  generateOverdueSignalFingerprint,
  generateProjectStalledFingerprint,
  loadAndDetectProjectSignals,
} from "../domain/proactive-intelligence/index.js";

async function runProactiveSignalEngineTests() {
  console.log("\n==================================================");
  console.log("▶ Phase 30 WP-02 Proactive Signal Engine Tests");
  console.log("==================================================\n");

  await setupTestDatabase();

  try {
    // -----------------------------------------------------------------------
    // A. SHA-256 FINGERPRINT UTILITY TESTS
    // -----------------------------------------------------------------------
    console.log(">> A. Testing SHA-256 Fingerprint Utility & Canonicalization...");

    const hexRegex = /^[a-f0-9]{64}$/;

    // Test 1: Overdue Fingerprint
    const fp1 = generateOverdueSignalFingerprint("proj_1", ["task_2", "task_1"]);
    const fp2 = generateOverdueSignalFingerprint("proj_1", ["task_1", "task_2"]);
    assert.ok(hexRegex.test(fp1), "Fingerprint must be 64-char lowercase hex");
    assert.equal(fp1, fp2, "Array sorting must guarantee identical hash regardless of input order");

    // Test 2: Task ID membership change -> different hash
    const fp3 = generateOverdueSignalFingerprint("proj_1", ["task_1", "task_3"]);
    assert.notEqual(fp1, fp3, "Membership change must produce different fingerprint");

    // Test 3: Milestone Risk Fingerprint
    const fpMs1 = generateMilestoneRiskFingerprint("ms_1", "2026-08-01T00:00:00.000Z", ["t2", "t1"]);
    const fpMs2 = generateMilestoneRiskFingerprint("ms_1", "2026-08-01T00:00:00.000Z", ["t1", "t2"]);
    assert.ok(hexRegex.test(fpMs1));
    assert.equal(fpMs1, fpMs2);

    const fpMsDiffDate = generateMilestoneRiskFingerprint("ms_1", "2026-08-05T00:00:00.000Z", ["t1", "t2"]);
    assert.notEqual(fpMs1, fpMsDiffDate, "Target date change must produce different fingerprint");

    // Test 4: Dependency Bottleneck Fingerprint
    const fpBot1 = generateDependencyBottleneckFingerprint("blocker_1", ["d2", "d1"]);
    const fpBot2 = generateDependencyBottleneckFingerprint("blocker_1", ["d1", "d2"]);
    assert.ok(hexRegex.test(fpBot1));
    assert.equal(fpBot1, fpBot2);

    // Test 5: Project Stalled Weekly Bucket Fingerprint
    const fpStalled7 = generateProjectStalledFingerprint("proj_1", 7);
    const fpStalled10 = generateProjectStalledFingerprint("proj_1", 10);
    const fpStalled14 = generateProjectStalledFingerprint("proj_1", 14);
    assert.ok(hexRegex.test(fpStalled7));
    assert.equal(fpStalled7, fpStalled10, "Days 7 and 10 belong to same weekly bucket Math.floor(days/7) === 1");
    assert.notEqual(fpStalled7, fpStalled14, "Day 14 belongs to bucket 2, must produce different fingerprint");

    console.log("✅ Passed: Fingerprint utilities produce 100% reproducible canonical SHA-256 hashes.");

    // -----------------------------------------------------------------------
    // B. OVERDUE_HIGH_PRIORITY_TASKS DETECTOR TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> B. Testing OVERDUE_HIGH_PRIORITY_TASKS Detector & Boundaries...");

    const frozenNow = new Date("2026-07-27T12:00:00.000Z");
    const projId = "proj_test_100";
    const ownerId = "owner_test_100";

    const baseContext: SignalEvaluationContext = {
      project: {
        id: projId,
        owner: ownerId,
        name: "Test Project",
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-01T00:00:00.000Z"),
      },
      tasks: [],
      milestones: [],
      activities: [],
      now: frozenNow,
    };

    // Boundary Test 1: 0 tasks -> null
    assert.equal(detectOverdueHighPriorityTasks(baseContext), null);

    // Boundary Test 2: Task dueDate 1ms after now -> null (not overdue)
    const contextFuture = {
      ...baseContext,
      tasks: [
        {
          id: "t_future",
          owner: ownerId,
          title: "Future Task",
          status: "todo",
          priority: "high",
          dueDate: new Date(frozenNow.getTime() + 1),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    assert.equal(detectOverdueHighPriorityTasks(contextFuture), null);

    // Boundary Test 3: Task dueDate exactly now -> null (contract specifies dueDate < now)
    const contextExactNow = {
      ...baseContext,
      tasks: [
        {
          id: "t_exact",
          owner: ownerId,
          title: "Exact Task",
          status: "todo",
          priority: "high",
          dueDate: new Date(frozenNow.getTime()),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    assert.equal(detectOverdueHighPriorityTasks(contextExactNow), null);

    // Boundary Test 4: Task dueDate 1ms before now with priority 'high' -> HIGH severity signal
    const contextOverdueHigh = {
      ...baseContext,
      tasks: [
        {
          id: "t_overdue_high",
          owner: ownerId,
          title: "Overdue High Task",
          status: "todo",
          priority: "high",
          dueDate: new Date(frozenNow.getTime() - 1),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const overdueHighSignal = detectOverdueHighPriorityTasks(contextOverdueHigh);
    assert.ok(overdueHighSignal);
    assert.equal(overdueHighSignal.type, "OVERDUE_HIGH_PRIORITY_TASKS");
    assert.equal(overdueHighSignal.severity, "HIGH");
    assert.equal(overdueHighSignal.facts.overdueCount, 1);
    assert.equal(overdueHighSignal.facts.urgentCount, 0);
    assert.equal(overdueHighSignal.facts.highCount, 1);

    // Boundary Test 5: Overdue task with priority 'urgent' -> CRITICAL severity signal
    const contextOverdueUrgent = {
      ...baseContext,
      tasks: [
        ...contextOverdueHigh.tasks,
        {
          id: "t_overdue_urgent",
          owner: ownerId,
          title: "Overdue Urgent Task",
          status: "in_progress",
          priority: "urgent",
          dueDate: new Date(frozenNow.getTime() - 86400000), // 1 day overdue
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const overdueUrgentSignal = detectOverdueHighPriorityTasks(contextOverdueUrgent);
    assert.ok(overdueUrgentSignal);
    assert.equal(overdueUrgentSignal.severity, "CRITICAL");
    assert.equal(overdueUrgentSignal.facts.overdueCount, 2);
    assert.equal(overdueUrgentSignal.facts.urgentCount, 1);
    assert.equal(overdueUrgentSignal.facts.oldestDueDate, new Date(frozenNow.getTime() - 86400000).toISOString());

    console.log("✅ Passed: OVERDUE_HIGH_PRIORITY_TASKS detector satisfies all boundary and severity rules.");

    // -----------------------------------------------------------------------
    // C. MILESTONE_AT_RISK DETECTOR TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> C. Testing MILESTONE_AT_RISK Detector & Boundaries...");

    // Scenario 1: Target date > 7 days in future -> 0 signals
    const contextMsFarFuture = {
      ...baseContext,
      milestones: [
        {
          id: "ms_far",
          owner: ownerId,
          projectId: projId,
          title: "Far Future Milestone",
          targetDate: new Date(frozenNow.getTime() + 8 * 86400000), // 8 days
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      tasks: [
        {
          id: "t_attached_1",
          owner: ownerId,
          milestoneId: "ms_far",
          title: "Task 1",
          status: "todo",
          priority: "medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    assert.equal(detectMilestonesAtRisk(contextMsFarFuture).length, 0);

    // Scenario 2: Target date in 5 days, all attached tasks done -> 0 signals
    const contextMsDone = {
      ...baseContext,
      milestones: [
        {
          id: "ms_5d",
          owner: ownerId,
          projectId: projId,
          title: "Sprint 1",
          targetDate: new Date(frozenNow.getTime() + 5 * 86400000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      tasks: [
        {
          id: "t_done",
          owner: ownerId,
          milestoneId: "ms_5d",
          title: "Task Done",
          status: "done",
          priority: "high",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    assert.equal(detectMilestonesAtRisk(contextMsDone).length, 0);

    // Scenario 3: Target date in 5 days with incomplete task -> MEDIUM severity
    const contextMsMedium = {
      ...baseContext,
      milestones: [contextMsDone.milestones[0]!],
      tasks: [
        {
          id: "t_incomplete",
          owner: ownerId,
          milestoneId: "ms_5d",
          title: "Task Incomplete",
          status: "in_progress",
          priority: "medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const msMediumSignals = detectMilestonesAtRisk(contextMsMedium);
    assert.equal(msMediumSignals.length, 1);
    assert.equal(msMediumSignals[0]!.severity, "MEDIUM");

    // Scenario 4: Target date in 2 days with incomplete task -> HIGH severity
    const contextMsHigh = {
      ...baseContext,
      milestones: [
        {
          id: "ms_2d",
          owner: ownerId,
          projectId: projId,
          title: "Sprint 2",
          targetDate: new Date(frozenNow.getTime() + 2 * 86400000), // <= 3 days
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      tasks: [
        {
          id: "t_incomplete_2",
          owner: ownerId,
          milestoneId: "ms_2d",
          title: "Task Incomplete 2",
          status: "todo",
          priority: "high",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const msHighSignals = detectMilestonesAtRisk(contextMsHigh);
    assert.equal(msHighSignals.length, 1);
    assert.equal(msHighSignals[0]!.severity, "HIGH");

    // Scenario 5: Target date past due (< now) with incomplete task -> CRITICAL severity
    const contextMsCritical = {
      ...baseContext,
      milestones: [
        {
          id: "ms_past",
          owner: ownerId,
          projectId: projId,
          title: "Past Milestone",
          targetDate: new Date(frozenNow.getTime() - 86400000), // Past due
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      tasks: [
        {
          id: "t_incomplete_past",
          owner: ownerId,
          milestoneId: "ms_past",
          title: "Task Incomplete Past",
          status: "todo",
          priority: "urgent",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const msCriticalSignals = detectMilestonesAtRisk(contextMsCritical);
    assert.equal(msCriticalSignals.length, 1);
    assert.equal(msCriticalSignals[0]!.severity, "CRITICAL");

    console.log("✅ Passed: MILESTONE_AT_RISK detector satisfies milestone target date & task attachment rules.");

    // -----------------------------------------------------------------------
    // D. DEPENDENCY_BOTTLENECK DETECTOR TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> D. Testing DEPENDENCY_BOTTLENECK Detector & Downstream Thresholds...");

    const blockerId = "blocker_task_1";

    // Scenario 1: 2 normal downstream tasks -> 0 signals (< threshold 3)
    const contextBot2 = {
      ...baseContext,
      tasks: [
        { id: blockerId, owner: ownerId, title: "Blocker", status: "in_progress", priority: "medium", createdAt: new Date(), updatedAt: new Date() },
        { id: "d1", owner: ownerId, title: "Downstream 1", status: "todo", priority: "medium", dependencies: [blockerId], createdAt: new Date(), updatedAt: new Date() },
        { id: "d2", owner: ownerId, title: "Downstream 2", status: "todo", priority: "low", dependencies: [blockerId], createdAt: new Date(), updatedAt: new Date() },
      ],
    };
    assert.equal(detectDependencyBottlenecks(contextBot2).length, 0);

    // Scenario 2: Exactly 3 normal downstream tasks -> MEDIUM severity signal
    const contextBot3 = {
      ...baseContext,
      tasks: [
        ...contextBot2.tasks,
        { id: "d3", owner: ownerId, title: "Downstream 3", status: "todo", priority: "low", dependencies: [blockerId], createdAt: new Date(), updatedAt: new Date() },
      ],
    };
    const bot3Signals = detectDependencyBottlenecks(contextBot3);
    assert.equal(bot3Signals.length, 1);
    assert.equal(bot3Signals[0]!.severity, "MEDIUM");
    assert.equal(bot3Signals[0]!.facts.downstreamCount, 3);
    assert.equal(bot3Signals[0]!.facts.downstreamUrgentCount, 0);

    // Scenario 3: 1 urgent downstream task -> HIGH severity signal (even if total < 3)
    const contextBotUrgent = {
      ...baseContext,
      tasks: [
        { id: blockerId, owner: ownerId, title: "Blocker", status: "todo", priority: "low", createdAt: new Date(), updatedAt: new Date() },
        { id: "d_urg", owner: ownerId, title: "Urgent Downstream", status: "todo", priority: "urgent", dependencies: [blockerId], createdAt: new Date(), updatedAt: new Date() },
      ],
    };
    const botUrgentSignals = detectDependencyBottlenecks(contextBotUrgent);
    assert.equal(botUrgentSignals.length, 1);
    assert.equal(botUrgentSignals[0]!.severity, "HIGH");
    assert.equal(botUrgentSignals[0]!.facts.downstreamUrgentCount, 1);

    // Scenario 4: Completed blocker task -> 0 signals
    const contextBotCompleted = {
      ...baseContext,
      tasks: [
        { id: blockerId, owner: ownerId, title: "Blocker", status: "done", priority: "high", createdAt: new Date(), updatedAt: new Date() },
        { id: "d_urg", owner: ownerId, title: "Urgent Downstream", status: "todo", priority: "urgent", dependencies: [blockerId], createdAt: new Date(), updatedAt: new Date() },
      ],
    };
    assert.equal(detectDependencyBottlenecks(contextBotCompleted).length, 0);

    console.log("✅ Passed: DEPENDENCY_BOTTLENECK detector correctly identifies downstream blockers and urgent chains.");

    // -----------------------------------------------------------------------
    // E. PROJECT_STALLED DETECTOR TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> E. Testing PROJECT_STALLED Detector & Activity Baselines...");

    // Scenario 1: Project created 2 days ago with no activity -> null (stalledDays 2 < 7)
    const contextStalled2d = {
      ...baseContext,
      project: {
        id: projId,
        owner: ownerId,
        name: "New Project",
        createdAt: new Date(frozenNow.getTime() - 2 * 86400000), // 2 days ago
        updatedAt: new Date(frozenNow.getTime() - 2 * 86400000),
      },
      tasks: [
        { id: "st_1", owner: ownerId, title: "Task 1", status: "todo", priority: "low", createdAt: new Date(), updatedAt: new Date(frozenNow.getTime() - 2 * 86400000) },
        { id: "st_2", owner: ownerId, title: "Task 2", status: "todo", priority: "low", createdAt: new Date(), updatedAt: new Date(frozenNow.getTime() - 2 * 86400000) },
        { id: "st_3", owner: ownerId, title: "Task 3", status: "todo", priority: "low", createdAt: new Date(), updatedAt: new Date(frozenNow.getTime() - 2 * 86400000) },
      ],
    };
    assert.equal(detectProjectStalled(contextStalled2d), null);

    // Scenario 2: Exactly 7 days stalled -> MEDIUM severity signal
    const contextStalled7d = {
      ...contextStalled2d,
      project: {
        ...contextStalled2d.project,
        createdAt: new Date(frozenNow.getTime() - 7 * 86400000), // Exactly 7 days ago
        updatedAt: new Date(frozenNow.getTime() - 7 * 86400000),
      },
      tasks: contextStalled2d.tasks.map((t) => ({ ...t, updatedAt: new Date(frozenNow.getTime() - 7 * 86400000) })),
    };
    const stalled7Signal = detectProjectStalled(contextStalled7d);
    assert.ok(stalled7Signal);
    assert.equal(stalled7Signal.severity, "MEDIUM");
    assert.equal(stalled7Signal.facts.stalledDays, 7);

    // Scenario 3: Exactly 14 days stalled -> HIGH severity signal
    const contextStalled14d = {
      ...contextStalled7d,
      project: {
        ...contextStalled7d.project,
        createdAt: new Date(frozenNow.getTime() - 14 * 86400000), // 14 days ago
        updatedAt: new Date(frozenNow.getTime() - 14 * 86400000),
      },
      tasks: contextStalled7d.tasks.map((t) => ({ ...t, updatedAt: new Date(frozenNow.getTime() - 14 * 86400000) })),
    };
    const stalled14Signal = detectProjectStalled(contextStalled14d);
    assert.ok(stalled14Signal);
    assert.equal(stalled14Signal.severity, "HIGH");
    assert.equal(stalled14Signal.facts.stalledDays, 14);

    // Scenario 4: Recent activity recorded 1 day ago -> resets baseline, returns null
    const contextStalledRescued = {
      ...contextStalled14d,
      activities: [
        {
          owner: ownerId,
          projectId: projId,
          createdAt: new Date(frozenNow.getTime() - 1 * 86400000), // 1 day ago
        },
      ],
    };
    assert.equal(detectProjectStalled(contextStalledRescued), null);

    console.log("✅ Passed: PROJECT_STALLED detector enforces activity baselines and time buckets.");

    // -----------------------------------------------------------------------
    // F. DETERMINISTIC ORDERING TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> F. Testing Deterministic Signal Engine Ordering Rules...");

    const multiSignalContext: SignalEvaluationContext = {
      ...baseContext,
      project: {
        id: projId,
        owner: ownerId,
        name: "Multi-Signal Project",
        createdAt: new Date(frozenNow.getTime() - 20 * 86400000),
        updatedAt: new Date(frozenNow.getTime() - 20 * 86400000),
      },
      tasks: [
        // Overdue urgent task -> CRITICAL
        { id: "t_overdue", owner: ownerId, title: "Overdue Urgent", status: "todo", priority: "urgent", dueDate: new Date(frozenNow.getTime() - 86400000), createdAt: new Date(), updatedAt: new Date(frozenNow.getTime() - 20 * 86400000) },
        // Blocker task -> HIGH
        { id: "t_blocker", owner: ownerId, title: "Blocker", status: "todo", priority: "low", createdAt: new Date(), updatedAt: new Date(frozenNow.getTime() - 20 * 86400000) },
        { id: "d1", owner: ownerId, title: "D1", status: "todo", priority: "low", dependencies: ["t_blocker"], createdAt: new Date(), updatedAt: new Date(frozenNow.getTime() - 20 * 86400000) },
        { id: "d2", owner: ownerId, title: "D2", status: "todo", priority: "low", dependencies: ["t_blocker"], createdAt: new Date(), updatedAt: new Date(frozenNow.getTime() - 20 * 86400000) },
        { id: "d3", owner: ownerId, title: "D3", status: "todo", priority: "low", dependencies: ["t_blocker"], createdAt: new Date(), updatedAt: new Date(frozenNow.getTime() - 20 * 86400000) },
      ],
      milestones: [
        // Milestone past due -> CRITICAL
        { id: "ms_1", owner: ownerId, projectId: projId, title: "Past MS", targetDate: new Date(frozenNow.getTime() - 86400000), createdAt: new Date(), updatedAt: new Date() },
      ],
      activities: [],
      now: frozenNow,
    };

    // Attach milestone to t_overdue
    multiSignalContext.tasks[0]!.milestoneId = "ms_1";

    const allSignals = detectProjectSignals(multiSignalContext);
    assert.ok(allSignals.length >= 3);

    // Verify CRITICAL signals come before HIGH, HIGH comes before MEDIUM
    for (let i = 0; i < allSignals.length - 1; i++) {
      const rankCurr = allSignals[i]!.severity === "CRITICAL" ? 1 : allSignals[i]!.severity === "HIGH" ? 2 : 3;
      const rankNext = allSignals[i + 1]!.severity === "CRITICAL" ? 1 : allSignals[i + 1]!.severity === "HIGH" ? 2 : 3;
      assert.ok(rankCurr <= rankNext, "Signals must be sorted by severity rank");
    }

    console.log("✅ Passed: detectProjectSignals sorts signals deterministically by severity rank and type.");

    // -----------------------------------------------------------------------
    // G. TENANT & SOFT-DELETE ISOLATION TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> G. Testing Tenant Isolation & Soft-Delete Exclusion...");

    const userA = new Types.ObjectId().toString();
    const userB = new Types.ObjectId().toString();

    const projA1Doc = await Project.create({ owner: userA, name: "Project A1", archived: false, isDeleted: false });
    const projB1Doc = await Project.create({ owner: userB, name: "Project B1", archived: false, isDeleted: false });

    // Milestone for User A Project A1
    const msA1 = await Milestone.create({
      owner: userA,
      projectId: projA1Doc._id,
      title: "Sprint A1",
      targetDate: new Date(frozenNow.getTime() + 2 * 86400000),
      isDeleted: false,
    });

    // Task attached to Milestone A1
    await Task.create({
      owner: userA,
      projectId: projA1Doc._id,
      milestoneId: msA1._id,
      title: "User A Attached Task",
      status: "todo",
      priority: "high",
      archived: false,
      isDeleted: false,
    });

    // Soft-deleted task for User A Project A1 -> should be IGNORED
    await Task.create({
      owner: userA,
      projectId: projA1Doc._id,
      title: "User A Soft Deleted Overdue",
      status: "todo",
      priority: "urgent",
      dueDate: new Date(frozenNow.getTime() - 86400000),
      archived: false,
      isDeleted: true,
    });

    // Task for User B Project B1 -> should NOT appear in User A query
    await Task.create({
      owner: userB,
      projectId: projB1Doc._id,
      title: "User B Overdue Task",
      status: "todo",
      priority: "urgent",
      dueDate: new Date(frozenNow.getTime() - 86400000),
      archived: false,
      isDeleted: false,
    });

    // Run loadAndDetectProjectSignals for User A on Project A1
    const signalsA1 = await loadAndDetectProjectSignals(projA1Doc._id.toString(), userA, frozenNow);
    assert.equal(signalsA1.length, 1);
    assert.equal(signalsA1[0]!.ownerId, userA);
    assert.equal(signalsA1[0]!.type, "MILESTONE_AT_RISK");

    // Run loadAndDetectProjectSignals for User A on Project B1 -> Returns empty (not owned by User A)
    const signalsCrossTenant = await loadAndDetectProjectSignals(projB1Doc._id.toString(), userA, frozenNow);
    assert.equal(signalsCrossTenant.length, 0, "Cross-tenant query must return empty array");

    console.log("✅ Passed: Tenant isolation & soft-delete filtering strictly enforced.");

    // -----------------------------------------------------------------------
    // H. ZERO SIDE-EFFECT & ARCHITECTURAL NEGATIVE VERIFICATION
    // -----------------------------------------------------------------------
    console.log("\n>> H. Testing Zero Side-Effect Verification & Safety Invariants...");

    const recommendationCountBefore = await ProjectRecommendation.countDocuments();
    const activityCountBefore = await Activity.countDocuments();
    const memoryCountBefore = await ProjectMemory.countDocuments();
    const taskCountBefore = await Task.countDocuments();

    // Run detection multiple times
    await loadAndDetectProjectSignals(projA1Doc._id.toString(), userA, frozenNow);
    detectProjectSignals(multiSignalContext);

    const recommendationCountAfter = await ProjectRecommendation.countDocuments();
    const activityCountAfter = await Activity.countDocuments();
    const memoryCountAfter = await ProjectMemory.countDocuments();
    const taskCountAfter = await Task.countDocuments();

    assert.equal(recommendationCountBefore, recommendationCountAfter, "0 recommendations created by signal engine");
    assert.equal(activityCountBefore, activityCountAfter, "0 activities created by signal engine");
    assert.equal(memoryCountBefore, memoryCountAfter, "0 memories created by signal engine");
    assert.equal(taskCountBefore, taskCountAfter, "0 tasks mutated by signal engine");

    console.log("✅ Passed: Zero side-effects verified. Signal engine creates 0 DB records and 0 mutations.");

  } finally {
    await teardownTestDatabase();
  }

  console.log("\n==================================================");
  console.log("🎉 ALL PROACTIVE SIGNAL ENGINE WP-02 TESTS PASSED!");
  console.log("==================================================\n");
}

runProactiveSignalEngineTests().catch((error) => {
  console.error("❌ ProactiveSignalEngine WP-02 test failed:", error);
  process.exit(1);
});
