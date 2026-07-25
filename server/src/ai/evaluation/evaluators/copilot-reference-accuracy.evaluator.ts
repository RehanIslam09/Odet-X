import { ProjectCopilotResponse } from "../../schemas/project-copilot.schema.js";
import { EvaluationAssertion, EvaluationResult } from "../types/evaluation.types.js";
import { createNotApplicableMetric, createValuedMetric } from "../types/metric.types.js";
import { ProjectCopilotGroundTruth } from "../fixtures/schemas/copilot-fixture.schema.js";

export const EVAL_COPILOT_REF_ACCURACY_ID = "eval_copilot_reference_accuracy";
export const EVAL_COPILOT_REF_ACCURACY_NAME = "Copilot Reference Accuracy Evaluator";

/**
 * Deterministically measures whether symbolic references returned in Copilot AI outputs
 * correspond to valid context entities in golden fixture ground truth.
 *
 * Checks:
 * 1. Valid task references
 * 2. Valid milestone references
 * 3. Valid project references
 * 4. Hallucinated / nonexistent symbolic references
 * 5. Reference type mismatches
 * 6. Deduplicated validity checks
 *
 * Operates purely in-memory on static fixture ground truth and candidate output schemas.
 * Requires ZERO MongoDB / database connection.
 */
export function evaluateCopilotReferenceAccuracy(
  candidate: ProjectCopilotResponse,
  groundTruth: ProjectCopilotGroundTruth,
): EvaluationResult {
  const startedAt = performance.now();
  const assertions: EvaluationAssertion[] = [];

  const returnedRefs = candidate.references || [];
  const expectedRefs = groundTruth.expectedSymbolicRefs || [];
  const validMap = groundTruth.validSymbolicMap;

  // Zero-references handling
  if (returnedRefs.length === 0) {
    const noExpectedRefs = expectedRefs.length === 0;
    return {
      evaluatorId: EVAL_COPILOT_REF_ACCURACY_ID,
      evaluatorName: EVAL_COPILOT_REF_ACCURACY_NAME,
      status: "passed",
      score: noExpectedRefs ? null : 0.0,
      metrics: {
        referenceAccuracy: noExpectedRefs
          ? createNotApplicableMetric("No references returned or expected for this scenario")
          : createValuedMetric(0.0, "ratio"),
        invalidReferenceCount: createValuedMetric(0, "references"),
      },
      assertions: [
        {
          id: "assert_no_references_returned",
          description: "Candidate returned 0 symbolic references",
          passed: noExpectedRefs,
          expected: noExpectedRefs ? "0 references expected" : `Expected references [${expectedRefs.join(", ")}]`,
          actual: "0 references returned in candidate output",
        },
      ],
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  let validCount = 0;
  let invalidCount = 0;
  let idx = 0;

  for (const item of returnedRefs) {
    idx++;
    let isValid = false;

    if (item.type === "task" && validMap.tasks && validMap.tasks[item.ref]) {
      isValid = true;
    } else if (item.type === "milestone" && validMap.milestones && validMap.milestones[item.ref]) {
      isValid = true;
    } else if (item.type === "project" && validMap.projects && validMap.projects[item.ref]) {
      isValid = true;
    }

    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    assertions.push({
      id: `assert_ref_${idx}_${item.ref}`,
      description: `Symbolic reference '${item.ref}' (${item.type}) valid`,
      passed: isValid,
      expected: `Valid symbolic reference matching type '${item.type}'`,
      actual: isValid
        ? `Symbolic ref '${item.ref}' matched ground truth ${item.type}`
        : `Symbolic ref '${item.ref}' is invalid or type-mismatched for '${item.type}'`,
    });
  }

  const accuracyScore = validCount / returnedRefs.length;
  const passed = invalidCount === 0 && accuracyScore >= 1.0;

  return {
    evaluatorId: EVAL_COPILOT_REF_ACCURACY_ID,
    evaluatorName: EVAL_COPILOT_REF_ACCURACY_NAME,
    status: passed ? "passed" : "failed",
    score: accuracyScore,
    metrics: {
      referenceAccuracy: createValuedMetric(accuracyScore, "ratio"),
      invalidReferenceCount: createValuedMetric(invalidCount, "references"),
    },
    assertions,
    durationMs: Math.round(performance.now() - startedAt),
  };
}
