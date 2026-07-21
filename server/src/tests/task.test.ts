import dotenv from "dotenv";
import { Types } from "mongoose";

// Load configuration
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";

import {
  createTaskSchema,
  taskQuerySchema,
  updateTaskSchema,
} from "../validators/task.validator.js";

import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  toggleTaskArchive,
  updateTask,
} from "../services/task.service.js";

import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
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
    console.log("\n--- Starting Phase 10.2 Task Backend Tests ---\n");

    // =========================================================================
    // 1. Zod Validation Tests
    // =========================================================================
    console.log(">> Running Zod Validation tests...");

    // Invalid ObjectId validation
    const createInvalidObjectId = createTaskSchema.safeParse({
      title: "Task Title",
      projectId: "invalid-id",
    });
    expect(createInvalidObjectId.success === false, "Rejects invalid project ObjectId");

    // Invalid enum values
    const createInvalidStatus = createTaskSchema.safeParse({
      title: "Task Title",
      status: "non-existent-status",
    });
    expect(createInvalidStatus.success === false, "Rejects invalid status enum value");

    const createInvalidPriority = createTaskSchema.safeParse({
      title: "Task Title",
      priority: "super-urgent",
    });
    expect(createInvalidPriority.success === false, "Rejects invalid priority enum value");

    // Query validation (pagination limits & negative values)
    const queryNegativePage = taskQuerySchema.safeParse({
      page: -5,
    });
    expect(queryNegativePage.success === false, "Rejects negative page index");

    const queryExcessiveLimit = taskQuerySchema.safeParse({
      limit: 500, // Capped at MAX_PAGE_SIZE = 100
    });
    expect(queryExcessiveLimit.success === false, "Rejects queries exceeding MAX_PAGE_SIZE limit");

    const queryInvalidSort = taskQuerySchema.safeParse({
      sort: "not-a-field",
    });
    expect(queryInvalidSort.success === false, "Rejects un-whitelisted sort fields");

    // Missing title
    const createMissingTitle = createTaskSchema.safeParse({
      description: "No title",
    });
    expect(createMissingTitle.success === false, "Rejects missing title");

    const createEmptyTitle = createTaskSchema.safeParse({
      title: "   ",
    });
    expect(createEmptyTitle.success === false, "Rejects empty title");

    // Excessive field lengths
    const createExcessiveTitle = createTaskSchema.safeParse({
      title: "a".repeat(151),
    });
    expect(createExcessiveTitle.success === false, "Rejects excessive title length");

    const createExcessiveDesc = createTaskSchema.safeParse({
      title: "Valid",
      description: "a".repeat(5001),
    });
    expect(createExcessiveDesc.success === false, "Rejects excessive description length");

    const createExcessiveEstTime = createTaskSchema.safeParse({
      title: "Valid",
      estimatedTime: "a".repeat(21),
    });
    expect(createExcessiveEstTime.success === false, "Rejects excessive estimatedTime length");

    // Protected field injection stripping
    const updateProtectedFields = updateTaskSchema.safeParse({
      title: "Valid",
      owner: new Types.ObjectId().toString(),
      isDeleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(updateProtectedFields.success === true, "Accepts valid fields while ignoring protected ones");
    expect(!("owner" in (updateProtectedFields as any).data), "Strips owner from update payload");
    expect(!("isDeleted" in (updateProtectedFields as any).data), "Strips isDeleted from update payload");
    expect(!("createdAt" in (updateProtectedFields as any).data), "Strips createdAt from update payload");
    expect(!("updatedAt" in (updateProtectedFields as any).data), "Strips updatedAt from update payload");

    // =========================================================================
    // 2. Mongoose Schema pre-save hooks & concurrency
    // =========================================================================
    console.log("\n>> Running Mongoose Schema hook tests...");

    // Create test user and projects
    const userA = await User.create({
      name: "User A",
      username: "usera",
      email: "usera@example.com",
      password: "password123",
    });

    const userB = await User.create({
      name: "User B",
      username: "userb",
      email: "userb@example.com",
      password: "password123",
    });

    const projectA = await Project.create({
      name: "Project A",
      owner: userA._id,
      emoji: "📁",
      color: "#6366f1",
    });

    const projectB = await Project.create({
      name: "Project B",
      owner: userB._id,
      emoji: "📁",
      color: "#6366f1",
    });

    // Label normalizations
    const labelTask = await Task.create({
      owner: userA._id,
      title: "Test Normalization",
      labels: ["  Frontend ", "Auth", "Frontend", "  ", "Auth ", "Frontend"],
    });
    expect(labelTask.labels.length === 2, "Deduplicates labels");
    expect(labelTask.labels.includes("Frontend") && labelTask.labels.includes("Auth"), "Trims and normalizes labels");
    expect(!labelTask.labels.includes(""), "Ignores empty labels");

    // completedAt Transitions
    const compTask = await Task.create({
      owner: userA._id,
      title: "Completion Semantics Task",
      status: "todo"
    });
    
    // 10. todo -> in_progress leaves completedAt null
    compTask.status = "in_progress";
    await compTask.save();
    expect(compTask.completedAt === null, "todo -> in_progress leaves completedAt null");

    // 2. in_progress -> done sets completedAt
    compTask.status = "done";
    await compTask.save();
    expect(compTask.completedAt instanceof Date, "in_progress -> done sets completedAt");
    const firstCompletion = compTask.completedAt;

    // 7. done -> done preserves completedAt
    compTask.status = "done";
    await compTask.save();
    expect(compTask.completedAt?.getTime() === firstCompletion?.getTime(), "done -> done preserves completedAt");

    // 8. Updating description on a done Task preserves completedAt
    compTask.description = "New description";
    await compTask.save();
    expect(compTask.completedAt?.getTime() === firstCompletion?.getTime(), "Updating description on a done Task preserves completedAt");

    // 9. Updating priority on a done Task preserves completedAt
    compTask.priority = "urgent";
    await compTask.save();
    expect(compTask.completedAt?.getTime() === firstCompletion?.getTime(), "Updating priority on a done Task preserves completedAt");

    // 4. done -> todo clears completedAt
    compTask.status = "todo";
    await compTask.save();
    expect(compTask.completedAt === null, "done -> todo clears completedAt");

    // 1. todo -> done sets completedAt
    compTask.status = "done";
    await compTask.save();
    expect(compTask.completedAt instanceof Date, "todo -> done sets completedAt");

    // 5. done -> in_progress clears completedAt
    compTask.status = "in_progress";
    await compTask.save();
    expect(compTask.completedAt === null, "done -> in_progress clears completedAt");

    // 6. done -> cancelled clears completedAt
    compTask.status = "done";
    await compTask.save();
    compTask.status = "cancelled";
    await compTask.save();
    expect(compTask.completedAt === null, "done -> cancelled clears completedAt");

    // 3. cancelled -> done sets completedAt
    compTask.status = "done";
    await compTask.save();
    expect(compTask.completedAt instanceof Date, "cancelled -> done sets completedAt");

    // Optimistic Concurrency Control
    const docInstance1 = await Task.findById(labelTask._id);
    const docInstance2 = await Task.findById(labelTask._id);
    
    expect(docInstance1 !== null && docInstance2 !== null, "Retrieves instances for concurrency check");

    docInstance1!.title = "Concurrency Edit 1";
    await docInstance1!.save();

    docInstance2!.title = "Concurrency Edit 2";
    let concurrencyFailed = false;
    try {
      await docInstance2!.save();
    } catch {
      concurrencyFailed = true;
    }
    expect(concurrencyFailed, "Throws version exception on concurrent out-of-date document edits");

    // =========================================================================
    // 3. Service Layer CRUD & Security Filtering
    // =========================================================================
    console.log("\n>> Running Service and Security boundary tests...");

    // Create Task under Project A (User A)
    const taskA1 = await createTask(userA._id.toString(), {
      title: "User A Task 1",
      description: "Description of Task 1",
      projectId: projectA._id.toString(),
      status: "todo",
      priority: "high",
      dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000), // tomorrow
      estimatedTime: "2h",
      labels: ["Frontend"],
    });
    expect(taskA1.projectId?.toString() === projectA._id.toString(), "Task created under correct project");

    // Verify default values
    const taskDefault = await createTask(userA._id.toString(), {
      title: "Task Default Values",
    });
    expect(taskDefault.status === "todo", "Default status is 'todo'");
    expect(taskDefault.priority === "none", "Default priority is 'none'");
    expect(taskDefault.projectId === null, "Default projectId is null");
    expect(taskDefault.dueDate === null, "Default dueDate is null");
    expect(taskDefault.estimatedTime === null, "Default estimatedTime is null");
    expect(taskDefault.labels.length === 0, "Default labels is empty array");
    expect(taskDefault.description === "", "Default description is empty string");
    expect(taskDefault.createdAt instanceof Date, "Populates createdAt");
    expect(taskDefault.updatedAt instanceof Date, "Populates updatedAt");

    // Verify partial updates
    const updatedTitle = await updateTask(taskDefault._id.toString(), userA._id.toString(), {
      title: "Updated Title Only",
    });
    expect(updatedTitle.title === "Updated Title Only", "Updates title");
    expect(updatedTitle.status === "todo", "Leaves other fields unchanged on partial update");

    const updatedProject = await updateTask(taskDefault._id.toString(), userA._id.toString(), {
      projectId: projectA._id.toString(),
    });
    expect(updatedProject.projectId?.toString() === projectA._id.toString(), "Updates projectId");

    // Verify projectId: null unassigns task
    const unassignedProject = await updateTask(taskDefault._id.toString(), userA._id.toString(), {
      projectId: null,
    });
    expect(unassignedProject.projectId === null, "Unassigns task from project on projectId: null");

    // Create Task under Project B by User A (Cross-project ownership vulnerability check)
    let crossProjectFailed = false;
    try {
      await createTask(userA._id.toString(), {
        title: "Unauthorized Project Task",
        projectId: projectB._id.toString(),
      });
    } catch (err: any) {
      crossProjectFailed = true;
      expect(err.name === "NotFoundError", "Rejects assigning task to another user's project (not found)");
    }
    expect(crossProjectFailed, "Ownership check blocks cross-project task injection");

    // User A querying User B's task (Resource Enumeration prevention)
    const taskB1 = await createTask(userB._id.toString(), {
      title: "User B Task 1",
      status: "todo",
    });

    let enumerationBlocked = false;
    try {
      await getTaskById(taskB1._id.toString(), userA._id.toString());
    } catch (err: any) {
      enumerationBlocked = true;
      expect(err.name === "NotFoundError", "Refuses to leak User B's task details");
    }
    expect(enumerationBlocked, "Security boundary prevents cross-user task retrieval");

    // Update Project ID validation during update
    let crossProjectUpdateBlocked = false;
    try {
      await updateTask(taskA1._id.toString(), userA._id.toString(), {
        projectId: projectB._id.toString(), // Belongs to User B
      });
    } catch (err: any) {
      crossProjectUpdateBlocked = true;
      expect(err.name === "NotFoundError", "Rejects updating task to point to unauthorized project (not found)");
    }
    expect(crossProjectUpdateBlocked, "Security boundary prevents changing tasks to unauthorized projects");

    // Assigning to a non-existent project
    let nonExistentProjectBlocked = false;
    try {
      await updateTask(taskA1._id.toString(), userA._id.toString(), {
        projectId: new Types.ObjectId().toString(),
      });
    } catch (err: any) {
      nonExistentProjectBlocked = true;
      expect(err.name === "NotFoundError", "Rejects assigning task to non-existent project (not found)");
    }
    expect(nonExistentProjectBlocked, "Security boundary prevents assigning tasks to non-existent projects");

    // Assigning to a soft-deleted project
    const projectC = await Project.create({
      name: "Project C",
      owner: userA._id,
      isDeleted: true,
    });
    let softDeletedProjectBlocked = false;
    try {
      await updateTask(taskA1._id.toString(), userA._id.toString(), {
        projectId: projectC._id.toString(),
      });
    } catch (err: any) {
      softDeletedProjectBlocked = true;
      expect(err.name === "NotFoundError", "Rejects assigning task to soft-deleted project (not found)");
    }
    expect(softDeletedProjectBlocked, "Security boundary prevents assigning tasks to soft-deleted projects");

    // Query listings (Search & Filtering)
    await createTask(userA._id.toString(), {
      title: "User A Task 2: Build AI Dashboard",
      description: "Must verify websocket connections",
      status: "in_progress",
      priority: "medium",
      labels: ["ai-core"],
    });

    const list1 = await listTasks(userA._id.toString(), {
      page: 1,
      limit: 10,
      projectId: "all",
      status: "all",
      priority: "all",
      sort: "-updatedAt",
      archived: false,
    });
    expect(list1.items.length === 5, "Lists all active tasks for user A (including normalized task)");
    expect(!list1.items.some((t) => t.owner.toString() === userB._id.toString()), "Excludes User B's tasks from lists");

    // Regex Search: matching title, description, and labels
    const listSearchTitle = await listTasks(userA._id.toString(), {
      search: "Dashboard",
      sort: "-updatedAt",
      projectId: "all",
      status: "all",
      priority: "all",
      archived: false,
      page: 1,
      limit: 10,
    });
    const firstTitleItem = listSearchTitle.items[0];
    expect(listSearchTitle.items.length === 1 && firstTitleItem !== undefined && firstTitleItem.title.includes("AI Dashboard"), "Searches task title");

    const listSearchDesc = await listTasks(userA._id.toString(), {
      search: "websocket",
      sort: "-updatedAt",
      projectId: "all",
      status: "all",
      priority: "all",
      archived: false,
      page: 1,
      limit: 10,
    });
    const firstDescItem = listSearchDesc.items[0];
    expect(listSearchDesc.items.length === 1 && firstDescItem !== undefined && firstDescItem.description.includes("websocket"), "Searches task description");

    const listSearchLabel = await listTasks(userA._id.toString(), {
      search: "ai-core",
      sort: "-updatedAt",
      projectId: "all",
      status: "all",
      priority: "all",
      archived: false,
      page: 1,
      limit: 10,
    });
    const firstLabelItem = listSearchLabel.items[0];
    expect(listSearchLabel.items.length === 1 && firstLabelItem !== undefined && firstLabelItem.labels.includes("ai-core"), "Searches task labels");

    // =========================================================================
    // 4. Archive & Soft Delete
    // =========================================================================
    console.log("\n>> Running Archive and Soft-Delete tests...");

    // Archiving
    expect(taskA1.archived === false, "Tasks default to non-archived");
    const archivedTask = await toggleTaskArchive(taskA1._id.toString(), userA._id.toString());
    expect(archivedTask.archived === true, "Task state transitions to archived");

    // Confirm archived task disappears from standard listings
    const activeList = await listTasks(userA._id.toString(), {
      archived: false,
      page: 1,
      limit: 10,
      projectId: "all",
      status: "all",
      priority: "all",
      sort: "-updatedAt",
    });
    expect(!activeList.items.some((t) => t._id.toString() === taskA1._id.toString()), "Archived task excluded from active list");

    const archivedList = await listTasks(userA._id.toString(), {
      archived: true,
      page: 1,
      limit: 10,
      projectId: "all",
      status: "all",
      priority: "all",
      sort: "-updatedAt",
    });
    expect(archivedList.items.some((t) => t._id.toString() === taskA1._id.toString()), "Archived task included in archived query");

    // Unarchive
    const unarchivedTask = await toggleTaskArchive(taskA1._id.toString(), userA._id.toString());
    expect(unarchivedTask.archived === false, "Task transitions back to unarchived");

    // Soft-deleting
    await deleteTask(taskA1._id.toString(), userA._id.toString());
    const deletedTaskInDb = await Task.findById(taskA1._id);
    expect(deletedTaskInDb?.isDeleted === true, "Soft-delete sets isDeleted: true");

    const activeListPostDelete = await listTasks(userA._id.toString(), {
      archived: false,
      page: 1,
      limit: 10,
      projectId: "all",
      status: "all",
      priority: "all",
      sort: "-updatedAt",
    });
    expect(!activeListPostDelete.items.some((t) => t._id.toString() === taskA1._id.toString()), "Soft-deleted task is excluded from listings");

    // Retrieve/Update soft-deleted task boundary checks
    let deletedRetrieveBlocked = false;
    try {
      await getTaskById(taskA1._id.toString(), userA._id.toString());
    } catch (err: any) {
      deletedRetrieveBlocked = true;
      expect(err.name === "NotFoundError", "Returns 404 for deleted task retrieval");
    }
    expect(deletedRetrieveBlocked, "Soft-deleted task is hidden from standard fetches");

    let deletedUpdateBlocked = false;
    try {
      await updateTask(taskA1._id.toString(), userA._id.toString(), {
        title: "Attempting edit on deleted task",
      });
    } catch (err: any) {
      deletedUpdateBlocked = true;
      expect(err.name === "NotFoundError", "Returns 404 for updates targeting deleted tasks");
    }
    expect(deletedUpdateBlocked, "Updates are rejected for soft-deleted tasks");

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
