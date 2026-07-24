import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose, { Types } from "mongoose";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import PlanDraft from "../models/plan-draft.model.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { deleteTask } from "../services/task.service.js";
import { ConflictError } from "../utils/app-error.js";

describe("Planning Domain Models & Prerequisite Guard Integration Tests", () => {
  let userId: Types.ObjectId;
  let projectId: Types.ObjectId;

  before(async () => {
    await setupTestDatabase();

    const user = await User.create({
      name: "Planning Test User",
      username: "planner",
      email: "planner@example.com",
      password: "Password123!",
    });
    userId = user._id;

    const project = await Project.create({
      name: "Planning Test Project",
      owner: userId,
    });
    projectId = project._id;
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await Milestone.deleteMany({});
    await PlanDraft.deleteMany({});
  });

  // --- TASK MODEL EXTENSIONS ---

  it("Task Model: Default planning fields (dependencies = [], position = 1, milestoneId = null)", async () => {
    const task = await Task.create({
      owner: userId,
      title: "Simple Task",
    });

    assert.deepEqual(task.dependencies, []);
    assert.equal(task.position, 1);
    assert.equal(task.milestoneId, null);

    const json = task.toJSON();
    assert.deepEqual(json.dependencies, []);
    assert.equal(json.position, 1);
    assert.equal(json.milestoneId, null);
  });

  it("Task Model: Extended planning fields persist correctly", async () => {
    const ms = await Milestone.create({
      owner: userId,
      projectId,
      title: "Target Milestone",
    });

    const prereq = await Task.create({
      owner: userId,
      projectId,
      title: "Prerequisite Task",
    });

    const task = await Task.create({
      owner: userId,
      projectId,
      title: "Dependent Task",
      dependencies: [prereq._id],
      position: 2,
      milestoneId: ms._id,
    });

    assert.equal(task.dependencies.length, 1);
    assert.equal(task.dependencies[0]?.toString(), prereq._id.toString());
    assert.equal(task.position, 2);
    assert.equal(task.milestoneId?.toString(), ms._id.toString());
  });

  it("Task Model: Invalid position (< 1 or non-integer) is rejected", async () => {
    await assert.rejects(
      async () => {
        await Task.create({
          owner: userId,
          title: "Invalid Position Task",
          position: 0,
        });
      },
      (err: any) => err instanceof mongoose.Error.ValidationError
    );

    await assert.rejects(
      async () => {
        await Task.create({
          owner: userId,
          title: "Invalid Position Task 2",
          position: 1.5,
        });
      },
      (err: any) => err instanceof mongoose.Error.ValidationError
    );
  });

  // --- MILESTONE MODEL ---

  it("Milestone Model: Valid milestone persists with default values", async () => {
    const ms = await Milestone.create({
      owner: userId,
      projectId,
      title: "Phase 1 Launch",
    });

    assert.equal(ms.title, "Phase 1 Launch");
    assert.equal(ms.description, "");
    assert.equal(ms.targetDate, null);
    assert.equal(ms.position, 1);
    assert.equal(ms.isDeleted, false);
    assert.ok(ms.createdAt instanceof Date);
    assert.ok(ms.updatedAt instanceof Date);
  });

  it("Milestone Model: Validates required owner, projectId, and title max length", async () => {
    await assert.rejects(
      async () => {
        await Milestone.create({
          projectId,
          title: "No Owner Milestone",
        });
      },
      (err: any) => err instanceof mongoose.Error.ValidationError
    );

    await assert.rejects(
      async () => {
        await Milestone.create({
          owner: userId,
          projectId,
          title: "A".repeat(121),
        });
      },
      (err: any) => err instanceof mongoose.Error.ValidationError
    );
  });

  // --- PLAN DRAFT MODEL ---

  it("PlanDraft Model: Valid plan draft persists with defaults and TTL", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      promptDescription: "Create a SaaS web app with authentication and billing",
      expiresAt,
      tasks: [
        {
          tempId: "t1",
          title: "Setup Auth",
          description: "Setup JWT auth",
          priority: "high",
          position: 1,
          dependencies: [],
          milestoneTempId: null,
        },
      ],
      milestones: [],
    });

    assert.equal(draft.status, "draft");
    assert.equal(draft.tasks.length, 1);
    assert.equal(draft.tasks[0]?.tempId, "t1");
    assert.equal(draft.tasks[0]?.priority, "high");
    assert.ok(draft.expiresAt instanceof Date);
  });

  it("PlanDraft Model: Rejects tasks exceeding PLAN_MAX_TASKS (25)", async () => {
    const tasks = Array.from({ length: 26 }, (_, i) => ({
      tempId: `t${i + 1}`,
      title: `Task ${i + 1}`,
      position: i + 1,
      dependencies: [],
    }));

    await assert.rejects(
      async () => {
        await PlanDraft.create({
          owner: userId,
          projectId,
          promptDescription: "Over capacity test",
          expiresAt: new Date(),
          tasks,
        });
      },
      (err: any) => err instanceof mongoose.Error.ValidationError
    );
  });

  it("PlanDraft Model: Partial unique index prevents multiple active drafts per project", async () => {
    const expiresAt = new Date(Date.now() + 86400000);

    await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Draft 1",
      expiresAt,
    });

    await assert.rejects(
      async () => {
        await PlanDraft.create({
          owner: userId,
          projectId,
          status: "draft",
          promptDescription: "Draft 2",
          expiresAt,
        });
      },
      (err: any) => err.code === 11000 // Duplicate key error
    );
  });

  // --- DEPENDENCY DELETION GUARD ---

  it("Prerequisite Guard: Unreferenced task can be soft deleted cleanly", async () => {
    const task = await Task.create({
      owner: userId,
      projectId,
      title: "Independent Task",
    });

    await deleteTask(task._id.toString(), userId.toString());

    const fetched = await Task.findById(task._id);
    assert.equal(fetched?.isDeleted, true);
  });

  it("Prerequisite Guard: Task referenced as prerequisite by an active task cannot be deleted", async () => {
    const prereq = await Task.create({
      owner: userId,
      projectId,
      title: "Prerequisite Task",
    });

    const dependent = await Task.create({
      owner: userId,
      projectId,
      title: "Dependent Task",
      dependencies: [prereq._id],
    });

    await assert.rejects(
      async () => {
        await deleteTask(prereq._id.toString(), userId.toString());
      },
      (err: any) => err instanceof ConflictError && err.message.includes("is a prerequisite for 1 active task(s)")
    );

    // Soft deleting dependent task unblocks prerequisite task deletion
    dependent.isDeleted = true;
    await dependent.save();

    await deleteTask(prereq._id.toString(), userId.toString());
    const fetchedPrereq = await Task.findById(prereq._id);
    assert.equal(fetchedPrereq?.isDeleted, true);
  });
});
