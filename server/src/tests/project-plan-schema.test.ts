import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GeneratePlanResponseSchema } from "../ai/schemas/project-plan.schema.js";

describe("Project Plan Zod Schema Unit Tests", () => {
  it("1. Valid response payload passes schema validation", () => {
    const raw = {
      milestones: [
        {
          ref: "ms_1",
          title: "Phase 1: Auth & Setup",
          description: "Initialize backend and database schema",
          targetDate: "2026-08-01",
          position: 1,
        },
      ],
      tasks: [
        {
          ref: "task_1",
          title: "Setup Express Server",
          description: "Instantiate app and middleware",
          priority: "high",
          estimatedTime: "2h",
          position: 1,
          dependencies: [],
          milestoneRef: "ms_1",
        },
        {
          ref: "task_2",
          title: "Implement User Schema",
          description: "Create User Mongoose model",
          priority: "urgent",
          estimatedTime: "3h",
          position: 2,
          dependencies: ["task_1"],
          milestoneRef: "ms_1",
        },
      ],
    };

    const parsed = GeneratePlanResponseSchema.parse(raw);
    assert.equal(parsed.tasks.length, 2);
    assert.equal(parsed.milestones.length, 1);
    assert.equal(parsed.tasks[1]?.dependencies[0], "task_1");
  });

  it("2. Rejects task count exceeding 25", () => {
    const tasks = Array.from({ length: 26 }, (_, i) => ({
      ref: `t_${i + 1}`,
      title: `Task ${i + 1}`,
      position: i + 1,
    }));

    assert.throws(() => GeneratePlanResponseSchema.parse({ tasks }));
  });

  it("3. Rejects milestone count exceeding 5", () => {
    const milestones = Array.from({ length: 6 }, (_, i) => ({
      ref: `ms_${i + 1}`,
      title: `Milestone ${i + 1}`,
      position: i + 1,
    }));

    assert.throws(() => GeneratePlanResponseSchema.parse({ tasks: [], milestones }));
  });

  it("4. Rejects empty task title or title exceeding 120 chars", () => {
    const emptyTitle = {
      tasks: [{ ref: "t1", title: "", position: 1 }],
    };
    assert.throws(() => GeneratePlanResponseSchema.parse(emptyTitle));

    const longTitle = {
      tasks: [{ ref: "t1", title: "A".repeat(121), position: 1 }],
    };
    assert.throws(() => GeneratePlanResponseSchema.parse(longTitle));
  });

  it("5. Rejects invalid task priority enum", () => {
    const invalidPriority = {
      tasks: [{ ref: "t1", title: "Task 1", priority: "super-high", position: 1 }],
    };
    assert.throws(() => GeneratePlanResponseSchema.parse(invalidPriority));
  });

  it("6. Rejects non-integer or position < 1", () => {
    const invalidPosition = {
      tasks: [{ ref: "t1", title: "Task 1", position: 0 }],
    };
    assert.throws(() => GeneratePlanResponseSchema.parse(invalidPosition));
  });
});
