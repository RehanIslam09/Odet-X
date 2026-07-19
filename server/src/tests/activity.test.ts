import dotenv from "dotenv";
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { Types } from "mongoose";

import { recordActivity, recordActivities, listActivities } from "../services/activity.service.js";
import Activity from "../models/activity.model.js";
import { ACTIVITY_TYPES } from "../constants/activity.js";
import { createTask, updateTask } from "../services/task.service.js";

// Helper for assertion logging
function expect(value: boolean, message: string) {
  if (!value) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runTests() {
  await setupTestDatabase();

  try {
    console.log("\n--- Starting Phase 15.1 Activity Backend Tests ---\n");

    const userA = new Types.ObjectId().toString();
    const userB = new Types.ObjectId().toString();

    console.log(">> Running Single Activity Record Test...");
    await recordActivity({
      owner: userA,
      actorId: userA,
      type: ACTIVITY_TYPES.PROJECT_CREATED,
      entityType: "project",
      entityId: new Types.ObjectId().toString(),
      metadata: { projectName: "Test Project" },
    });

    let activities = await Activity.find({ owner: new Types.ObjectId(userA) });
    expect(activities.length === 1, "Recorded single activity");
    expect(activities[0]!.type === ACTIVITY_TYPES.PROJECT_CREATED, "Recorded correct activity type");
    expect(activities[0]!.metadata.projectName === "Test Project", "Recorded metadata correctly");

    console.log("\n>> Running Cursor Pagination & Tenant Isolation Test...");
    await Activity.deleteMany({}); // clear for clean slate

    const payloads = Array.from({ length: 5 }).map((_, i) => ({
      owner: userA,
      actorId: userA,
      type: ACTIVITY_TYPES.TASK_CREATED,
      entityType: "task" as const,
      entityId: new Types.ObjectId().toString(),
      metadata: { index: i },
    }));
    await recordActivities(payloads);

    await recordActivity({
      owner: userB,
      actorId: userB,
      type: ACTIVITY_TYPES.TASK_CREATED,
      entityType: "task",
      entityId: new Types.ObjectId().toString(),
      metadata: { index: 100 },
    });

    const result1 = await listActivities(userA, { limit: 3 });
    expect(result1.items.length === 3, "Pagination first page returns 3 items");
    expect(result1.pagination.hasMore === true, "hasMore is true");
    expect(result1.pagination.nextCursor !== null, "nextCursor is set");

    const result2 = await listActivities(userA, { limit: 3, cursor: result1.pagination.nextCursor! });
    expect(result2.items.length === 2, "Pagination second page returns 2 items");
    expect(result2.pagination.hasMore === false, "hasMore is false on last page");
    expect(result2.pagination.nextCursor === null, "nextCursor is null on last page");

    const allUserA = [...result1.items, ...result2.items];
    const hasUserB = allUserA.some(a => a.owner.toString() === userB);
    expect(hasUserB === false, "Tenant isolation: User B's activity is not returned for User A");

    console.log("\n>> Running Best-Effort Failure Handling Test...");
    let threwError = false;
    try {
      await recordActivity({
        owner: "invalid-id", // Will cause CastError
        actorId: new Types.ObjectId().toString(),
        type: ACTIVITY_TYPES.PROJECT_CREATED,
        entityType: "project",
        entityId: new Types.ObjectId().toString(),
        metadata: {},
      });
    } catch (e) {
      threwError = true;
    }
    expect(threwError === false, "Activity insertion failure doesn't throw to caller");

    console.log("\n>> Running Integration: Task Creation Test...");
    await Activity.deleteMany({});
    const task = await createTask(userA, { title: "New Task" });
    activities = await Activity.find({ owner: new Types.ObjectId(userA), entityId: task._id });
    expect(activities.length === 1, "Task creation emits 1 event");
    expect(activities[0]!.type === ACTIVITY_TYPES.TASK_CREATED, "Emits TASK_CREATED");
    expect(activities[0]!.metadata.taskTitle === "New Task", "Stores correct title in metadata");

    console.log("\n>> Running Integration: Multiple Changes Update Test...");
    await Activity.deleteMany({});
    await updateTask(task._id.toString(), userA, {
      status: "in_progress",
      priority: "high"
    });
    activities = await Activity.find({ owner: new Types.ObjectId(userA), entityId: task._id });
    expect(activities.length === 2, "Emits 2 events for multiple distinct semantic changes");
    const types = activities.map(a => a.type);
    expect(types.includes(ACTIVITY_TYPES.TASK_STATUS_CHANGED), "Emits TASK_STATUS_CHANGED");
    expect(types.includes(ACTIVITY_TYPES.TASK_PRIORITY_CHANGED), "Emits TASK_PRIORITY_CHANGED");
    expect(!types.includes(ACTIVITY_TYPES.TASK_UPDATED), "Does NOT emit TASK_UPDATED generic event");

    console.log("\n>> Running Integration: Identical Values Update Test...");
    await Activity.deleteMany({});
    await updateTask(task._id.toString(), userA, {
      status: "in_progress",
      priority: "high"
    });
    activities = await Activity.find({ owner: new Types.ObjectId(userA), entityId: task._id });
    expect(activities.length === 0, "No events emitted when values are identical");

    console.log("\n>> Running Integration: Generic Update Test...");
    await Activity.deleteMany({});
    await updateTask(task._id.toString(), userA, {
      title: "New Title",
      description: "New Desc",
    });
    activities = await Activity.find({ owner: new Types.ObjectId(userA), entityId: task._id });
    expect(activities.length === 1, "Emits 1 event for multiple generic field changes");
    expect(activities[0]!.type === ACTIVITY_TYPES.TASK_UPDATED, "Emits TASK_UPDATED");
    expect(activities[0]!.metadata.taskTitle === "New Title", "Metadata captures new title");

    console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉");
    await teardownTestDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Test execution failed with error:", error);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
