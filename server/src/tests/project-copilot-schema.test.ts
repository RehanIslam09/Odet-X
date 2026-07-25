import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProjectCopilotResponseSchema } from "../ai/schemas/project-copilot.schema.js";

describe("ProjectCopilot Response Schema Unit Tests (WP-03)", () => {
  it("1. Valid answer with empty references array parses cleanly", () => {
    const raw = {
      answer: "The project has 5 active tasks and 1 upcoming milestone.",
      references: [],
    };
    const parsed = ProjectCopilotResponseSchema.parse(raw);
    assert.equal(parsed.answer, raw.answer);
    assert.deepStrictEqual(parsed.references, []);
  });

  it("2. Valid answer with default omitted references array parses cleanly", () => {
    const raw = {
      answer: "No active tasks are currently overdue.",
    };
    const parsed = ProjectCopilotResponseSchema.parse(raw);
    assert.equal(parsed.answer, raw.answer);
    assert.deepStrictEqual(parsed.references, []);
  });

  it("3. Valid project reference parses cleanly", () => {
    const raw = {
      answer: "Overall project status is healthy.",
      references: [{ type: "project", ref: "project" }],
    };
    const parsed = ProjectCopilotResponseSchema.parse(raw);
    assert.equal(parsed.references.length, 1);
    assert.deepStrictEqual(parsed.references[0], { type: "project", ref: "project" });
  });

  it("4. Valid task reference parses cleanly", () => {
    const raw = {
      answer: "Task 1 is currently in progress.",
      references: [{ type: "task", ref: "task_1" }],
    };
    const parsed = ProjectCopilotResponseSchema.parse(raw);
    assert.equal(parsed.references.length, 1);
    assert.deepStrictEqual(parsed.references[0], { type: "task", ref: "task_1" });
  });

  it("5. Valid milestone reference parses cleanly", () => {
    const raw = {
      answer: "Milestone 1 target date is set for next week.",
      references: [{ type: "milestone", ref: "ms_1" }],
    };
    const parsed = ProjectCopilotResponseSchema.parse(raw);
    assert.equal(parsed.references.length, 1);
    assert.deepStrictEqual(parsed.references[0], { type: "milestone", ref: "ms_1" });
  });

  it("6. Mixed project, task, and milestone references parse cleanly", () => {
    const raw = {
      answer: "Project Alpha includes Milestone 1 and Task 2.",
      references: [
        { type: "project", ref: "project" },
        { type: "milestone", ref: "ms_1" },
        { type: "task", ref: "task_2" },
      ],
    };
    const parsed = ProjectCopilotResponseSchema.parse(raw);
    assert.equal(parsed.references.length, 3);
  });

  it("7. Rejects response with >20 references", () => {
    const refs = [];
    for (let i = 1; i <= 21; i++) {
      refs.push({ type: "task" as const, ref: `task_${i}` });
    }
    const raw = {
      answer: "Multiple tasks referenced.",
      references: refs,
    };
    assert.throws(() => ProjectCopilotResponseSchema.parse(raw));
  });

  it("8. Rejects invalid reference type string", () => {
    const raw = {
      answer: "Invalid type reference.",
      references: [{ type: "unknown_entity" as unknown as "task", ref: "task_1" }],
    };
    assert.throws(() => ProjectCopilotResponseSchema.parse(raw));
  });

  it("9. Rejects missing answer field", () => {
    const raw = {
      references: [{ type: "task", ref: "task_1" }],
    };
    assert.throws(() => ProjectCopilotResponseSchema.parse(raw));
  });

  it("10. Rejects empty answer string", () => {
    const raw = {
      answer: "   ",
      references: [],
    };
    assert.throws(() => ProjectCopilotResponseSchema.parse(raw));
  });

  it("11. Rejects answer exceeding 10,000 characters", () => {
    const raw = {
      answer: "a".repeat(10001),
      references: [],
    };
    assert.throws(() => ProjectCopilotResponseSchema.parse(raw));
  });

  it("12. Rejects malformed reference items without ref property", () => {
    const raw = {
      answer: "Malformed reference.",
      references: [{ type: "task" } as unknown as { type: "task"; ref: string }],
    };
    assert.throws(() => ProjectCopilotResponseSchema.parse(raw));
  });
});
