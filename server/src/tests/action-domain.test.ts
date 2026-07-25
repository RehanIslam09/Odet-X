import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ActionRegistry,
  ProposedActionSchema,
  CreateTaskPayloadSchema,
  UpdateTaskStatusPayloadSchema,
  UpdateTaskPriorityPayloadSchema,
  UpdateTaskDueDatePayloadSchema,
  AddTaskLabelPayloadSchema,
  ActionHandler,
  ActionContext,
  DryRunResult,
  ExecutionResult,
  ProposedAction,
  AllowedActionType,
} from "../ai/actions/index.js";

describe("Phase 28 — Action Domain Foundation Unit Tests (WP-01)", () => {
  // -------------------------------------------------------------------------
  // 1. Individual Action Payload Schemas
  // -------------------------------------------------------------------------

  describe("Individual Payload Schemas", () => {
    it("validates CREATE_TASK payload successfully", () => {
      const validPayload = {
        action: "CREATE_TASK",
        targetRef: "project",
        arguments: {
          title: "Setup CI/CD Pipeline",
          description: "Configure GitHub Actions workflow",
          status: "todo",
          priority: "high",
          dueDate: "2026-12-31T23:59:59.000Z",
          labels: ["devops", "ci"],
        },
        explanation: "Automating builds improves delivery velocity.",
      };

      const parsed = CreateTaskPayloadSchema.parse(validPayload);
      assert.equal(parsed.action, "CREATE_TASK");
      assert.equal(parsed.targetRef, "project");
      assert.equal(parsed.arguments.title, "Setup CI/CD Pipeline");
      assert.equal(parsed.arguments.priority, "high");
      assert.deepStrictEqual(parsed.arguments.labels, ["devops", "ci"]);
    });

    it("applies default values for optional CREATE_TASK arguments", () => {
      const minimalPayload = {
        action: "CREATE_TASK",
        targetRef: "project",
        arguments: {
          title: "Write documentation",
        },
        explanation: "Docs are essential.",
      };

      const parsed = CreateTaskPayloadSchema.parse(minimalPayload);
      assert.equal(parsed.arguments.description, "");
      assert.equal(parsed.arguments.status, "todo");
      assert.equal(parsed.arguments.priority, "medium");
      assert.equal(parsed.arguments.dueDate, null);
      assert.deepStrictEqual(parsed.arguments.labels, []);
    });

    it("rejects CREATE_TASK with non-project targetRef", () => {
      const invalidPayload = {
        action: "CREATE_TASK",
        targetRef: "task_1", // Invalid, must be "project"
        arguments: { title: "Test" },
        explanation: "Test",
      };

      assert.throws(() => CreateTaskPayloadSchema.parse(invalidPayload));
    });

    it("validates UPDATE_TASK_STATUS payload successfully", () => {
      const validPayload = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "in_progress" },
        explanation: "Work on auth controller has started.",
      };

      const parsed = UpdateTaskStatusPayloadSchema.parse(validPayload);
      assert.equal(parsed.action, "UPDATE_TASK_STATUS");
      assert.equal(parsed.targetRef, "task_1");
      assert.equal(parsed.arguments.status, "in_progress");
    });

    it("rejects UPDATE_TASK_STATUS with invalid status enum", () => {
      const invalidPayload = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "finished" }, // Invalid enum
        explanation: "Finished work.",
      };

      assert.throws(() => UpdateTaskStatusPayloadSchema.parse(invalidPayload));
    });

    it("validates UPDATE_TASK_PRIORITY payload successfully", () => {
      const validPayload = {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_2",
        arguments: { priority: "urgent" },
        explanation: "Production outage blocker.",
      };

      const parsed = UpdateTaskPriorityPayloadSchema.parse(validPayload);
      assert.equal(parsed.action, "UPDATE_TASK_PRIORITY");
      assert.equal(parsed.targetRef, "task_2");
      assert.equal(parsed.arguments.priority, "urgent");
    });

    it("rejects UPDATE_TASK_PRIORITY with invalid priority enum", () => {
      const invalidPayload = {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_2",
        arguments: { priority: "critical" }, // Invalid enum
        explanation: "Needs immediate fix.",
      };

      assert.throws(() => UpdateTaskPriorityPayloadSchema.parse(invalidPayload));
    });

    it("validates UPDATE_TASK_DUE_DATE with ISO date string and null", () => {
      const validWithDate = {
        action: "UPDATE_TASK_DUE_DATE",
        targetRef: "task_3",
        arguments: { dueDate: "2026-08-15T12:00:00.000Z" },
        explanation: "Pushed target date to mid-August.",
      };

      const parsedDate = UpdateTaskDueDatePayloadSchema.parse(validWithDate);
      assert.equal(parsedDate.arguments.dueDate, "2026-08-15T12:00:00.000Z");

      const validWithNull = {
        action: "UPDATE_TASK_DUE_DATE",
        targetRef: "task_3",
        arguments: { dueDate: null },
        explanation: "Cleared due date.",
      };

      const parsedNull = UpdateTaskDueDatePayloadSchema.parse(validWithNull);
      assert.equal(parsedNull.arguments.dueDate, null);
    });

    it("rejects UPDATE_TASK_DUE_DATE with non-ISO date string", () => {
      const invalidPayload = {
        action: "UPDATE_TASK_DUE_DATE",
        targetRef: "task_3",
        arguments: { dueDate: "2026-13-45" }, // Invalid date string
        explanation: "Bad date.",
      };

      assert.throws(() => UpdateTaskDueDatePayloadSchema.parse(invalidPayload));
    });

    it("validates ADD_TASK_LABEL payload successfully", () => {
      const validPayload = {
        action: "ADD_TASK_LABEL",
        targetRef: "task_4",
        arguments: { label: "backend" },
        explanation: "Categorizing task under backend.",
      };

      const parsed = AddTaskLabelPayloadSchema.parse(validPayload);
      assert.equal(parsed.action, "ADD_TASK_LABEL");
      assert.equal(parsed.arguments.label, "backend");
    });

    it("rejects ADD_TASK_LABEL with empty or oversized label", () => {
      const emptyLabel = {
        action: "ADD_TASK_LABEL",
        targetRef: "task_4",
        arguments: { label: "   " },
        explanation: "Empty label test.",
      };
      assert.throws(() => AddTaskLabelPayloadSchema.parse(emptyLabel));

      const longLabel = {
        action: "ADD_TASK_LABEL",
        targetRef: "task_4",
        arguments: { label: "a".repeat(31) },
        explanation: "Oversized label test.",
      };
      assert.throws(() => AddTaskLabelPayloadSchema.parse(longLabel));
    });
  });

  // -------------------------------------------------------------------------
  // 2. Discriminated Union (ProposedActionSchema)
  // -------------------------------------------------------------------------

  describe("ProposedActionSchema Discriminated Union", () => {
    it("parses valid proposed actions across all 5 allowed types", () => {
      const actions = [
        {
          action: "CREATE_TASK",
          targetRef: "project",
          arguments: { title: "Task 1" },
          explanation: "Explanation 1",
        },
        {
          action: "UPDATE_TASK_STATUS",
          targetRef: "task_1",
          arguments: { status: "done" },
          explanation: "Explanation 2",
        },
        {
          action: "UPDATE_TASK_PRIORITY",
          targetRef: "task_2",
          arguments: { priority: "low" },
          explanation: "Explanation 3",
        },
        {
          action: "UPDATE_TASK_DUE_DATE",
          targetRef: "task_3",
          arguments: { dueDate: null },
          explanation: "Explanation 4",
        },
        {
          action: "ADD_TASK_LABEL",
          targetRef: "task_4",
          arguments: { label: "frontend" },
          explanation: "Explanation 5",
        },
      ];

      for (const raw of actions) {
        const parsed = ProposedActionSchema.parse(raw);
        assert.equal(parsed.action, raw.action);
      }
    });

    it("rejects blacklisted / destructive actions", () => {
      const forbiddenActions = [
        {
          action: "DELETE_PROJECT",
          targetRef: "project",
          explanation: "Malicious attempt to delete project",
        },
        {
          action: "DELETE_TASK",
          targetRef: "task_1",
          explanation: "Malicious attempt to delete task",
        },
        {
          action: "BULK_DELETE",
          targetRef: "project",
          explanation: "Malicious attempt to bulk delete",
        },
        {
          action: "USER_MANAGEMENT",
          targetRef: "project",
          explanation: "Privilege escalation attempt",
        },
      ];

      for (const forbidden of forbiddenActions) {
        assert.throws(() => ProposedActionSchema.parse(forbidden), /Invalid discriminator/);
      }
    });

    it("rejects actions missing explanation field", () => {
      const missingExplanation = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "done" },
      };

      assert.throws(() => ProposedActionSchema.parse(missingExplanation));
    });
  });

  // -------------------------------------------------------------------------
  // 3. ActionRegistry Unit Tests
  // -------------------------------------------------------------------------

  describe("ActionRegistry Unit Tests", () => {
    // Helper to create mock dummy handlers for testing
    const createDummyHandler = <T extends ProposedAction>(actionType: T["action"]): ActionHandler<T> => ({
      actionType,
      async dryRun(_context: ActionContext, action: T): Promise<DryRunResult> {
        return {
          actionType: actionType as AllowedActionType,
          target: { id: "mock_id", label: "Mock Label", type: "task" },
          diff: { before: {}, after: {} },
          explanation: action.explanation,
          expectedVersion: 1,
        };
      },
      async execute(_context: ActionContext, _action: T, _expectedVersion: number | null): Promise<ExecutionResult> {
        return {
          actionType: actionType as AllowedActionType,
          targetId: "mock_id",
          executedAt: new Date().toISOString(),
          updatedEntity: {},
        };
      },
    });

    it("registers and retrieves a handler with O(1) lookup", () => {
      const registry = new ActionRegistry();
      const priorityHandler = createDummyHandler("UPDATE_TASK_PRIORITY");

      registry.register(priorityHandler);

      assert.equal(registry.has("UPDATE_TASK_PRIORITY"), true);
      assert.equal(registry.get("UPDATE_TASK_PRIORITY"), priorityHandler);
      assert.deepStrictEqual(registry.registeredTypes(), ["UPDATE_TASK_PRIORITY"]);
    });

    it("throws error on duplicate registration attempt", () => {
      const registry = new ActionRegistry();
      const handler1 = createDummyHandler("CREATE_TASK");
      const handler2 = createDummyHandler("CREATE_TASK");

      registry.register(handler1);

      assert.throws(
        () => registry.register(handler2),
        (err: unknown) => (err as Error).message.includes("already registered")
      );
    });

    it("throws error on lookup of unknown / unregistered action type", () => {
      const registry = new ActionRegistry();

      assert.throws(
        () => registry.get("UPDATE_TASK_PRIORITY"),
        (err: unknown) => (err as Error).message.includes("Unsupported or unregistered")
      );
    });

    it("clears all handlers on clear() call", () => {
      const registry = new ActionRegistry();
      registry.register(createDummyHandler("ADD_TASK_LABEL"));
      assert.equal(registry.has("ADD_TASK_LABEL"), true);

      registry.clear();
      assert.equal(registry.has("ADD_TASK_LABEL"), false);
      assert.equal(registry.registeredTypes().length, 0);
    });
  });
});
