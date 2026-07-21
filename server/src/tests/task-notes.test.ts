import dotenv from "dotenv";


// Load configuration
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";

import { updateTaskNotesSchema } from "../validators/task.validator.js";
import { updateTaskNotes, listTasks, getTaskById } from "../services/task.service.js";
import Task from "../models/task.model.js";
import Activity from "../models/activity.model.js";
import User from "../models/user.model.js";

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
    console.log("\n--- Starting Phase 17.1 Task Notes Tests ---\n");

    const owner = await User.create({
      username: "notes_owner",
      name: "Notes Owner",
      email: "notesowner@example.com",
      password: "password123",
    });
    const ownerIdStr = owner._id.toString();

    const otherUser = await User.create({
      username: "other_user",
      name: "Other User",
      email: "other@example.com",
      password: "password123",
    });
    const otherIdStr = otherUser._id.toString();

    const task = await Task.create({
      owner: owner._id,
      title: "Test Task for Notes",
    });
    const taskIdStr = task._id.toString();

    await Activity.deleteMany({}); // clear initial activities

    // =========================================================================
    // 1. Zod Validation Tests
    // =========================================================================
    console.log(">> Running Zod Validation tests...");

    // Accept valid notes
    const validNotes = updateTaskNotesSchema.safeParse({ notes: "Some good notes" });
    expect(validNotes.success, "Accepts valid notes string");

    // Reject too long notes
    const massiveNotes = "a".repeat(250001);
    const invalidNotes = updateTaskNotesSchema.safeParse({ notes: massiveNotes });
    expect(invalidNotes.success === false, "Rejects notes exceeding 250,000 chars");

    // =========================================================================
    // 2. Service Logic Tests
    // =========================================================================
    console.log(">> Running Service Logic tests...");

    // 2.1 Basic Update
    let updatedTask = await updateTaskNotes(taskIdStr, ownerIdStr, { notes: "## Initial note" });
    expect(updatedTask.notes === "## Initial note", "Owner can update task notes");

    // 2.2 Verify ZERO activity events
    const activities = await Activity.find({ taskId: taskIdStr });
    expect(activities.length === 0, "Updating notes creates ZERO activity events");

    // 2.3 Empty and whitespace
    updatedTask = await updateTaskNotes(taskIdStr, ownerIdStr, { notes: "" });
    expect(updatedTask.notes === "", "Owner can clear notes with empty string");
    
    updatedTask = await updateTaskNotes(taskIdStr, ownerIdStr, { notes: "   \n  " });
    expect(updatedTask.notes === "   \n  ", "Whitespace is preserved");

    // 2.4 BOLA / Tenant check
    try {
      await updateTaskNotes(taskIdStr, otherIdStr, { notes: "Malicious" });
      expect(false, "Should not allow cross-tenant notes update");
    } catch (err: any) {
      expect(err.name === "NotFoundError", "Cross-tenant access throws NotFoundError");
    }

    // =========================================================================
    // 3. Collection Payload Projection Tests
    // =========================================================================
    console.log(">> Running Collection Payload tests...");

    await updateTaskNotes(taskIdStr, ownerIdStr, { notes: "Sensitive lengthy information" });

    // 3.1 Single Task includes notes
    const singleTask = await getTaskById(taskIdStr, ownerIdStr);
    expect(singleTask.notes === "Sensitive lengthy information", "getTaskById includes notes field");

    // 3.2 List Tasks EXCLUDES notes
    const listResult = await listTasks(ownerIdStr, {
      page: 1, limit: 10, search: "", status: "all", priority: "all", projectId: "all", sort: "-createdAt", quickFilter: "all", archived: false
    });
    
    const taskInList = listResult.items[0];
    const taskJson = (taskInList as any).toJSON ? (taskInList as any).toJSON() : taskInList;
    
    expect(taskJson.notes === undefined, "listTasks dynamically EXCLUDES the notes field via projection");

    console.log("\n✅ All Task Notes tests passed successfully.\n");
  } catch (error) {
    console.error("\n❌ Test execution failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await teardownTestDatabase();
    process.exit(0);
  }
}

// Ensure the script runs when executed directly
runTests();
