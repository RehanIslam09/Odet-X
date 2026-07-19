import dotenv from "dotenv";
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { Types } from "mongoose";
import { createNotificationStrict } from "../services/notification.service.js";
import Notification from "../models/notification.model.js";
import { NOTIFICATION_TYPES } from "../constants/notification.js";

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
    console.log("\n--- Starting Phase 16.3 Strict Notification Tests ---\n");

    const recipientId = new Types.ObjectId().toString();

    console.log(">> Running Strict Notification Creation Test...");
    const result = await createNotificationStrict({
      recipientId,
      type: NOTIFICATION_TYPES.TASK_DUE_SOON as any,
      title: "Test",
      message: "Test msg",
    });

    expect(result === true, "Returned true for successful creation");

    let count = await Notification.countDocuments();
    expect(count === 1, "Exactly 1 notification exists");

    console.log("\n>> Running Idempotent DedupeKey Test...");
    const dedupeKey = "test_dedupe_123";

    const payload = {
      recipientId,
      type: NOTIFICATION_TYPES.TASK_DUE_SOON as any,
      title: "Test",
      message: "Test msg",
      dedupeKey,
    };

    const firstResult = await createNotificationStrict(payload);
    expect(firstResult === true, "First payload insertion successful");

    const secondResult = await createNotificationStrict(payload);
    expect(secondResult === false, "Caught E11000 duplicate key gracefully, returned false");

    count = await Notification.countDocuments();
    expect(count === 2, "Only 1 deduplicated notification was added, total 2");

    console.log("\n🎉 ALL STRICT TESTS COMPLETED SUCCESSFULLY! 🎉");
    await teardownTestDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Test execution failed with error:", error);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
