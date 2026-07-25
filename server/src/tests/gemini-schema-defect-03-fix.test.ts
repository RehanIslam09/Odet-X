import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateAIResponse, normalizeAIResponsePayload } from "../ai/validation/ai-response.validator.js";
import { ProjectCopilotResponseSchema } from "../ai/schemas/project-copilot.schema.js";

describe("Phase 28 — Gemini Nested Arguments Normalization Fix (MANUAL TEST DEFECT 03)", () => {
  it("A. Observed live defect: arguments = ':{\"priority\":\"urgent\"}' is normalized and validated", () => {
    const liveMalformedOutput = {
      answer: "Updating priority per user request.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: ':{"priority":"urgent"}', // Live malformed Gemini string
        explanation: "Updating the priority of task 'Design JWT Token Scheme' to urgent per user request.",
      },
    };

    const validated = validateAIResponse(liveMalformedOutput, ProjectCopilotResponseSchema);
    assert.ok(validated.proposedAction);
    assert.equal(validated.proposedAction.action, "UPDATE_TASK_PRIORITY");
    assert.deepEqual(validated.proposedAction.arguments, { priority: "urgent" });
  });

  it("B. Ordinary serialized JSON string object arguments succeeds", () => {
    const rawOutput = {
      answer: "Updating priority.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: '{"priority":"urgent"}', // Ordinary JSON string
        explanation: "Updating priority",
      },
    };

    const validated = validateAIResponse(rawOutput, ProjectCopilotResponseSchema);
    assert.ok(validated.proposedAction);
    assert.deepEqual(validated.proposedAction.arguments, { priority: "urgent" });
  });

  it("C. Already-correct object arguments is unchanged and succeeds", () => {
    const rawOutput = {
      answer: "Updating priority.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: { priority: "urgent" }, // Already an object
        explanation: "Updating priority",
      },
    };

    const normalized = normalizeAIResponsePayload(rawOutput);
    assert.strictEqual(normalized, rawOutput, "Original reference unchanged if already correct");

    const validated = validateAIResponse(rawOutput, ProjectCopilotResponseSchema);
    assert.ok(validated.proposedAction);
    assert.deepEqual(validated.proposedAction.arguments, { priority: "urgent" });
  });

  it("D. Malformed JSON string remains rejected by canonical validation", () => {
    const malformedOutput = {
      answer: "Updating priority.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: ":{invalid-json-string",
        explanation: "Updating priority",
      },
    };

    assert.throws(() => validateAIResponse(malformedOutput, ProjectCopilotResponseSchema));
  });

  it("E. JSON primitive string arguments remains rejected by canonical validation", () => {
    const primitiveStringOutput = {
      answer: "Updating priority.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: '"urgent"', // String primitive inside JSON string
        explanation: "Updating priority",
      },
    };

    assert.throws(() => validateAIResponse(primitiveStringOutput, ProjectCopilotResponseSchema));
  });

  it("F. JSON array arguments string remains rejected by canonical validation", () => {
    const arrayStringOutput = {
      answer: "Updating priority.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: '["urgent"]', // Array inside JSON string
        explanation: "Updating priority",
      },
    };

    assert.throws(() => validateAIResponse(arrayStringOutput, ProjectCopilotResponseSchema));
  });

  it("G. Parsed object with invalid enum remains rejected by canonical validation", () => {
    const invalidEnumOutput = {
      answer: "Updating priority.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_PRIORITY",
        targetRef: "task_1",
        arguments: ':{"priority":"nuclear"}', // Invalid enum value
        explanation: "Updating priority",
      },
    };

    assert.throws(() => validateAIResponse(invalidEnumOutput, ProjectCopilotResponseSchema));
  });

  it("H. Forbidden DELETE_TASK action remains rejected by canonical validation", () => {
    const forbiddenOutput = {
      answer: "Deleting task.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "DELETE_TASK",
        targetRef: "task_1",
        arguments: ':{"taskId":"task_1"}',
        explanation: "Deleting task",
      },
    };

    assert.throws(() => validateAIResponse(forbiddenOutput, ProjectCopilotResponseSchema));
  });

  it("I. Valid UPDATE_TASK_STATUS serialized arguments is normalized and validated", () => {
    const rawOutput = {
      answer: "Updating status.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: ':{"status":"done"}',
        explanation: "Updating status to done",
      },
    };

    const validated = validateAIResponse(rawOutput, ProjectCopilotResponseSchema);
    assert.ok(validated.proposedAction);
    assert.equal(validated.proposedAction.action, "UPDATE_TASK_STATUS");
    assert.deepEqual(validated.proposedAction.arguments, { status: "done" });
  });

  it("J. Valid UPDATE_TASK_DUE_DATE serialized arguments is normalized and validated", () => {
    const rawOutput = {
      answer: "Updating due date.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_DUE_DATE",
        targetRef: "task_1",
        arguments: ':{"dueDate":"2026-07-30T00:00:00.000Z"}',
        explanation: "Updating due date",
      },
    };

    const validated = validateAIResponse(rawOutput, ProjectCopilotResponseSchema);
    assert.ok(validated.proposedAction);
    assert.equal(validated.proposedAction.action, "UPDATE_TASK_DUE_DATE");
    assert.deepEqual(validated.proposedAction.arguments, { dueDate: "2026-07-30T00:00:00.000Z" });
  });

  it("K. Valid ADD_TASK_LABEL serialized arguments is normalized and validated", () => {
    const rawOutput = {
      answer: "Adding label.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "ADD_TASK_LABEL",
        targetRef: "task_1",
        arguments: ':{"label":"backend"}',
        explanation: "Adding backend label",
      },
    };

    const validated = validateAIResponse(rawOutput, ProjectCopilotResponseSchema);
    assert.ok(validated.proposedAction);
    assert.equal(validated.proposedAction.action, "ADD_TASK_LABEL");
    assert.deepEqual(validated.proposedAction.arguments, { label: "backend" });
  });

  it("L. Valid CREATE_TASK serialized arguments is normalized and validated", () => {
    const rawOutput = {
      answer: "Creating task.",
      references: [{ type: "project", ref: "project" }],
      proposedAction: {
        action: "CREATE_TASK",
        targetRef: "project",
        arguments: ':{"title":"New Auth Task","status":"todo","priority":"high"}',
        explanation: "Creating new task",
      },
    };

    const validated = validateAIResponse(rawOutput, ProjectCopilotResponseSchema);
    assert.ok(validated.proposedAction);
    assert.equal(validated.proposedAction.action, "CREATE_TASK");
    assert.equal(validated.proposedAction.arguments.title, "New Auth Task");
  });

  it("M. proposedAction: null is unaffected by normalization", () => {
    const rawOutput = {
      answer: "Informational answer.",
      references: [],
      proposedAction: null,
    };

    const normalized = normalizeAIResponsePayload(rawOutput);
    assert.strictEqual(normalized, rawOutput);

    const validated = validateAIResponse(rawOutput, ProjectCopilotResponseSchema);
    assert.equal(validated.proposedAction, null);
  });

  it("N. Phase 27 informational Copilot response is unaffected by normalization", () => {
    const rawOutput = {
      answer: "Phase 27 answer without proposedAction.",
      references: [{ type: "project", ref: "project" }],
    };

    const normalized = normalizeAIResponsePayload(rawOutput);
    assert.strictEqual(normalized, rawOutput);

    const validated = validateAIResponse(rawOutput, ProjectCopilotResponseSchema);
    assert.equal(validated.answer, "Phase 27 answer without proposedAction.");
  });
});
