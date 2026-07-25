import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateCopilotReferenceAccuracy } from "../ai/evaluation/evaluators/copilot-reference-accuracy.evaluator.js";
import { ProjectCopilotGroundTruth } from "../ai/evaluation/fixtures/schemas/copilot-fixture.schema.js";
import { isValuedMetric } from "../ai/evaluation/types/metric.types.js";

describe("Copilot Reference Accuracy Evaluator Unit Tests (WP-05)", () => {
  const sampleGroundTruth: ProjectCopilotGroundTruth = {
    expectedConcepts: [],
    forbiddenClaims: [],
    validSymbolicMap: {
      projects: { proj_1: "64f000000000000000000001" },
      tasks: {
        task_1: "64f000000000000000000101",
        task_2: "64f000000000000000000102",
      },
      milestones: { ms_1: "64f000000000000000000201" },
    },
    expectedSymbolicRefs: ["task_1", "task_2", "ms_1"],
  };

  it("1. Valid task, milestone, and project references score referenceAccuracy 1.0 and invalidReferenceCount 0", () => {
    const candidate = {
      answer: "Task 1 and Task 2 are on Milestone 1.",
      references: [
        { type: "task" as const, ref: "task_1" },
        { type: "task" as const, ref: "task_2" },
        { type: "milestone" as const, ref: "ms_1" },
      ],
    };

    const result = evaluateCopilotReferenceAccuracy(candidate, sampleGroundTruth);

    assert.equal(result.status, "passed");
    const refMetric = result.metrics.referenceAccuracy;
    assert.ok(refMetric && isValuedMetric(refMetric));
    if (refMetric && isValuedMetric(refMetric)) {
      assert.equal(refMetric.value, 1.0);
    }

    const invalidMetric = result.metrics.invalidReferenceCount;
    assert.ok(invalidMetric && isValuedMetric(invalidMetric));
    if (invalidMetric && isValuedMetric(invalidMetric)) {
      assert.equal(invalidMetric.value, 0);
    }
  });

  it("2. Hallucinated symbolic reference (task_999) reduces accuracy and increments invalidReferenceCount", () => {
    const candidate = {
      answer: "Task 1 exists but task 999 does not.",
      references: [
        { type: "task" as const, ref: "task_1" },
        { type: "task" as const, ref: "task_999" }, // Hallucinated
      ],
    };

    const result = evaluateCopilotReferenceAccuracy(candidate, sampleGroundTruth);

    assert.equal(result.status, "failed");
    const refMetric = result.metrics.referenceAccuracy;
    assert.ok(refMetric && isValuedMetric(refMetric));
    if (refMetric && isValuedMetric(refMetric)) {
      assert.equal(refMetric.value, 0.5);
    }

    const invalidMetric = result.metrics.invalidReferenceCount;
    assert.ok(invalidMetric && isValuedMetric(invalidMetric));
    if (invalidMetric && isValuedMetric(invalidMetric)) {
      assert.equal(invalidMetric.value, 1);
    }
  });

  it("3. Type-mismatched reference (ref 'task_1' marked as 'milestone') is flagged as invalid", () => {
    const candidate = {
      answer: "Milestone 1 is task 1.",
      references: [{ type: "milestone" as const, ref: "task_1" }],
    };

    const result = evaluateCopilotReferenceAccuracy(candidate, sampleGroundTruth);

    assert.equal(result.status, "failed");
    const refMetric = result.metrics.referenceAccuracy;
    assert.ok(refMetric && isValuedMetric(refMetric));
    if (refMetric && isValuedMetric(refMetric)) {
      assert.equal(refMetric.value, 0.0);
    }

    const invalidMetric = result.metrics.invalidReferenceCount;
    assert.ok(invalidMetric && isValuedMetric(invalidMetric));
    if (invalidMetric && isValuedMetric(invalidMetric)) {
      assert.equal(invalidMetric.value, 1);
    }
  });

  it("4. Zero references returned when 0 expected returns NOT_APPLICABLE (never coerced to 0.0)", () => {
    const emptyGroundTruth: ProjectCopilotGroundTruth = {
      expectedConcepts: [],
      forbiddenClaims: [],
      validSymbolicMap: { projects: {}, tasks: {}, milestones: {} },
      expectedSymbolicRefs: [],
    };

    const candidate = {
      answer: "No entities exist in this project.",
      references: [],
    };

    const result = evaluateCopilotReferenceAccuracy(candidate, emptyGroundTruth);

    assert.equal(result.status, "passed");
    const refMetric = result.metrics.referenceAccuracy;
    assert.ok(refMetric && refMetric.type === "NOT_APPLICABLE");
    assert.equal(result.score, null, "Score must be null when NOT_APPLICABLE");
  });

  it("5. Zero references returned when references are expected produces VALUED 0.0 accuracy", () => {
    const candidate = {
      answer: "I forgot to reference any tasks.",
      references: [],
    };

    const result = evaluateCopilotReferenceAccuracy(candidate, sampleGroundTruth);

    assert.equal(result.status, "passed");
    const refMetric = result.metrics.referenceAccuracy;
    assert.ok(refMetric && isValuedMetric(refMetric));
    if (refMetric && isValuedMetric(refMetric)) {
      assert.equal(refMetric.value, 0.0);
    }
  });
});
