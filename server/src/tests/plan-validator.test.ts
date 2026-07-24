import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePlan } from "../domain/plan-validator.js";
import { BadRequestError } from "../utils/app-error.js";

describe("PlanValidator Domain Unit Tests", () => {
  it("1. Valid empty dependency graph (tasks without dependencies)", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1 },
        { tempId: "t2", title: "Task 2", position: 2 },
      ],
    };
    const result = validatePlan(input);
    assert.equal(result.tasks.length, 2);
    assert.equal(result.tasks[0]?.dependencies.length, 0);
    assert.equal(result.tasks[1]?.dependencies.length, 0);
  });

  it("2. Valid linear graph (t1 -> t2 -> t3)", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1 },
        { tempId: "t2", title: "Task 2", position: 2, dependencies: ["t1"] },
        { tempId: "t3", title: "Task 3", position: 3, dependencies: ["t2"] },
      ],
    };
    const result = validatePlan(input);
    assert.equal(result.tasks.length, 3);
    assert.deepEqual(result.tasks[1]?.dependencies, ["t1"]);
    assert.deepEqual(result.tasks[2]?.dependencies, ["t2"]);
  });

  it("3. Valid branching graph (t1 -> t2, t1 -> t3)", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1 },
        { tempId: "t2", title: "Task 2", position: 2, dependencies: ["t1"] },
        { tempId: "t3", title: "Task 3", position: 3, dependencies: ["t1"] },
      ],
    };
    const result = validatePlan(input);
    assert.equal(result.tasks.length, 3);
  });

  it("4. Valid diamond DAG (t1 -> t2, t1 -> t3, t2+t3 -> t4)", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1 },
        { tempId: "t2", title: "Task 2", position: 2, dependencies: ["t1"] },
        { tempId: "t3", title: "Task 3", position: 3, dependencies: ["t1"] },
        { tempId: "t4", title: "Task 4", position: 4, dependencies: ["t2", "t3"] },
      ],
    };
    const result = validatePlan(input);
    assert.equal(result.tasks.length, 4);
    assert.deepEqual(result.tasks[3]?.dependencies, ["t2", "t3"]);
  });

  it("5. Valid disconnected DAG (t1 -> t2, t3 -> t4)", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1 },
        { tempId: "t2", title: "Task 2", position: 2, dependencies: ["t1"] },
        { tempId: "t3", title: "Task 3", position: 3 },
        { tempId: "t4", title: "Task 4", position: 4, dependencies: ["t3"] },
      ],
    };
    const result = validatePlan(input);
    assert.equal(result.tasks.length, 4);
  });

  it("6. Self dependency rejected", () => {
    const input = {
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: ["t1"] }],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("cannot depend on itself")
    );
  });

  it("7. Two-node cycle rejected (t1 -> t2 -> t1)", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1, dependencies: ["t2"] },
        { tempId: "t2", title: "Task 2", position: 2, dependencies: ["t1"] },
      ],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("Dependency cycle detected")
    );
  });

  it("8. Three-node cycle rejected (t1 -> t2 -> t3 -> t1)", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1, dependencies: ["t3"] },
        { tempId: "t2", title: "Task 2", position: 2, dependencies: ["t1"] },
        { tempId: "t3", title: "Task 3", position: 3, dependencies: ["t2"] },
      ],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("Dependency cycle detected")
    );
  });

  it("9. Longer transitive cycle rejected", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1, dependencies: ["t4"] },
        { tempId: "t2", title: "Task 2", position: 2, dependencies: ["t1"] },
        { tempId: "t3", title: "Task 3", position: 3, dependencies: ["t2"] },
        { tempId: "t4", title: "Task 4", position: 4, dependencies: ["t3"] },
      ],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("Dependency cycle detected")
    );
  });

  it("10. Missing dependency tempId rejected", () => {
    const input = {
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: ["nonexistent_id"] }],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("non-existent tempId")
    );
  });

  it("11. Duplicate task tempId rejected", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1 },
        { tempId: "t1", title: "Duplicate Task", position: 2 },
      ],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("Duplicate task tempId")
    );
  });

  it("12. Duplicate milestone tempId rejected", () => {
    const input = {
      milestones: [
        { tempId: "ms1", title: "M1", position: 1 },
        { tempId: "ms1", title: "M1 Dup", position: 2 },
      ],
      tasks: [],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("Duplicate milestone tempId")
    );
  });

  it("13. Duplicate dependency normalized deterministically", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1 },
        { tempId: "t2", title: "Task 2", position: 2, dependencies: ["t1", "t1", "t1"] },
      ],
    };
    const result = validatePlan(input);
    assert.deepEqual(result.tasks[1]?.dependencies, ["t1"]);
  });

  it("14. Valid milestone reference", () => {
    const input = {
      milestones: [{ tempId: "ms1", title: "Phase 1 Milestone", position: 1 }],
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, milestoneTempId: "ms1" }],
    };
    const result = validatePlan(input);
    assert.equal(result.milestones.length, 1);
    assert.equal(result.tasks[0]?.milestoneTempId, "ms1");
  });

  it("15. Missing milestone reference rejected", () => {
    const input = {
      milestones: [],
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, milestoneTempId: "invalid_ms" }],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("non-existent milestoneTempId")
    );
  });

  it("16. Task limit exactly 25 accepted", () => {
    const tasks = Array.from({ length: 25 }, (_, i) => ({
      tempId: `t${i + 1}`,
      title: `Task ${i + 1}`,
      position: i + 1,
    }));
    const result = validatePlan({ tasks });
    assert.equal(result.tasks.length, 25);
  });

  it("17. Task limit 26 rejected", () => {
    const tasks = Array.from({ length: 26 }, (_, i) => ({
      tempId: `t${i + 1}`,
      title: `Task ${i + 1}`,
      position: i + 1,
    }));
    assert.throws(
      () => validatePlan({ tasks }),
      (err: any) => err instanceof BadRequestError && err.message.includes("cannot exceed 25")
    );
  });

  it("18. Milestone limit exactly 5 accepted", () => {
    const milestones = Array.from({ length: 5 }, (_, i) => ({
      tempId: `ms${i + 1}`,
      title: `Milestone ${i + 1}`,
      position: i + 1,
    }));
    const result = validatePlan({ tasks: [], milestones });
    assert.equal(result.milestones.length, 5);
  });

  it("19. Milestone limit 6 rejected", () => {
    const milestones = Array.from({ length: 6 }, (_, i) => ({
      tempId: `ms${i + 1}`,
      title: `Milestone ${i + 1}`,
      position: i + 1,
    }));
    assert.throws(
      () => validatePlan({ tasks: [], milestones }),
      (err: any) => err instanceof BadRequestError && err.message.includes("cannot exceed 5")
    );
  });

  it("20. Position zero rejected", () => {
    const input = {
      tasks: [{ tempId: "t1", title: "Task 1", position: 0 }],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("position must be an integer >= 1")
    );
  });

  it("21. Negative position rejected", () => {
    const input = {
      tasks: [{ tempId: "t1", title: "Task 1", position: -5 }],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("position must be an integer >= 1")
    );
  });

  it("22. Fractional position rejected", () => {
    const input = {
      tasks: [{ tempId: "t1", title: "Task 1", position: 1.5 }],
    };
    assert.throws(
      () => validatePlan(input),
      (err: any) => err instanceof BadRequestError && err.message.includes("position must be an integer >= 1")
    );
  });

  it("23. Validator does not mutate caller input unexpectedly", () => {
    const input = {
      tasks: [
        { tempId: "t1", title: "Task 1", position: 1, dependencies: ["t1_nonexistent"] },
      ],
    };
    const originalInputCopy = JSON.parse(JSON.stringify(input));
    assert.throws(() => validatePlan(input));
    assert.deepEqual(input, originalInputCopy);
  });
});
