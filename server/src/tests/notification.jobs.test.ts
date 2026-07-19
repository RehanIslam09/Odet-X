import dotenv from "dotenv";
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import Notification from "../models/notification.model.js";
import { processTaskReminders } from "../jobs/notification.jobs.js";
import { NOTIFICATION_TYPES } from "../constants/notification.js";

function expect(value: boolean, message: string) {
  if (!value) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

const setupTask = async (dueDate: Date, overrides: any = {}) => {
  const user = new User({
    name: "Test User",
    username: `usr_${Math.random().toString(36).substr(2, 8)}`,
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    password: "password123",
  });
  await user.save();

  const task = new Task({
    owner: user._id,
    title: "Test Task",
    status: "todo",
    priority: "medium",
    dueDate,
    ...overrides,
  });
  await task.save();

  return { user, task };
};

async function runTests() {
  await setupTestDatabase();

  try {
    console.log("\n--- Starting Phase 16.3 Notification Jobs Tests ---\n");

    const now = new Date("2024-01-01T12:00:00.000Z");

    console.log(">> Test: exactly at 24h threshold");
    const { user: user1 } = await setupTask(new Date("2024-01-02T12:00:00.000Z"));
    await processTaskReminders(now);
    let notifs = await Notification.find({ recipientId: user1._id });
    expect(notifs.length === 1 && notifs[0]!.type === NOTIFICATION_TYPES.TASK_DUE_SOON, "Due soon created exactly at 24h limit");

    console.log(">> Test: outside 24h threshold (24h + 1ms)");
    const { user: user2 } = await setupTask(new Date("2024-01-02T12:00:00.001Z"));
    await processTaskReminders(now);
    notifs = await Notification.find({ recipientId: user2._id });
    expect(notifs.length === 0, "No notification outside threshold");

    console.log(">> Test: immediately before current timestamp (overdue)");
    const { user: user3 } = await setupTask(new Date("2024-01-01T11:59:59.999Z"));
    await processTaskReminders(now);
    notifs = await Notification.find({ recipientId: user3._id });
    expect(notifs.length === 1 && notifs[0]!.type === NOTIFICATION_TYPES.TASK_OVERDUE, "Overdue created immediately before now");

    console.log(">> Test: exactly at current timestamp (does not generate overdue spam)");
    const { user: user4 } = await setupTask(new Date("2024-01-01T12:00:00.000Z"));
    await processTaskReminders(now);
    notifs = await Notification.find({ recipientId: user4._id });
    expect(notifs.length === 0, "Exact match does not trigger overdue nor due_soon in this exact tick");

    console.log(">> Test: ignores completed and cancelled tasks");
    const { user: user5 } = await setupTask(new Date("2024-01-02T10:00:00.000Z"), { status: "done" });
    await setupTask(new Date("2024-01-02T10:00:00.000Z"), { status: "cancelled", owner: user5._id });
    await processTaskReminders(now);
    notifs = await Notification.find({ recipientId: user5._id });
    expect(notifs.length === 0, "Ignored completed/cancelled tasks");

    console.log(">> Test: ignores deleted and archived tasks");
    const { user: user6 } = await setupTask(new Date("2023-01-01T12:00:00.000Z"), { isDeleted: true });
    await setupTask(new Date("2023-01-01T12:00:00.000Z"), { archived: true, owner: user6._id });
    await processTaskReminders(now);
    notifs = await Notification.find({ recipientId: user6._id });
    expect(notifs.length === 0, "Ignored deleted/archived tasks");

    console.log(">> Test: Strict Idempotency / Deduplication");
    const { user: user7 } = await setupTask(new Date("2023-01-01T12:00:00.000Z"));
    await processTaskReminders(now);
    await processTaskReminders(now);
    await processTaskReminders(now);
    notifs = await Notification.find({ recipientId: user7._id });
    expect(notifs.length === 1, "Only one notification generated after multiple overlapping runs");

    console.log(">> Test: Rescheduling a task generates a new notification");
    const { user: user8, task: task8 } = await setupTask(new Date("2023-01-01T12:00:00.000Z"));
    await processTaskReminders(now);
    notifs = await Notification.find({ recipientId: user8._id });
    expect(notifs.length === 1, "Initial overdue notification generated");

    task8.dueDate = new Date("2024-01-01T15:00:00.000Z"); // move to due soon
    await task8.save();
    await processTaskReminders(now);

    notifs = await Notification.find({ recipientId: user8._id }).sort({ createdAt: 1 });
    expect(notifs.length === 2, "Second notification generated after reschedule");
    expect(notifs[0]!.type === NOTIFICATION_TYPES.TASK_OVERDUE, "First is overdue");
    expect(notifs[1]!.type === NOTIFICATION_TYPES.TASK_DUE_SOON, "Second is due_soon");

    console.log("\n🎉 ALL JOB TESTS COMPLETED SUCCESSFULLY! 🎉");
    await teardownTestDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Test execution failed with error:", error);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
