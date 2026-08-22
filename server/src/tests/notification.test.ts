import dotenv from "dotenv";
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { Types } from "mongoose";

import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notification.service.js";
import Notification from "../models/notification.model.js";
import { NOTIFICATION_TYPES } from "../constants/notification.js";
import { NotFoundError } from "../utils/app-error.js";

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
    console.log("\n--- Starting Phase 16.1 Notification Backend Tests ---\n");

    const userA = new Types.ObjectId().toString();
    const userB = new Types.ObjectId().toString();

    console.log(">> Running Notification Creation (Internal API) Test...");
    await createNotification({
      recipientId: userA,
      actorId: userA,
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title: "Welcome",
      message: "Hello world",
      metadata: { foo: "bar" },
    });

    const countA = await Notification.countDocuments({ recipientId: userA });
    expect(countA === 1, "Created single notification successfully");

    const notif = await Notification.findOne({ recipientId: userA });
    expect(notif!.readAt === null, "Notification defaults to unread (readAt === null)");
    expect(notif!.title === "Welcome", "Persists snapshot title");
    expect(notif!.message === "Hello world", "Persists snapshot message");

    console.log("\n>> Running Best-Effort Failure Handling Test...");
    let threwError = false;
    try {
      await createNotification({
        recipientId: "invalid-id", // Will cause CastError
        actorId: userA,
        type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
        title: "Fail",
        message: "Fail",
      });
    } catch {
      threwError = true;
    }
    expect(threwError === false, "Notification insertion failure doesn't throw to caller");

    console.log("\n>> Running Unread Count Test...");
    let unreadCount = await getUnreadCount(userA);
    expect(unreadCount === 1, "Unread count is exactly 1");

    // Add a read notification
    const readNotif = new Notification({
      recipientId: new Types.ObjectId(userA),
      type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
      title: "Read item",
      message: "Read item",
      readAt: new Date(),
    });
    await readNotif.save();

    unreadCount = await getUnreadCount(userA);
    expect(unreadCount === 1, "Unread count ignores read notifications");

    console.log("\n>> Running Mark As Read Test...");
    await markNotificationAsRead(userA, notif!._id.toString());
    unreadCount = await getUnreadCount(userA);
    expect(unreadCount === 0, "Unread count is 0 after marking read");

    const updatedNotif = await Notification.findById(notif!._id);
    expect(updatedNotif!.readAt !== null, "readAt is set");

    console.log("\n>> Running Idempotent Mark As Read Test...");

    
    // Simulate slight delay before next call
    await new Promise(r => setTimeout(r, 10));
    
    await markNotificationAsRead(userA, notif!._id.toString());
    const updatedNotifAgain = await Notification.findById(notif!._id);
    
    // It updates the timestamp in our simple idempotent implementation
    // The requirement was: succeeds safely without generating an error.
    expect(updatedNotifAgain!.readAt !== null, "Idempotent call succeeds safely");

    console.log("\n>> Running Tenant Isolation / BOLA Protection Test...");
    try {
      await markNotificationAsRead(userB, notif!._id.toString());
      expect(false, "Should have thrown NotFoundError");
    } catch (err: any) {
      expect(err instanceof NotFoundError, "Throws NotFoundError on cross-tenant access");
    }

    console.log("\n>> Running Mark All As Read Test...");
    await Notification.deleteMany({});
    await createNotification({ recipientId: userA, type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT, title: "1", message: "1" });
    await createNotification({ recipientId: userA, type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT, title: "2", message: "2" });
    await createNotification({ recipientId: userB, type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT, title: "3", message: "3" });
    
    expect(await getUnreadCount(userA) === 2, "User A has 2 unread");
    expect(await getUnreadCount(userB) === 1, "User B has 1 unread");

    const modifiedCount = await markAllNotificationsAsRead(userA);
    expect(modifiedCount === 2, "Modified exactly 2 documents for User A");
    expect(await getUnreadCount(userA) === 0, "User A has 0 unread");
    expect(await getUnreadCount(userB) === 1, "User B still has 1 unread (Isolation)");

    console.log("\n>> Running Cursor Pagination Test...");
    await Notification.deleteMany({});
    
    // Insert 5 notifications
    for (let i = 0; i < 5; i++) {
      await createNotification({ recipientId: userA, type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT, title: `Item ${i}`, message: "msg" });
    }

    // Page 1
    const p1 = await getNotifications(userA, { limit: 3, readStatus: "all" });
    expect(p1.items.length === 3, "Page 1 returns exactly limit (3) items");
    expect(p1.pagination.hasMore === true, "hasMore is true");
    expect(p1.items[0]!.title === "Item 4", "Stable newest-first ordering");

    // Page 2
    const p2 = await getNotifications(userA, { limit: 3, cursor: p1.pagination.nextCursor!, readStatus: "all" });
    expect(p2.items.length === 2, "Page 2 returns remaining 2 items");
    expect(p2.pagination.hasMore === false, "hasMore is false on last page");
    expect(p2.pagination.nextCursor === null, "nextCursor is null on last page");

    const allIds = [...p1.items, ...p2.items].map(i => i._id.toString());
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size === 5, "No duplicate items between cursor pages");

    console.log("\n>> Running Entity Workspace Resolution Test...");
    const Workspace = (await import("../models/workspace.model.js")).default;
    const Task = (await import("../models/task.model.js")).default;

    const testUser = new Types.ObjectId();
    const testWs = await Workspace.create({
      name: "Rehan Workspace",
      slug: "rehan-s-workspace",
      ownerId: testUser,
    });

    const testTask = await Task.create({
      title: "Cross Workspace Task",
      workspaceId: testWs._id,
      owner: testUser,
      status: "todo",
      priority: "medium",
    });

    // Create notification WITHOUT passing workspaceId explicitly
    await createNotification({
      recipientId: testUser.toString(),
      type: NOTIFICATION_TYPES.TASK_ASSIGNED,
      entityType: "task",
      entityId: testTask._id.toString(),
      title: "Task assigned",
      message: "You were assigned a task",
    });

    const notifFeed = await getNotifications(testUser.toString(), { limit: 10, readStatus: "all" });
    const taskNotif: any = notifFeed.items.find((it: any) => it.entityId?.toString() === testTask._id.toString());
    expect(taskNotif !== undefined, "Found task notification in feed");
    expect(String(taskNotif?.workspaceId) === testWs._id.toString(), "workspaceId resolved from Task entity");
    expect(taskNotif?.workspaceSlug === "rehan-s-workspace", "workspaceSlug resolved from Workspace entity");

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
