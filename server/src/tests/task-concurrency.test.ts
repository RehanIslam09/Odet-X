import dotenv from "dotenv";
import mongoose from "mongoose";

// Load configuration
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import Task from "../models/task.model.js";
import Activity from "../models/activity.model.js";
import { updateTaskNotes } from "../services/task.service.js";
import { ConflictError, NotFoundError } from "../utils/app-error.js";

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

  const userA = new mongoose.Types.ObjectId().toString();
  const userB = new mongoose.Types.ObjectId().toString();

  // Ensure clean slate before each sub-test where appropriate, though we can just create new tasks.
  
  console.log("\n--- 1 & 2. Correct expectedVersion saves successfully and increments version ---");
  {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
      status: "todo",
      priority: "none",
    });
    
    expect((task as any).__v === 0, "Initial version is 0");

    const updatedTask = await updateTaskNotes(
      task._id.toString(),
      userA,
      { notes: "New Notes", expectedVersion: 0 }
    );

    expect(updatedTask.notes === "New Notes", "Notes were updated in returned object");
    expect((updatedTask as any).__v === 1, "Version incremented to 1 in returned object");
    
    // Verify it actually persisted
    const dbTask = await Task.findById(task._id);
    expect(dbTask?.notes === "New Notes", "Notes were persisted");
    expect(dbTask?.__v === 1, "Version incremented to 1 in DB");
  }

  console.log("\n--- 3 & 4. Stale expectedVersion returns 409 and does not overwrite ---");
  {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
      notes: "V1",
    });
    
    // Simulate someone else updating the task
    await Task.updateOne({ _id: task._id }, { $set: { notes: "V2" }, $inc: { __v: 1 } });

    let threwConflict = false;
    try {
      await updateTaskNotes(task._id.toString(), userA, { notes: "V3", expectedVersion: 0 });
    } catch (e: any) {
      if (e instanceof ConflictError) threwConflict = true;
    }
    expect(threwConflict, "Throws ConflictError when expectedVersion is stale");

    // Verify it was NOT overwritten
    const dbTask = await Task.findById(task._id);
    expect(dbTask?.notes === "V2", "Notes remained V2");
    expect(dbTask?.__v === 1, "Version remained 1");
  }

  console.log("\n--- 5. Cross-tenant request still returns 404, not 409 ---");
  {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
    });

    // User B tries to update User A's task, even with wrong version
    let threwNotFound = false;
    try {
      await updateTaskNotes(task._id.toString(), userB, { notes: "Hacked", expectedVersion: 999 });
    } catch (e: any) {
      if (e instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Throws NotFoundError for cross-tenant request");
  }

  console.log("\n--- 6. Deleted Task returns 404 ---");
  {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
      isDeleted: true,
    });

    let threwNotFound = false;
    try {
      await updateTaskNotes(task._id.toString(), userA, { notes: "Hello", expectedVersion: 0 });
    } catch (e: any) {
      if (e instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Throws NotFoundError for deleted task");
  }

  console.log("\n--- 7 & 8. Notes update still generates zero Activity events ---");
  {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
    });

    await updateTaskNotes(task._id.toString(), userA, { notes: "New Notes", expectedVersion: 0 });

    const activities = await Activity.find({ taskId: task._id.toString() });
    expect(activities.length === 0, "No activity events generated for notes update"); 
  }

  console.log("\n--- 9. Two simulated clients using the same starting version ---");
  {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
      notes: "Start",
    });

    // Client 1 loads task (__v = 0)
    // Client 2 loads task (__v = 0)
    const client1Version = (task as any).__v;
    const client2Version = (task as any).__v;

    // Client 1 saves successfully
    await updateTaskNotes(task._id.toString(), userA, { notes: "Client 1 Edit", expectedVersion: client1Version });

    // Client 2 attempts to save
    let threwConflict = false;
    try {
      await updateTaskNotes(task._id.toString(), userA, { notes: "Client 2 Edit", expectedVersion: client2Version });
    } catch (e: any) {
      if (e instanceof ConflictError) threwConflict = true;
    }
    expect(threwConflict, "Client 2 receives ConflictError");

    // Verify Client 1's edit survived
    const dbTask = await Task.findById(task._id);
    expect(dbTask?.notes === "Client 1 Edit", "Client 1 edit survived");
    expect(dbTask?.__v === 1, "Version is 1");
  }

  await teardownTestDatabase();
  console.log("\n🎉 All concurrency tests passed successfully.");
}

runTests().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});
