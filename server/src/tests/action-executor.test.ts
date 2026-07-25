import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { SymbolicEntityMapItem } from "../domain/copilot-context-builder.js";
import {
  ActionExecutor,
  ActionContext,
  ProposedAction,
  ProposedActionSchema,
} from "../ai/actions/index.js";

describe("Phase 28 — Action Executor & Handlers Unit Tests (WP-02)", () => {
  const executor = new ActionExecutor();

  let testUserId: string;
  let testProjectId: string;
  let testTaskId: string;
  let sampleContext: ActionContext;

  before(async () => {
    await setupTestDatabase();

    // Seed test user, project, task
    const user = await User.create({
      name: "Executor Test User",
      username: "executortestuser",
      email: "executor@example.com",
      password: "Password123!",
    });
    testUserId = user._id.toString();

    const project = await Project.create({
      owner: user._id,
      name: "SaaS Platform Project",
      description: "Core backend architecture",
    });
    testProjectId = project._id.toString();

    const task = await Task.create({
      owner: user._id,
      projectId: project._id,
      title: "Implement Auth Controller",
      description: "Build login and register endpoints",
      status: "todo",
      priority: "medium",
      dueDate: new Date("2026-09-01T00:00:00.000Z"),
      labels: ["auth", "backend"],
    });
    testTaskId = task._id.toString();

    const symbolicMap: Record<string, SymbolicEntityMapItem> = {
      project: {
        type: "project",
        id: testProjectId,
        label: project.name,
      },
      task_1: {
        type: "task",
        id: testTaskId,
        label: task.title,
      },
    };

    sampleContext = {
      userId: testUserId,
      projectId: testProjectId,
      symbolicMap,
    };
  });

  after(async () => {
    await teardownTestDatabase();
  });

  // -------------------------------------------------------------------------
  // 1. Validation & Boundary Handling
  // -------------------------------------------------------------------------

  describe("Validation & Error Boundaries", () => {
    it("rejects execution with invalid context", async () => {
      const action: ProposedAction = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "done" },
        explanation: "Test invalid context",
      };

      await assert.rejects(
        () => executor.dryRun(null as unknown as ActionContext, action),
        (err: unknown) => (err as Error).message.includes("Valid ActionContext is required")
      );

      await assert.rejects(
        () => executor.dryRun({ ...sampleContext, userId: "" }, action),
        (err: unknown) => (err as Error).message.includes("Valid userId is required")
      );
    });

    it("rejects dryRun for unknown / unmapped symbolic reference", async () => {
      const action: ProposedAction = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_999", // Not in symbolic map
        arguments: { status: "done" },
        explanation: "Test unmapped reference",
      };

      await assert.rejects(
        () => executor.dryRun(sampleContext, action),
        (err: unknown) => (err as Error).message.includes("Invalid or unmapped target task reference")
      );
    });

    it("rejects dryRun for blacklisted / invalid action payload", async () => {
      const invalidAction = {
        action: "DELETE_PROJECT",
        targetRef: "project",
        explanation: "Malicious action",
      } as unknown as ProposedAction;

      await assert.rejects(
        () => executor.dryRun(sampleContext, invalidAction),
        (err: unknown) => (err as Error).name === "ZodError"
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. Action Handlers DryRun Computation
  // -------------------------------------------------------------------------

  describe("Action Handlers DryRun Computation", () => {
    it("computes dryRun for CREATE_TASK action correctly", async () => {
      const action = ProposedActionSchema.parse({
        action: "CREATE_TASK",
        targetRef: "project",
        arguments: {
          title: "Build Landing Page",
          description: "Marketing site hero section",
          priority: "high",
          status: "todo",
          dueDate: "2026-10-01T00:00:00.000Z",
          labels: ["frontend"],
        },
        explanation: "New task required for marketing campaign.",
      });

      const result = await executor.dryRun(sampleContext, action);

      assert.equal(result.actionType, "CREATE_TASK");
      assert.equal(result.target.id, testProjectId);
      assert.equal(result.target.label, "SaaS Platform Project");
      assert.equal(result.target.type, "project");
      assert.equal(result.explanation, "New task required for marketing campaign.");
      assert.equal(result.expectedVersion, null);
      assert.deepStrictEqual(result.diff.before, {});
      assert.equal(result.diff.after.title, "Build Landing Page");
      assert.equal(result.diff.after.priority, "high");
    });

    it("computes dryRun for UPDATE_TASK_STATUS action correctly", async () => {
      const action: ProposedAction = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "in_progress" },
        explanation: "Starting development work.",
      };

      const result = await executor.dryRun(sampleContext, action);

      assert.equal(result.actionType, "UPDATE_TASK_STATUS");
      assert.equal(result.target.id, testTaskId);
      assert.equal(result.target.label, "Implement Auth Controller");
      assert.equal(result.target.type, "task");
      assert.deepStrictEqual(result.diff.before, { status: "todo" });
      assert.deepStrictEqual(result.diff.after, { status: "in_progress" });
      assert.equal(typeof result.expectedVersion, "number");
    });

    it("computes dryRun for UPDATE_TASK_PRIORITY action correctly", async () => {
      const action: ProposedAction = {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: { priority: "urgent" },
        explanation: "Urgent blocker.",
      };

      const result = await executor.dryRun(sampleContext, action);

      assert.equal(result.actionType, "UPDATE_TASK_PRIORITY");
      assert.equal(result.target.id, testTaskId);
      assert.deepStrictEqual(result.diff.before, { priority: "medium" });
      assert.deepStrictEqual(result.diff.after, { priority: "urgent" });
    });

    it("computes dryRun for UPDATE_TASK_DUE_DATE action correctly", async () => {
      const action: ProposedAction = {
        action: "UPDATE_TASK_DUE_DATE",
        targetRef: "task_1",
        arguments: { dueDate: "2026-11-15T00:00:00.000Z" },
        explanation: "Pushed due date to November.",
      };

      const result = await executor.dryRun(sampleContext, action);

      assert.equal(result.actionType, "UPDATE_TASK_DUE_DATE");
      assert.equal(result.target.id, testTaskId);
      assert.equal(result.diff.before.dueDate, "2026-09-01T00:00:00.000Z");
      assert.equal(result.diff.after.dueDate, "2026-11-15T00:00:00.000Z");
    });

    it("computes dryRun for ADD_TASK_LABEL action correctly", async () => {
      const action: ProposedAction = {
        action: "ADD_TASK_LABEL",
        targetRef: "task_1",
        arguments: { label: "security" },
        explanation: "Adding security tag.",
      };

      const result = await executor.dryRun(sampleContext, action);

      assert.equal(result.actionType, "ADD_TASK_LABEL");
      assert.equal(result.target.id, testTaskId);
      assert.deepStrictEqual(result.diff.before, { labels: ["auth", "backend"] });
      assert.deepStrictEqual(result.diff.after, { labels: ["auth", "backend", "security"] });
    });
  });

  // -------------------------------------------------------------------------
  // 3. Action Execution & Domain Service Delegation
  // -------------------------------------------------------------------------

  describe("Action Execution & Domain Service Delegation", () => {
    it("executes UPDATE_TASK_STATUS via task.service.ts", async () => {
      const action: ProposedAction = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "in_progress" },
        explanation: "Starting work.",
      };

      const result = await executor.execute(sampleContext, action);

      assert.equal(result.actionType, "UPDATE_TASK_STATUS");
      assert.equal(result.targetId, testTaskId);

      // Verify mutation in database via Task query
      const dbTask = await Task.findById(testTaskId);
      assert.equal(dbTask?.status, "in_progress");
    });

    it("executes CREATE_TASK via task.service.ts", async () => {
      const action = ProposedActionSchema.parse({
        action: "CREATE_TASK",
        targetRef: "project",
        arguments: {
          title: "New AI Task",
          priority: "high",
        },
        explanation: "Created via AI.",
      });

      const result = await executor.execute(sampleContext, action);

      assert.equal(result.actionType, "CREATE_TASK");
      assert.ok(result.targetId);

      const dbTask = await Task.findById(result.targetId);
      assert.equal(dbTask?.title, "New AI Task");
      assert.equal(dbTask?.priority, "high");
      assert.equal(dbTask?.projectId?.toString(), testProjectId);
    });
  });
});
