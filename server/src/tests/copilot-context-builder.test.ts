import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import Activity from "../models/activity.model.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { NotFoundError } from "../utils/app-error.js";
import {
  buildCopilotContext,
  truncateString,
  formatActivitySummary,
} from "../domain/copilot-context-builder.js";
import { ACTIVITY_TYPES } from "../constants/activity.js";

describe("CopilotContextBuilder Domain Unit & Integration Tests (WP-01)", () => {
  let userAId: Types.ObjectId;
  let userBId: Types.ObjectId;
  let projectAId: Types.ObjectId;
  let projectBId: Types.ObjectId;

  before(async () => {
    await setupTestDatabase();

    const userA = await User.create({
      name: "User Alpha",
      username: "useralpha",
      email: "useralpha@example.com",
      password: "Password123!",
    });
    userAId = userA._id;

    const userB = await User.create({
      name: "User Beta",
      username: "userbeta",
      email: "userbeta@example.com",
      password: "Password123!",
    });
    userBId = userB._id;

    const projectA = await Project.create({
      name: "Alpha Web Application",
      description: "Building a SaaS product with React and Node",
      owner: userAId,
    });
    projectAId = projectA._id;

    const projectB = await Project.create({
      name: "Beta Mobile App",
      description: "React Native iOS and Android app",
      owner: userBId,
    });
    projectBId = projectB._id;
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await Milestone.deleteMany({});
    await Activity.deleteMany({});
  });

  it("1. Helper: truncateString truncates long strings cleanly", () => {
    assert.equal(truncateString("Hello World", 20), "Hello World");
    assert.equal(truncateString("   ", 10), "");
    assert.equal(truncateString(null, 10), "");

    const longStr = "A".repeat(100);
    const truncated = truncateString(longStr, 10);
    assert.equal(truncated.length, 13); // 10 chars + "..."
    assert.ok(truncated.endsWith("..."));
  });

  it("2. Helper: formatActivitySummary formats activity types without leaking raw ObjectIds", () => {
    assert.equal(
      formatActivitySummary(ACTIVITY_TYPES.TASK_CREATED, { title: "Auth Task" }),
      'Task created: "Auth Task"'
    );
    assert.equal(
      formatActivitySummary(ACTIVITY_TYPES.TASK_STATUS_CHANGED, { title: "DB Setup", to: "done" }),
      'Task status changed to done: "DB Setup"'
    );
    assert.equal(formatActivitySummary(ACTIVITY_TYPES.PROJECT_CREATED), "Project created");
    assert.equal(formatActivitySummary(ACTIVITY_TYPES.AI_PLAN_COMMITTED), "AI plan committed");
  });

  it("3. Authorized project context is retrieved correctly with safe field projection", async () => {
    const ms1 = await Milestone.create({
      owner: userAId,
      projectId: projectAId,
      title: "v1.0 Release Milestone",
      description: "Core features complete",
      position: 1,
    });

    const task1 = await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Implement Authentication",
      description: "JWT middleware setup",
      notes: "SECRET NOTES DO NOT EXPOSE TO LLM",
      status: "todo",
      priority: "high",
      position: 1,
      milestoneId: ms1._id,
    });

    await Activity.create({
      owner: userAId,
      actorId: userAId,
      type: ACTIVITY_TYPES.TASK_CREATED,
      entityType: "task",
      entityId: task1._id,
      projectId: projectAId,
      contextProjectIds: [projectAId],
      metadata: { title: "Implement Authentication" },
    });

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    const { context, symbolicMap } = result;

    // Project DTO checks
    assert.equal(context.project.ref, "project");
    assert.equal(context.project.name, "Alpha Web Application");
    assert.equal(context.project.description, "Building a SaaS product with React and Node");
    assert.equal(context.project.archived, false);

    // Milestone DTO checks
    assert.equal(context.milestones.length, 1);
    assert.equal(context.milestones[0]!.ref, "ms_1");
    assert.equal(context.milestones[0]!.title, "v1.0 Release Milestone");

    // Task DTO checks
    assert.equal(context.tasks.length, 1);
    assert.equal(context.tasks[0]!.ref, "task_1");
    assert.equal(context.tasks[0]!.title, "Implement Authentication");
    assert.equal(context.tasks[0]!.milestoneRef, "ms_1");

    // Activity DTO checks
    assert.equal(context.recentActivity.length, 1);
    assert.equal(context.recentActivity[0]!.type, ACTIVITY_TYPES.TASK_CREATED);
    assert.equal(context.recentActivity[0]!.summary, 'Task created: "Implement Authentication"');

    // Truncation metadata checks
    assert.equal(context.truncation.totalTasks, 1);
    assert.equal(context.truncation.includedTasks, 1);
    assert.equal(context.truncation.isTruncated, false);

    // Symbolic Map checks
    assert.deepEqual(symbolicMap["project"], {
      type: "project",
      id: projectAId.toString(),
      label: "Alpha Web Application",
    });
    assert.deepEqual(symbolicMap["ms_1"], {
      type: "milestone",
      id: ms1._id.toString(),
      label: "v1.0 Release Milestone",
    });
    assert.deepEqual(symbolicMap["task_1"], {
      type: "task",
      id: task1._id.toString(),
      label: "Implement Authentication",
    });

    // Verify Model-Facing Data Minimization (NO raw ObjectIds, owner IDs, notes, __v)
    const jsonString = JSON.stringify(context);
    assert.ok(!jsonString.includes(userAId.toString()), "User ID must not leak into model context DTO");
    assert.ok(!jsonString.includes(task1._id.toString()), "Task ObjectId must not leak into model context DTO");
    assert.ok(!jsonString.includes(ms1._id.toString()), "Milestone ObjectId must not leak into model context DTO");
    assert.ok(!jsonString.includes("SECRET NOTES"), "Task notes must not leak into model context DTO");
  });

  it("4. Nonexistent, malformed, or soft-deleted projects throw NotFoundError (404)", async () => {
    // Nonexistent ObjectId
    const fakeId = new Types.ObjectId().toString();
    await assert.rejects(
      buildCopilotContext({ projectId: fakeId, userId: userAId.toString() }),
      NotFoundError
    );

    // Malformed ID string
    await assert.rejects(
      buildCopilotContext({ projectId: "invalid-id", userId: userAId.toString() }),
      NotFoundError
    );

    // Soft-deleted project
    const deletedProject = await Project.create({
      name: "Deleted Project",
      owner: userAId,
      isDeleted: true,
    });

    await assert.rejects(
      buildCopilotContext({ projectId: deletedProject._id.toString(), userId: userAId.toString() }),
      NotFoundError
    );
  });

  it("5. Cross-user project access returns NotFoundError (404)", async () => {
    // User A attempts to request User B's project
    await assert.rejects(
      buildCopilotContext({ projectId: projectBId.toString(), userId: userAId.toString() }),
      NotFoundError
    );
  });

  it("6. Unowned, soft-deleted, or different-project tasks and milestones are excluded", async () => {
    // Valid task for Project A
    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Valid Task",
      status: "todo",
    });

    // Task belonging to User B
    await Task.create({
      owner: userBId,
      projectId: projectAId, // Wrong owner on same project (should not exist in real DB, but tests filter)
      title: "Unowned Task",
    });

    // Soft-deleted task
    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Deleted Task",
      isDeleted: true,
    });

    // Task belonging to Project B
    await Task.create({
      owner: userAId,
      projectId: projectBId,
      title: "Project B Task",
    });

    // Valid Milestone
    await Milestone.create({
      owner: userAId,
      projectId: projectAId,
      title: "Valid Milestone",
      position: 1,
    });

    // Soft-deleted Milestone
    await Milestone.create({
      owner: userAId,
      projectId: projectAId,
      title: "Deleted Milestone",
      isDeleted: true,
      position: 2,
    });

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    assert.equal(result.context.tasks.length, 1);
    assert.equal(result.context.tasks[0]!.title, "Valid Task");

    assert.equal(result.context.milestones.length, 1);
    assert.equal(result.context.milestones[0]!.title, "Valid Milestone");
  });

  it("7. Activity is correctly scoped to owner and authorized project", async () => {
    await Activity.create({
      owner: userAId,
      actorId: userAId,
      type: ACTIVITY_TYPES.PROJECT_CREATED,
      entityType: "project",
      entityId: projectAId,
      projectId: projectAId,
      contextProjectIds: [projectAId],
      metadata: {},
    });

    await Activity.create({
      owner: userBId,
      actorId: userBId,
      type: ACTIVITY_TYPES.PROJECT_CREATED,
      entityType: "project",
      entityId: projectBId,
      projectId: projectBId,
      contextProjectIds: [projectBId],
      metadata: {},
    });

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    assert.equal(result.context.recentActivity.length, 1);
    assert.equal(result.context.recentActivity[0]!.type, ACTIVITY_TYPES.PROJECT_CREATED);
  });

  it("8. Descriptions are truncated deterministically without mutating persisted data", async () => {
    const longProjectDesc = "P".repeat(600);
    const longTaskDesc = "T".repeat(400);
    const longMsDesc = "M".repeat(400);

    const project = await Project.create({
      name: "Long Desc Project",
      description: longProjectDesc,
      owner: userAId,
    });

    const ms = await Milestone.create({
      owner: userAId,
      projectId: project._id,
      title: "Long Ms Title",
      description: longMsDesc,
      position: 1,
    });

    const task = await Task.create({
      owner: userAId,
      projectId: project._id,
      title: "Long Task Title",
      description: longTaskDesc,
      milestoneId: ms._id,
    });

    const result = await buildCopilotContext({
      projectId: project._id.toString(),
      userId: userAId.toString(),
    });

    assert.equal(result.context.project.description.length, 503); // 500 + "..."
    assert.equal(result.context.milestones[0]!.description.length, 303); // 300 + "..."
    assert.equal(result.context.tasks[0]!.description.length, 303); // 300 + "..."

    // Assert database documents are completely unmutated
    const dbProject = await Project.findById(project._id);
    const dbTask = await Task.findById(task._id);
    const dbMs = await Milestone.findById(ms._id);

    assert.equal(dbProject?.description.length, 600);
    assert.equal(dbTask?.description.length, 400);
    assert.equal(dbMs?.description.length, 400);
  });

  it("9. Reference timestamp controls overdue classification and task category ordering deterministically", async () => {
    const refTime = new Date("2026-07-25T12:00:00Z");

    // Task 1: Overdue & Low Priority (Category 1)
    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Overdue Task",
      status: "todo",
      priority: "low",
      dueDate: new Date("2026-07-20T00:00:00Z"),
      position: 1,
    });

    // Task 2: Overdue & Urgent Priority (Category 1 - MUST NOT be duplicated into Category 2)
    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Overdue Urgent Task",
      status: "todo",
      priority: "urgent",
      dueDate: new Date("2026-07-15T00:00:00Z"), // Earlier overdue date
      position: 2,
    });

    // Task 3: Incomplete Urgent Priority (Category 2)
    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Urgent Task",
      status: "todo",
      priority: "urgent",
      dueDate: new Date("2026-08-01T00:00:00Z"),
      position: 3,
    });

    // Task 4: Incomplete High Priority (Category 2)
    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "High Priority Task",
      status: "in_progress",
      priority: "high",
      dueDate: null,
      position: 4,
    });

    // Task 5: Incomplete Standard Task (Category 3)
    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Standard Task",
      status: "todo",
      priority: "medium",
      position: 5,
    });

    // Task 6: Completed Task (Category 4)
    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Completed Task",
      status: "done",
      completedAt: new Date("2026-07-24T10:00:00Z"),
      position: 6,
    });

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
      referenceTime: refTime,
    });

    const tasks = result.context.tasks;
    assert.equal(tasks.length, 6);

    // Verify ordering:
    // 1. taskOverdueUrgent (Overdue, earlier dueDate 2026-07-15)
    // 2. taskOverdue (Overdue, dueDate 2026-07-20)
    // 3. taskUrgent (Category 2, urgent priority)
    // 4. taskHigh (Category 2, high priority)
    // 5. taskStandard (Category 3, standard)
    // 6. taskDone (Category 4, completed)

    assert.equal(tasks[0]!.title, "Overdue Urgent Task");
    assert.equal(tasks[0]!.ref, "task_1");

    assert.equal(tasks[1]!.title, "Overdue Task");
    assert.equal(tasks[1]!.ref, "task_2");

    assert.equal(tasks[2]!.title, "Urgent Task");
    assert.equal(tasks[2]!.ref, "task_3");

    assert.equal(tasks[3]!.title, "High Priority Task");
    assert.equal(tasks[3]!.ref, "task_4");

    assert.equal(tasks[4]!.title, "Standard Task");
    assert.equal(tasks[4]!.ref, "task_5");

    assert.equal(tasks[5]!.title, "Completed Task");
    assert.equal(tasks[5]!.ref, "task_6");

    // Verify taskOverdueUrgent was NOT duplicated
    const titles = tasks.map((t) => t.title);
    const uniqueTitles = new Set(titles);
    assert.equal(uniqueTitles.size, 6, "Task category assignment must not duplicate tasks across categories");
  });

  it("10. Milestones use deterministic position and _id ASC tie-breaking order", async () => {
    await Milestone.create({
      owner: userAId,
      projectId: projectAId,
      title: "Milestone B",
      position: 2,
    });

    await Milestone.create({
      owner: userAId,
      projectId: projectAId,
      title: "Milestone A",
      position: 1,
    });

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    assert.equal(result.context.milestones.length, 2);
    assert.equal(result.context.milestones[0]!.title, "Milestone A");
    assert.equal(result.context.milestones[0]!.ref, "ms_1");

    assert.equal(result.context.milestones[1]!.title, "Milestone B");
    assert.equal(result.context.milestones[1]!.ref, "ms_2");
  });

  it("11. Task dependencies preserve dependent -> prerequisiteRefs direction and filter invalid targets", async () => {
    const taskPrereq = await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Prerequisite Database Task",
      status: "todo",
      position: 1,
    });

    const deletedPrereq = await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Deleted Prerequisite Task",
      isDeleted: true,
      status: "todo",
    });

    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Dependent API Task",
      status: "todo",
      position: 2,
      dependencies: [taskPrereq._id, deletedPrereq._id, new Types.ObjectId()],
    });

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    const tasks = result.context.tasks;
    assert.equal(tasks.length, 2);

    // Find dependent task
    const depTaskContext = tasks.find((t) => t.title === "Dependent API Task");
    const prereqTaskContext = tasks.find((t) => t.title === "Prerequisite Database Task");

    assert.ok(depTaskContext);
    assert.ok(prereqTaskContext);

    // Assert taskDependent.prerequisiteRefs contains ONLY the valid prerequisite task ref
    assert.deepEqual(depTaskContext.prerequisiteRefs, [prereqTaskContext.ref]);
  });

  it("12. Context building performs ZERO database mutations", async () => {
    const ms = await Milestone.create({
      owner: userAId,
      projectId: projectAId,
      title: "Test MS",
      position: 1,
    });

    const task = await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Test Task",
      status: "todo",
    });

    const act = await Activity.create({
      owner: userAId,
      actorId: userAId,
      type: ACTIVITY_TYPES.TASK_CREATED,
      entityType: "task",
      entityId: task._id,
      projectId: projectAId,
      contextProjectIds: [projectAId],
      metadata: { title: "Test Task" },
    });

    // Capture pre-snapshots
    const preProject = await Project.findById(projectAId).lean();
    const preTask = await Task.findById(task._id).lean();
    const preMs = await Milestone.findById(ms._id).lean();
    const preAct = await Activity.findById(act._id).lean();
    const preTaskCount = await Task.countDocuments();

    // Execute context building
    await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    // Capture post-snapshots
    const postProject = await Project.findById(projectAId).lean();
    const postTask = await Task.findById(task._id).lean();
    const postMs = await Milestone.findById(ms._id).lean();
    const postAct = await Activity.findById(act._id).lean();
    const postTaskCount = await Task.countDocuments();

    // Verify 100% deep structural equality
    assert.deepStrictEqual(postProject, preProject, "Project record must remain 100% unmutated");
    assert.deepStrictEqual(postTask, preTask, "Task record must remain 100% unmutated");
    assert.deepStrictEqual(postMs, preMs, "Milestone record must remain 100% unmutated");
    assert.deepStrictEqual(postAct, preAct, "Activity record must remain 100% unmutated");
    assert.equal(postTaskCount, preTaskCount, "Collection document counts must remain unmutated");
  });

  it("13. Budgeting caps tasks at 40 max and correctly sets truncation metadata (WP-02)", async () => {
    const taskDocs = [];
    for (let i = 1; i <= 45; i++) {
      taskDocs.push({
        owner: userAId,
        projectId: projectAId,
        title: `Task Bulk ${i}`,
        status: "todo",
        position: i,
      });
    }
    await Task.insertMany(taskDocs);

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    assert.equal(result.context.tasks.length, 40);
    assert.equal(result.context.truncation.totalTasks, 45);
    assert.equal(result.context.truncation.includedTasks, 40);
    assert.equal(result.context.truncation.isTruncated, true);

    // Verify task refs have no gaps (task_1 ... task_40)
    assert.equal(result.context.tasks[0]!.ref, "task_1");
    assert.equal(result.context.tasks[39]!.ref, "task_40");

    // Verify symbolic map contains task_40 but NOT task_41
    assert.ok(result.symbolicMap["task_40"]);
    assert.equal(result.symbolicMap["task_41"], undefined);
  });

  it("14. Completed tasks are capped at 10 max (WP-02)", async () => {
    const completedTasks = [];
    for (let i = 1; i <= 15; i++) {
      completedTasks.push({
        owner: userAId,
        projectId: projectAId,
        title: `Completed Task ${i}`,
        status: "done",
        completedAt: new Date(Date.now() - i * 1000),
        position: i,
      });
    }
    await Task.insertMany(completedTasks);

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    assert.equal(result.context.tasks.length, 10);
    assert.equal(result.context.truncation.totalTasks, 15);
    assert.equal(result.context.truncation.includedTasks, 10);
    assert.equal(result.context.truncation.isTruncated, true);
  });

  it("15. Milestones are capped at 5 max and activities at 10 max (WP-02)", async () => {
    const milestones = [];
    for (let i = 1; i <= 8; i++) {
      milestones.push({
        owner: userAId,
        projectId: projectAId,
        title: `Milestone ${i}`,
        position: i,
      });
    }
    await Milestone.insertMany(milestones);

    const activities = [];
    for (let i = 1; i <= 15; i++) {
      activities.push({
        owner: userAId,
        actorId: userAId,
        type: ACTIVITY_TYPES.TASK_UPDATED,
        entityType: "task",
        entityId: projectAId, // dummy ObjectId
        projectId: projectAId,
        contextProjectIds: [projectAId],
        metadata: { title: `Task ${i}` },
      });
    }
    await Activity.insertMany(activities);

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    assert.equal(result.context.milestones.length, 5);
    assert.equal(result.context.truncation.totalMilestones, 8);
    assert.equal(result.context.truncation.includedMilestones, 5);

    assert.equal(result.context.recentActivity.length, 10);
    assert.equal(result.context.truncation.totalActivity, 15);
    assert.equal(result.context.truncation.includedActivity, 10);

    assert.equal(result.context.truncation.isTruncated, true);
    assert.equal(result.context.milestones[4]!.ref, "ms_5");
    assert.equal(result.symbolicMap["ms_6"], undefined);
  });

  it("16. Prerequisite dependencies and milestone assignments to excluded entities become null/omitted (WP-02)", async () => {
    const milestones = [];
    for (let i = 1; i <= 6; i++) {
      milestones.push({
        owner: userAId,
        projectId: projectAId,
        title: `Milestone ${i}`,
        position: i,
      });
    }
    const createdMilestones = await Milestone.insertMany(milestones);
    const ms6 = createdMilestones[5]!;

    // Create 42 tasks so task #42 is excluded
    const tasks = [];
    for (let i = 1; i <= 42; i++) {
      tasks.push({
        owner: userAId,
        projectId: projectAId,
        title: `Bulk Task ${i}`,
        status: "todo",
        position: i,
      });
    }
    const createdTasks = await Task.insertMany(tasks);
    const task42 = createdTasks[41]!;

    // Dependent task pointing to task #42 (excluded) and milestone #6 (excluded)
    await Task.create({
      owner: userAId,
      projectId: projectAId,
      title: "Task Depending On Excluded Task and Milestone",
      status: "todo",
      priority: "urgent",
      position: 1,
      dependencies: [task42._id],
      milestoneId: ms6._id,
    });

    const result = await buildCopilotContext({
      projectId: projectAId.toString(),
      userId: userAId.toString(),
    });

    const targetTask = result.context.tasks.find(
      (t) => t.title === "Task Depending On Excluded Task and Milestone"
    );
    assert.ok(targetTask);
    assert.deepStrictEqual(targetTask.prerequisiteRefs, [], "Prerequisite ref to excluded task must be omitted");
    assert.equal(targetTask.milestoneRef, null, "Milestone ref to excluded milestone must be null");
  });
});
