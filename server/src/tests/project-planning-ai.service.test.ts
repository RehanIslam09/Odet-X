import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import PlanDraft from "../models/plan-draft.model.js";
import { generateProjectPlan } from "../services/project-planning-ai.service.js";
import { aiService } from "../ai/ai.service.js";
import { promptRegistry } from "../ai/prompts/registry/prompt.registry.js";
import { initializeAI } from "../ai/init.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { BadRequestError, NotFoundError } from "../utils/app-error.js";

describe("ProjectPlanningAIService Integration Tests", () => {
  let userId: Types.ObjectId;
  let projectId: Types.ObjectId;
  let foreignUserId: Types.ObjectId;
  let archivedProjectId: Types.ObjectId;

  before(async () => {
    await setupTestDatabase();
    promptRegistry.clear();
    initializeAI();

    const user = await User.create({
      name: "Planning AI User",
      username: "planuser",
      email: "planuser@example.com",
      password: "Password123!",
    });
    userId = user._id;

    const foreignUser = await User.create({
      name: "Foreign User",
      username: "foreignuser",
      email: "foreignuser@example.com",
      password: "Password123!",
    });
    foreignUserId = foreignUser._id;

    const project = await Project.create({
      name: "Plan Target Project",
      description: "Build an MVP SaaS platform",
      owner: userId,
    });
    projectId = project._id;

    const archivedProject = await Project.create({
      name: "Archived Project",
      archived: true,
      owner: userId,
    });
    archivedProjectId = archivedProject._id;
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await Milestone.deleteMany({});
    await PlanDraft.deleteMany({});
  });

  it("1. Valid project plan generation persists PlanDraft and translates refs", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    (aiService as any).generateStructuredData = async () => ({
      data: {
        milestones: [
          {
            ref: "ms_alpha",
            title: "Phase 1: Backend Architecture",
            description: "Setup server and models",
            targetDate: "2026-09-01",
            position: 1,
          },
        ],
        tasks: [
          {
            ref: "task_auth",
            title: "Implement Authentication",
            description: "Setup JWT auth middleware",
            priority: "high",
            estimatedTime: "4h",
            position: 1,
            dependencies: [],
            milestoneRef: "ms_alpha",
          },
          {
            ref: "task_db",
            title: "Setup Database Schema",
            description: "Define Mongoose schemas",
            priority: "urgent",
            estimatedTime: "2h",
            position: 2,
            dependencies: ["task_auth"],
            milestoneRef: "ms_alpha",
          },
        ],
      },
      metadata: {
        executionId: "exec_test_1",
        provider: "mock-provider",
        model: "mock-model",
        tier: "deep-context",
        routingStrategy: "primary",
        attemptsCount: 1,
        fallbackOccurred: false,
        durationMs: 120,
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      },
    });

    try {
      const draft = await generateProjectPlan(
        projectId.toString(),
        userId.toString(),
        "Build authentication and database schemas"
      );

      assert.equal(draft.status, "draft");
      assert.equal(draft.tasks.length, 2);
      assert.equal(draft.milestones.length, 1);

      // Verify canonical server tempId normalization
      assert.equal(draft.tasks[0]?.tempId, "temp_task_1");
      assert.equal(draft.tasks[1]?.tempId, "temp_task_2");
      assert.equal(draft.milestones[0]?.tempId, "temp_ms_1");

      // Verify translated references
      assert.equal(draft.tasks[0]?.milestoneTempId, "temp_ms_1");
      assert.equal(draft.tasks[1]?.milestoneTempId, "temp_ms_1");
      assert.deepEqual(draft.tasks[1]?.dependencies, ["temp_task_1"]);
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("2. Rejects empty or oversized prompt (> 2000 chars) BEFORE calling AI", async () => {
    await assert.rejects(
      async () => {
        await generateProjectPlan(projectId.toString(), userId.toString(), "");
      },
      (err: any) => err instanceof BadRequestError && err.message.includes("cannot be empty")
    );

    await assert.rejects(
      async () => {
        await generateProjectPlan(projectId.toString(), userId.toString(), "A".repeat(2001));
      },
      (err: any) => err instanceof BadRequestError && err.message.includes("cannot exceed 2000 characters")
    );
  });

  it("3. Rejects missing, foreign-owner, or archived projects", async () => {
    const fakeProjectId = new Types.ObjectId().toString();

    // 404 Missing project
    await assert.rejects(
      async () => {
        await generateProjectPlan(fakeProjectId, userId.toString(), "Plan SaaS MVP");
      },
      (err: any) => err instanceof NotFoundError
    );

    // 404 Foreign owner project
    await assert.rejects(
      async () => {
        await generateProjectPlan(projectId.toString(), foreignUserId.toString(), "Plan SaaS MVP");
      },
      (err: any) => err instanceof NotFoundError
    );

    // 400 Archived project
    await assert.rejects(
      async () => {
        await generateProjectPlan(archivedProjectId.toString(), userId.toString(), "Plan SaaS MVP");
      },
      (err: any) => err instanceof BadRequestError && err.message.includes("archived project")
    );
  });

  it("4. Active draft replacement: New plan discards existing active draft", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    (aiService as any).generateStructuredData = async () => ({
      data: {
        milestones: [],
        tasks: [{ ref: "t1", title: "Task 1", position: 1, dependencies: [] }],
      },
      metadata: {
        executionId: "exec_test_2",
        provider: "mock-provider",
        model: "mock-model",
        tier: "deep-context",
        routingStrategy: "primary",
        attemptsCount: 1,
        fallbackOccurred: false,
        durationMs: 80,
        tokenUsage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
      },
    });

    try {
      // First draft creation
      const draft1 = await generateProjectPlan(
        projectId.toString(),
        userId.toString(),
        "First planning request"
      );
      assert.equal(draft1.status, "draft");

      // Second draft creation
      const draft2 = await generateProjectPlan(
        projectId.toString(),
        userId.toString(),
        "Second planning request"
      );
      assert.equal(draft2.status, "draft");

      // Verify draft1 status transitioned to 'discarded'
      const updatedDraft1 = await PlanDraft.findById(draft1._id);
      assert.equal(updatedDraft1?.status, "discarded");
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("5. DAG Cycle in AI output prevents PlanDraft persistence and preserves old draft", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);

    // First setup a valid existing active draft
    (aiService as any).generateStructuredData = async () => ({
      data: {
        milestones: [],
        tasks: [{ ref: "valid_t1", title: "Valid Task 1", position: 1, dependencies: [] }],
      },
      metadata: { durationMs: 50 },
    });

    const initialDraft = await generateProjectPlan(
      projectId.toString(),
      userId.toString(),
      "Initial valid draft"
    );

    // Now return a cyclic AI plan
    (aiService as any).generateStructuredData = async () => ({
      data: {
        milestones: [],
        tasks: [
          { ref: "t1", title: "Task 1", position: 1, dependencies: ["t2"] },
          { ref: "t2", title: "Task 2", position: 2, dependencies: ["t1"] },
        ],
      },
      metadata: { durationMs: 50 },
    });

    try {
      await assert.rejects(
        async () => {
          await generateProjectPlan(
            projectId.toString(),
            userId.toString(),
            "Cyclic plan request"
          );
        },
        (err: any) => err instanceof BadRequestError && err.message.includes("Dependency cycle detected")
      );

      // Verify initial draft was preserved as 'draft'
      const preservedDraft = await PlanDraft.findById(initialDraft._id);
      assert.equal(preservedDraft?.status, "draft");
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("6. PERMANENT MUTATION SAFETY REGRESSION TEST: Zero Task or Milestone documents created during plan generation", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    (aiService as any).generateStructuredData = async () => ({
      data: {
        milestones: [{ ref: "ms1", title: "M1", position: 1 }],
        tasks: [{ ref: "t1", title: "Task 1", position: 1, dependencies: [], milestoneRef: "ms1" }],
      },
      metadata: { durationMs: 50 },
    });

    try {
      const taskCountBefore = await Task.countDocuments({ projectId });
      const milestoneCountBefore = await Milestone.countDocuments({ projectId });
      const draftCountBefore = await PlanDraft.countDocuments({ projectId });

      assert.equal(taskCountBefore, 0);
      assert.equal(milestoneCountBefore, 0);

      await generateProjectPlan(
        projectId.toString(),
        userId.toString(),
        "Plan generation test"
      );

      const taskCountAfter = await Task.countDocuments({ projectId });
      const milestoneCountAfter = await Milestone.countDocuments({ projectId });
      const draftCountAfter = await PlanDraft.countDocuments({ projectId });

      // Core Safety Invariant Assertion
      assert.equal(taskCountAfter, 0, "PERMANENT MUTATION SAFETY VIOLATION: Tasks were created!");
      assert.equal(milestoneCountAfter, 0, "PERMANENT MUTATION SAFETY VIOLATION: Milestones were created!");
      assert.equal(draftCountAfter, draftCountBefore + 1, "PlanDraft document should be created.");
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });
});
