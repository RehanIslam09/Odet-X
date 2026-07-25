import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import {
  generateConfirmationToken,
  verifyConfirmationToken,
} from "../utils/copilot-action-token.js";
import { nonceStore } from "../utils/nonce-store.js";
import {
  performActionDryRun,
  confirmAction,
} from "../services/copilot-action.service.js";
import { ProposedAction, ProposedActionSchema } from "../ai/actions/action.types.js";

describe("Phase 28 — Backend Confirmation Pipeline & API Tests (WP-03)", () => {
  let userAId: string;
  let userBId: string;
  let projectAId: string;
  let projectBId: string;
  let taskAId: string;

  before(async () => {
    await setupTestDatabase();

    const userA = await User.create({
      name: "User Alpha",
      username: "useralpha_wp3",
      email: "useralpha_wp3@example.com",
      password: "Password123!",
    });
    userAId = userA._id.toString();

    const userB = await User.create({
      name: "User Beta",
      username: "userbeta_wp3",
      email: "userbeta_wp3@example.com",
      password: "Password123!",
    });
    userBId = userB._id.toString();

    const projectA = await Project.create({
      owner: userA._id,
      name: "Alpha Web Application",
      description: "Primary user project",
    });
    projectAId = projectA._id.toString();

    const projectB = await Project.create({
      owner: userB._id,
      name: "Beta System Services",
      description: "Secondary user project",
    });
    projectBId = projectB._id.toString();

    const taskA = await Task.create({
      owner: userA._id,
      projectId: projectA._id,
      title: "Optimize Mongo Indexes",
      status: "todo",
      priority: "medium",
      dueDate: new Date("2026-09-01T00:00:00.000Z"),
      labels: ["database"],
    });
    taskAId = taskA._id.toString();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    nonceStore.clear();
  });

  // -------------------------------------------------------------------------
  // 1. Confirmation Token Utility Unit Tests
  // -------------------------------------------------------------------------

  describe("Cryptographic Confirmation Token Unit Tests", () => {
    it("generates and verifies a valid confirmation token", () => {
      const { token, expiresAt, nonce } = generateConfirmationToken({
        actionType: "UPDATE_TASK_PRIORITY",
        projectId: projectAId,
        userId: userAId,
        targetId: taskAId,
        targetRef: "task_1",
        expectedVersion: 0,
        arguments: { priority: "high" },
        explanation: "Critical performance task.",
      });

      assert.ok(token.includes("."));
      assert.ok(expiresAt);
      assert.ok(nonce);

      const payload = verifyConfirmationToken(token);
      assert.equal(payload.actionType, "UPDATE_TASK_PRIORITY");
      assert.equal(payload.projectId, projectAId);
      assert.equal(payload.userId, userAId);
      assert.equal(payload.targetId, taskAId);
      assert.equal(payload.expectedVersion, 0);
      assert.equal(payload.arguments.priority, "high");
    });

    it("rejects tampered token signature", () => {
      const { token } = generateConfirmationToken({
        actionType: "UPDATE_TASK_PRIORITY",
        projectId: projectAId,
        userId: userAId,
        targetId: taskAId,
        targetRef: "task_1",
        expectedVersion: 0,
        arguments: { priority: "high" },
        explanation: "Test",
      });

      const parts = token.split(".");
      const tamperedToken = `${parts[0]}.invalid_signature_hash`;

      assert.rejects(
        async () => verifyConfirmationToken(tamperedToken),
        (err: unknown) => (err as Error).message.includes("Invalid or tampered")
      );
    });

    it("rejects malformed token strings", () => {
      assert.rejects(
        async () => verifyConfirmationToken("not_a_valid_token"),
        (err: unknown) => (err as Error).message.includes("Invalid confirmation token format")
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. Nonce Replay Protection Unit Tests
  // -------------------------------------------------------------------------

  describe("Single-Use Nonce Replay Protection", () => {
    it("allows first consumption and rejects duplicate consumption (replay)", () => {
      const nonce = "unique_nonce_12345";
      assert.equal(nonceStore.consume(nonce), true);
      assert.equal(nonceStore.consume(nonce), false); // Replay attempt rejected
    });
  });

  // -------------------------------------------------------------------------
  // 3. Service Layer End-to-End Pipeline Tests
  // -------------------------------------------------------------------------

  describe("Action Pipeline End-to-End Tests", () => {
    it("1. Successful dry-run generates state diff and signed confirmation token", async () => {
      const proposedAction: ProposedAction = {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: { priority: "urgent" },
        explanation: "Blocks release candidate.",
      };

      const result = await performActionDryRun(userAId, projectAId, proposedAction);

      assert.ok(result.confirmationToken);
      assert.ok(result.expiresAt);
      assert.equal(result.dryRun.actionType, "UPDATE_TASK_PRIORITY");
      assert.equal(result.dryRun.target.id, taskAId);
      assert.deepStrictEqual(result.dryRun.diff.before, { priority: "medium" });
      assert.deepStrictEqual(result.dryRun.diff.after, { priority: "urgent" });
    });

    it("2. Successful action confirmation executes domain mutation", async () => {
      const proposedAction: ProposedAction = {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: { priority: "urgent" },
        explanation: "Blocks release candidate.",
      };

      const dryRunRes = await performActionDryRun(userAId, projectAId, proposedAction);

      const confirmRes = await confirmAction(userAId, dryRunRes.confirmationToken);
      assert.equal(confirmRes.actionType, "UPDATE_TASK_PRIORITY");
      assert.equal(confirmRes.targetId, taskAId);

      // Verify database state change
      const dbTask = await Task.findById(taskAId);
      assert.equal(dbTask?.priority, "urgent");
    });

    it("3. Replay attack attempt throws 409 Conflict", async () => {
      const proposedAction: ProposedAction = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "in_progress" },
        explanation: "Starting work.",
      };

      const dryRunRes = await performActionDryRun(userAId, projectAId, proposedAction);

      // First confirmation succeeds
      await confirmAction(userAId, dryRunRes.confirmationToken);

      // Replay attempt using identical token throws ConflictError
      await assert.rejects(
        () => confirmAction(userAId, dryRunRes.confirmationToken),
        (err: unknown) => (err as Error).message.includes("already been executed") || (err as Error).name === "ConflictError"
      );
    });

    it("4. OCC version mismatch throws 409 Conflict", async () => {
      const proposedAction: ProposedAction = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "done" },
        explanation: "Marking completed.",
      };

      const dryRunRes = await performActionDryRun(userAId, projectAId, proposedAction);

      // Simulate concurrent modification by another user/tab, incrementing task __v
      await Task.updateOne({ _id: taskAId }, { $inc: { __v: 1 }, $set: { title: "Concurrently Modified Title" } });

      // Confirm attempt with stale expectedVersion throws ConflictError
      await assert.rejects(
        () => confirmAction(userAId, dryRunRes.confirmationToken),
        (err: unknown) => (err as Error).message.includes("modified by another user") || (err as Error).name === "ConflictError"
      );
    });

    it("5. Confirmation by a different user throws 401 Unauthorized", async () => {
      const proposedAction: ProposedAction = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "done" },
        explanation: "Marking completed.",
      };

      const dryRunRes = await performActionDryRun(userAId, projectAId, proposedAction);

      // User B attempts to confirm User A's token
      await assert.rejects(
        () => confirmAction(userBId, dryRunRes.confirmationToken),
        (err: unknown) => (err as Error).message.includes("does not belong to the current authenticated user") || (err as Error).name === "UnauthorizedError"
      );
    });

    it("6. Dry-run for unauthorized project throws 404 NotFound", async () => {
      const proposedAction = ProposedActionSchema.parse({
        action: "CREATE_TASK",
        targetRef: "project",
        arguments: { title: "Cross-Tenant Task" },
        explanation: "Attempting to write to unowned project.",
      });

      // User A attempts dry-run against User B's projectBId
      await assert.rejects(
        () => performActionDryRun(userAId, projectBId, proposedAction),
        (err: unknown) => (err as Error).message.includes("Project not found") || (err as Error).name === "NotFoundError"
      );
    });
  });
});
