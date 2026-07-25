import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProjectCopilotResponseSchema } from "../ai/schemas/project-copilot.schema.js";
import { ProposedActionSchema } from "../ai/actions/action.types.js";

describe("Phase 28 — Action Proposal Validation Defect Fix (MANUAL TEST DEFECT 02)", () => {
  it("1. Capitalized priority string ('URGENT', 'Urgent', 'High') is normalized and valid", () => {
    const payload = {
      action: "UPDATE_TASK_PRIORITY",
      targetRef: "task_1",
      arguments: {
        priority: "URGENT",
      },
      explanation: "Urgent blocker fix",
    };

    const parsed = ProposedActionSchema.safeParse(payload);
    assert.equal(parsed.success, true);
    if (parsed.success && parsed.data.action === "UPDATE_TASK_PRIORITY") {
      assert.equal(parsed.data.arguments.priority, "urgent");
    }
  });

  it("2. Capitalized status string ('DONE', 'In_Progress') is normalized and valid", () => {
    const payload = {
      action: "UPDATE_TASK_STATUS",
      targetRef: "task_1",
      arguments: {
        status: "DONE",
      },
      explanation: "Task finished",
    };

    const parsed = ProposedActionSchema.safeParse(payload);
    assert.equal(parsed.success, true);
    if (parsed.success && parsed.data.action === "UPDATE_TASK_STATUS") {
      assert.equal(parsed.data.arguments.status, "done");
    }
  });

  it("3. Date-only ISO string ('2026-07-30') is preprocessed to valid datetime string", () => {
    const payload = {
      action: "UPDATE_TASK_DUE_DATE",
      targetRef: "task_1",
      arguments: {
        dueDate: "2026-07-30",
      },
      explanation: "Extending deadline",
    };

    const parsed = ProposedActionSchema.safeParse(payload);
    assert.equal(parsed.success, true);
    if (parsed.success && parsed.data.action === "UPDATE_TASK_DUE_DATE") {
      assert.equal(parsed.data.arguments.dueDate, "2026-07-30T00:00:00.000Z");
    }
  });

  it("4. Empty or missing explanation string is preprocessed to non-empty fallback explanation", () => {
    const payload = {
      action: "UPDATE_TASK_PRIORITY",
      targetRef: "task_1",
      arguments: {
        priority: "urgent",
      },
      explanation: "", // Empty string from model
    };

    const parsed = ProposedActionSchema.safeParse(payload);
    assert.equal(parsed.success, true);
    if (parsed.success && parsed.data.action === "UPDATE_TASK_PRIORITY") {
      assert.ok(parsed.data.explanation.length > 0);
      assert.equal(parsed.data.explanation, "Proposed task priority change per user request.");
    }
  });

  it("5. All 5 action types survive canonical validation in full Copilot envelope", () => {
    const actions = [
      {
        action: "CREATE_TASK",
        targetRef: "project",
        arguments: { title: "New Task" },
        explanation: "Creating task",
      },
      {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: { status: "in_progress" },
        explanation: "Updating status",
      },
      {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: { priority: "high" },
        explanation: "Updating priority",
      },
      {
        action: "UPDATE_TASK_DUE_DATE",
        targetRef: "task_1",
        arguments: { dueDate: null },
        explanation: "Clearing due date",
      },
      {
        action: "ADD_TASK_LABEL",
        targetRef: "task_1",
        arguments: { label: "backend" },
        explanation: "Adding label",
      },
    ];

    for (const act of actions) {
      const response = {
        answer: "Sample copilot answer.",
        references: [{ type: "task", ref: "task_1" }],
        proposedAction: act,
      };
      const parsed = ProjectCopilotResponseSchema.safeParse(response);
      assert.equal(parsed.success, true, `Action ${act.action} should survive validation`);
    }
  });

  it("6. Forbidden action names (e.g. DELETE_TASK) remain 100% rejected", () => {
    const payload = {
      action: "DELETE_TASK",
      targetRef: "task_1",
      arguments: {},
      explanation: "Malicious delete",
    };

    const parsed = ProposedActionSchema.safeParse(payload);
    assert.equal(parsed.success, false);
  });

  it("7. Invalid enum values (e.g. priority 'EXTREME') remain 100% rejected", () => {
    const payload = {
      action: "UPDATE_TASK_PRIORITY",
      targetRef: "task_1",
      arguments: {
        priority: "EXTREME",
      },
      explanation: "Invalid priority",
    };

    const parsed = ProposedActionSchema.safeParse(payload);
    assert.equal(parsed.success, false);
  });

  it("8. proposedAction: null remains valid for informational queries", () => {
    const response = {
      answer: "No blockers found.",
      references: [],
      proposedAction: null,
    };

    const parsed = ProjectCopilotResponseSchema.safeParse(response);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.proposedAction, null);
    }
  });
});
