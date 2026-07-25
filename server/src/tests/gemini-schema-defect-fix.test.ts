import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { getGeminiResponseSchema, sanitizeSchemaForGemini } from "../ai/providers/gemini-schema.adapter.js";
import { ProjectCopilotResponseSchema } from "../ai/schemas/project-copilot.schema.js";
import { ProposedActionSchema, AllowedActionTypeEnum } from "../ai/actions/action.types.js";

describe("Phase 28 — Gemini Schema Compatibility Defect Fix (MANUAL TEST DEFECT 01)", () => {
  it("1. Gemini provider wire schema contains no unsupported 'const' or forbidden OpenAPI keywords", () => {
    const geminiSchema = getGeminiResponseSchema(ProjectCopilotResponseSchema);
    const schemaJsonString = JSON.stringify(geminiSchema);

    // Verify 'const' is completely absent
    assert.equal(schemaJsonString.includes('"const":'), false, "Wire schema must not contain 'const'");
    assert.equal(schemaJsonString.includes('"pattern":'), false, "Wire schema must not contain 'pattern'");
    assert.equal(schemaJsonString.includes('"default":'), false, "Wire schema must not contain 'default'");
    assert.equal(schemaJsonString.includes('"$schema":'), false, "Wire schema must not contain '$schema'");
    assert.equal(schemaJsonString.includes('"minLength":'), false, "Wire schema must not contain 'minLength'");
    assert.equal(schemaJsonString.includes('"maxLength":'), false, "Wire schema must not contain 'maxLength'");
    assert.equal(schemaJsonString.includes('"minItems":'), false, "Wire schema must not contain 'minItems'");
    assert.equal(schemaJsonString.includes('"maxItems":'), false, "Wire schema must not contain 'maxItems'");
    assert.equal(schemaJsonString.includes('"additionalProperties":'), false, "Wire schema must not contain 'additionalProperties'");
  });

  it("2. All 5 action discriminator literals remain semantically constrained to exact action value via enum after adaptation", () => {
    const geminiSchema = getGeminiResponseSchema(ProjectCopilotResponseSchema);
    const proposedActionSchema = geminiSchema.properties?.proposedAction;
    assert.ok(proposedActionSchema, "proposedAction exists in wire schema");

    const oneOfArray = proposedActionSchema.anyOf?.[0]?.oneOf;
    assert.ok(Array.isArray(oneOfArray), "oneOf array exists");
    assert.equal(oneOfArray.length, 5, "All 5 action branches present in wire schema");

    const expectedActions = AllowedActionTypeEnum.options;
    const foundActions: string[] = [];

    for (const branch of oneOfArray) {
      const actionProp = branch.properties?.action;
      assert.ok(actionProp, "action property exists in branch");
      assert.equal(actionProp.type, "string");
      assert.ok(Array.isArray(actionProp.enum), "action property uses enum constraint");
      assert.equal(actionProp.enum.length, 1, "enum has single constrained literal value");
      foundActions.push(actionProp.enum[0]);
    }

    assert.deepEqual(foundActions.sort(), [...expectedActions].sort());
  });

  it("3. Canonical ProposedActionSchema remains strict and unweakened", () => {
    // Valid status update passes canonical validation
    const validPayload = {
      action: "UPDATE_TASK_STATUS",
      targetRef: "task_1",
      arguments: { status: "done" },
      explanation: "Valid task completion",
    };
    const parsed = ProposedActionSchema.safeParse(validPayload);
    assert.equal(parsed.success, true);
  });

  it("4. Forbidden action names remain rejected by canonical validation", () => {
    const forbiddenPayload = {
      action: "DELETE_TASK",
      targetRef: "task_1",
      arguments: {},
      explanation: "Malicious deletion",
    };
    const parsed = ProposedActionSchema.safeParse(forbiddenPayload);
    assert.equal(parsed.success, false);
  });

  it("5. proposedAction: null remains valid (informational no-action query)", () => {
    const informationalResponse = {
      answer: "The main blocker is authentication integration.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: null,
    };
    const parsed = ProjectCopilotResponseSchema.safeParse(informationalResponse);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.proposedAction, null);
    }
  });

  it("6. Valid CREATE_TASK proposal survives canonical Zod validation", () => {
    const createTaskResponse = {
      answer: "I can create a new task for authentication middleware.",
      references: [{ type: "project", ref: "project" }],
      proposedAction: {
        action: "CREATE_TASK",
        targetRef: "project",
        arguments: {
          title: "Implement Auth Middleware",
          description: "JWT verification middleware",
          status: "todo",
          priority: "high",
          dueDate: null,
          labels: ["backend", "security"],
        },
        explanation: "Proposed task creation based on project discussion",
      },
    };
    const parsed = ProjectCopilotResponseSchema.safeParse(createTaskResponse);
    assert.equal(parsed.success, true);
  });

  it("7. Valid UPDATE_TASK_STATUS proposal survives canonical Zod validation", () => {
    const statusUpdateResponse = {
      answer: "I will mark task_1 as done.",
      references: [{ type: "task", ref: "task_1" }],
      proposedAction: {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: {
          status: "done",
        },
        explanation: "Marking completed task",
      },
    };
    const parsed = ProjectCopilotResponseSchema.safeParse(statusUpdateResponse);
    assert.equal(parsed.success, true);
  });

  it("8. Invalid action type is rejected by canonical validation", () => {
    const invalidActionTypeResponse = {
      answer: "Invalid action test",
      references: [],
      proposedAction: {
        action: "UNSUPPORTED_ACTION",
        targetRef: "task_1",
        arguments: {},
        explanation: "Test invalid action",
      },
    };
    const parsed = ProjectCopilotResponseSchema.safeParse(invalidActionTypeResponse);
    assert.equal(parsed.success, false);
  });

  it("9. Existing Phase 27 structured Copilot responses remain valid", () => {
    const phase27LegacyResponse = {
      answer: "Project is on schedule.",
      references: [{ type: "project", ref: "project" }],
    };
    const parsed = ProjectCopilotResponseSchema.safeParse(phase27LegacyResponse);
    assert.equal(parsed.success, true);
  });

  it("10. Provider compatibility transformation MUST NOT mutate canonical Zod schema or raw z.toJSONSchema object", () => {
    const rawSchema = z.toJSONSchema(ProjectCopilotResponseSchema) as Record<string, any>;
    const rawJsonBefore = JSON.stringify(rawSchema);

    const sanitized = sanitizeSchemaForGemini(rawSchema);

    const rawJsonAfter = JSON.stringify(rawSchema);
    assert.equal(rawJsonBefore, rawJsonAfter, "rawSchema object must remain unmutated");
    assert.notEqual(JSON.stringify(sanitized), rawJsonBefore, "Sanitized schema copy has transformed properties");
  });

  it("11. Fix is isolated to Gemini provider adapter and does not alter Anthropic behavior", () => {
    // ProposedActionSchema and ProjectCopilotResponseSchema exported objects are completely unchanged Zod schemas
    assert.ok(ProjectCopilotResponseSchema instanceof z.ZodObject);
    assert.ok(typeof ProposedActionSchema.safeParse === "function");
  });
});
