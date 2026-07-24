import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose, { Types } from "mongoose";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import PlanDraft from "../models/plan-draft.model.js";
import Activity from "../models/activity.model.js";
import { commitPlan } from "../services/plan-commit.service.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { BadRequestError, NotFoundError } from "../utils/app-error.js";
import { ACTIVITY_TYPES } from "../constants/activity.js";

describe("PlanCommitService Integration & Safety Tests", () => {
  let userId: Types.ObjectId;
  let projectId: Types.ObjectId;
  let foreignUserId: Types.ObjectId;
  let archivedProjectId: Types.ObjectId;
  let deletedProjectId: Types.ObjectId;

  before(async () => {
    await setupTestDatabase();

    const user = await User.create({
      name: "Commit Test User",
      username: "commituser",
      email: "commituser@example.com",
      password: "Password123!",
    });
    userId = user._id;

    const foreignUser = await User.create({
      name: "Commit Foreign User",
      username: "commitforeign",
      email: "commitforeign@example.com",
      password: "Password123!",
    });
    foreignUserId = foreignUser._id;

    const project = await Project.create({
      name: "Commit Target Project",
      owner: userId,
    });
    projectId = project._id;

    const archivedProject = await Project.create({
      name: "Archived Commit Project",
      archived: true,
      owner: userId,
    });
    archivedProjectId = archivedProject._id;

    const deletedProject = await Project.create({
      name: "Deleted Commit Project",
      isDeleted: true,
      owner: userId,
    });
    deletedProjectId = deletedProject._id;
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await Milestone.deleteMany({});
    await PlanDraft.deleteMany({});
    await Activity.deleteMany({});
  });

  it("1. SUCCESS PATH: Commits draft with forward references, milestone assignments, and null milestones", async () => {
    const expiresAt = new Date(Date.now() + 86400000);
    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Commit full plan test",
      expiresAt,
      milestones: [
        { tempId: "temp_ms_1", title: "Milestone 1", description: "M1 desc", position: 1 },
        { tempId: "temp_ms_2", title: "Milestone 2", description: "M2 desc", position: 2 },
      ],
      tasks: [
        // Task 1 has a FORWARD REFERENCE to temp_task_3 (Task 1 depends on Task 3)
        { tempId: "temp_task_1", title: "Task 1 (Depends on 3)", priority: "high", position: 1, dependencies: ["temp_task_3"], milestoneTempId: "temp_ms_1" },
        { tempId: "temp_task_2", title: "Task 2 (Depends on 1)", priority: "urgent", position: 2, dependencies: ["temp_task_1"], milestoneTempId: "temp_ms_1" },
        { tempId: "temp_task_3", title: "Task 3 (Prerequisite)", priority: "low", position: 3, dependencies: [], milestoneTempId: "temp_ms_2" },
        { tempId: "temp_task_4", title: "Task 4 (No Milestone)", priority: "none", position: 4, dependencies: [], milestoneTempId: null },
      ],
    });

    const result = await commitPlan(userId.toString(), projectId.toString(), draft._id.toString());

    assert.equal(result.taskCount, 4);
    assert.equal(result.milestoneCount, 2);

    // Verify draft status transition to 'committed'
    const updatedDraft = await PlanDraft.findById(draft._id);
    assert.equal(updatedDraft?.status, "committed");

    // Verify permanent Milestone records in MongoDB
    const milestones = await Milestone.find({ projectId }).sort({ position: 1 });
    assert.equal(milestones.length, 2);
    assert.equal(milestones[0]?.title, "Milestone 1");
    assert.equal(milestones[1]?.title, "Milestone 2");

    // Verify permanent Task records in MongoDB
    const tasks = await Task.find({ projectId }).sort({ position: 1 });
    assert.equal(tasks.length, 4);

    const task1 = tasks.find((t) => t.title.includes("Task 1"));
    const task2 = tasks.find((t) => t.title.includes("Task 2"));
    const task3 = tasks.find((t) => t.title.includes("Task 3"));
    const task4 = tasks.find((t) => t.title.includes("Task 4"));

    assert.ok(task1 && task2 && task3 && task4);

    // Verify Forward Reference Translation & ObjectIds
    assert.equal(task1.dependencies.length, 1);
    assert.equal(task1.dependencies[0]?.toString(), task3._id.toString());
    assert.equal(task2.dependencies[0]?.toString(), task1._id.toString());

    // Verify Dependency Direction: Task 1 depends on Task 3 -> Task 1.dependencies contains Task 3._id, NOT vice versa
    assert.deepEqual(task3.dependencies, []);

    // Verify Milestone ObjectIds
    assert.equal(task1.milestoneId?.toString(), milestones[0]?._id.toString());
    assert.equal(task3.milestoneId?.toString(), milestones[1]?._id.toString());
    assert.equal(task4.milestoneId, null);

    // Verify 0 string tempIds survive in ObjectIds
    assert.ok(task1._id instanceof mongoose.Types.ObjectId);
    assert.ok(task1.dependencies[0] instanceof mongoose.Types.ObjectId);

    // Verify AI_PLAN_COMMITTED Activity Audit
    const activities = await Activity.find({ owner: userId, type: ACTIVITY_TYPES.AI_PLAN_COMMITTED });
    assert.equal(activities.length, 1);
    assert.equal(activities[0]?.metadata.draftId, draft._id.toString());
    assert.equal(activities[0]?.metadata.committedTaskCount, 4);
    assert.equal(activities[0]?.metadata.committedMilestoneCount, 2);
  });

  it("2. IDEMPOTENCY & REPLAY PROTECTION: Already committed, discarded, or expired drafts reject commit", async () => {
    const expiresAt = new Date(Date.now() + 86400000);

    // 2a. Already committed draft
    const committedDraft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "committed",
      promptDescription: "Committed draft",
      expiresAt,
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: [] }],
    });

    await assert.rejects(
      async () => {
        await commitPlan(userId.toString(), projectId.toString(), committedDraft._id.toString());
      },
      (err: any) => err instanceof BadRequestError && err.message.includes("already been committed")
    );

    // 2b. Discarded draft
    const discardedDraft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "discarded",
      promptDescription: "Discarded draft",
      expiresAt,
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: [] }],
    });

    await assert.rejects(
      async () => {
        await commitPlan(userId.toString(), projectId.toString(), discardedDraft._id.toString());
      },
      (err: any) => err instanceof BadRequestError && err.message.includes("discarded draft plan")
    );

    // 2c. Expired draft
    const expiredDraft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Expired draft",
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: [] }],
    });

    await assert.rejects(
      async () => {
        await commitPlan(userId.toString(), projectId.toString(), expiredDraft._id.toString());
      },
      (err: any) => err instanceof BadRequestError && err.message.includes("expired")
    );

    // Assert zero permanent tasks created by failed commit attempts
    const taskCount = await Task.countDocuments({ projectId });
    assert.equal(taskCount, 0);
  });

  it("3. BOUNDARY & AUTHORIZATION: Foreign owner, deleted project, or archived project rejects commit", async () => {
    const expiresAt = new Date(Date.now() + 86400000);

    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Auth test draft",
      expiresAt,
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: [] }],
    });

    // 3a. Foreign user commit attempt
    await assert.rejects(
      async () => {
        await commitPlan(foreignUserId.toString(), projectId.toString(), draft._id.toString());
      },
      (err: any) => err instanceof NotFoundError
    );

    // 3b. Archived project attempt
    const archivedDraft = await PlanDraft.create({
      owner: userId,
      projectId: archivedProjectId,
      status: "draft",
      promptDescription: "Archived project draft",
      expiresAt,
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: [] }],
    });

    await assert.rejects(
      async () => {
        await commitPlan(userId.toString(), archivedProjectId.toString(), archivedDraft._id.toString());
      },
      (err: any) => err instanceof BadRequestError && err.message.includes("archived project")
    );

    // 3c. Deleted project attempt
    const deletedDraft = await PlanDraft.create({
      owner: userId,
      projectId: deletedProjectId,
      status: "draft",
      promptDescription: "Deleted project draft",
      expiresAt,
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: [] }],
    });

    await assert.rejects(
      async () => {
        await commitPlan(userId.toString(), deletedProjectId.toString(), deletedDraft._id.toString());
      },
      (err: any) => err instanceof NotFoundError
    );
  });

  it("4. PRESERVATION & COMPENSATING CLEANUP: Pre-existing tasks/milestones survive failed commit attempt", async () => {
    // 4a. Setup pre-existing Task and Milestone
    const preExistingMilestone = await Milestone.create({
      owner: userId,
      projectId,
      title: "Pre-existing Milestone",
    });

    const preExistingTask = await Task.create({
      owner: userId,
      projectId,
      title: "Pre-existing Task",
    });

    // 4b. Create valid draft
    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Draft to simulate write failure",
      expiresAt: new Date(Date.now() + 86400000),
      milestones: [{ tempId: "m1", title: "New Milestone", position: 1 }],
      tasks: [{ tempId: "t1", title: "New Task", position: 1, dependencies: [] }],
    });

    // Mock Task.insertMany to throw an error during task insertion (after milestones were inserted)
    const originalInsertMany = Task.insertMany.bind(Task);
    (Task as any).insertMany = async () => {
      throw new Error("Simulated database write failure during task insertion");
    };

    try {
      await assert.rejects(
        async () => {
          await commitPlan(userId.toString(), projectId.toString(), draft._id.toString());
        },
        (err: any) => err.message.includes("Simulated database write failure")
      );
    } finally {
      Task.insertMany = originalInsertMany;
    }

    // 4c. Verify pre-existing data was 100% PRESERVED
    const currentTasks = await Task.find({ projectId });
    const currentMilestones = await Milestone.find({ projectId });

    assert.equal(currentTasks.length, 1);
    assert.equal(currentTasks[0]?._id.toString(), preExistingTask._id.toString());

    assert.equal(currentMilestones.length, 1);
    assert.equal(currentMilestones[0]?._id.toString(), preExistingMilestone._id.toString());

    // Verify draft status remained 'draft'
    const unchangedDraft = await PlanDraft.findById(draft._id);
    assert.equal(unchangedDraft?.status, "draft");
  });

  it("5. CARDINALITY BOUNDARY: Commits a maximum boundary plan (25 tasks, 5 milestones)", async () => {
    const milestones = Array.from({ length: 5 }, (_, i) => ({
      tempId: `temp_ms_${i + 1}`,
      title: `Milestone ${i + 1}`,
      position: i + 1,
    }));

    const tasks = Array.from({ length: 25 }, (_, i) => ({
      tempId: `temp_task_${i + 1}`,
      title: `Task ${i + 1}`,
      position: i + 1,
      dependencies: i > 0 ? [`temp_task_${i}`] : [],
      milestoneTempId: `temp_ms_${(i % 5) + 1}`,
    }));

    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Boundary 25-task plan",
      expiresAt: new Date(Date.now() + 86400000),
      milestones,
      tasks,
    });

    const result = await commitPlan(userId.toString(), projectId.toString(), draft._id.toString());

    assert.equal(result.taskCount, 25);
    assert.equal(result.milestoneCount, 5);

    const createdTasks = await Task.find({ projectId });
    const createdMilestones = await Milestone.find({ projectId });

    assert.equal(createdTasks.length, 25);
    assert.equal(createdMilestones.length, 5);
  });
});
