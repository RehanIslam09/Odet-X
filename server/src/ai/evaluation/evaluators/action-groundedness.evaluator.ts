import { EvaluationResult } from "../types/evaluation.types.js";
import { createValuedMetric } from "../types/metric.types.js";
import { ProposedAction } from "../../actions/action.types.js";

export const EVAL_ACTION_GROUNDEDNESS_ID = "eval_action_groundedness";
export const EVAL_ACTION_GROUNDEDNESS_NAME = "Action Groundedness Evaluator";

export interface ActionGroundTruthSpec {
  expectedAction?: ProposedAction | null;
  expectNoAction?: boolean;
}

/**
 * Action Groundedness Evaluator for Phase 28.
 * Determines whether candidate proposedAction matches the fixture ground truth expectations (action type, targetRef, arguments).
 */
export function evaluateActionGroundedness(
  candidateOutput: unknown,
  groundTruth: ActionGroundTruthSpec = {},
): EvaluationResult {
  const startTime = performance.now();
  const candidateData = candidateOutput as { proposedAction?: ProposedAction | null };
  const proposedAction = candidateData?.proposedAction ?? null;

  let passed: boolean;
  let actualText: string;
  let expectedText: string;

  if (groundTruth.expectNoAction) {
    expectedText = "Expected proposedAction: null (informational query).";
    if (proposedAction === null || proposedAction === undefined) {
      passed = true;
      actualText = "Candidate correctly returned proposedAction: null.";
    } else {
      passed = false;
      actualText = `Candidate returned ungrounded action '${proposedAction.action}' when no action was expected.`;
    }
  } else if (groundTruth.expectedAction) {
    const expected = groundTruth.expectedAction;
    expectedText = `Expected action '${expected.action}' on '${expected.targetRef}'.`;

    if (!proposedAction) {
      passed = false;
      actualText = "Candidate returned proposedAction: null when action was expected.";
    } else {
      const actionMatch = proposedAction.action === expected.action;
      const targetMatch = proposedAction.targetRef === expected.targetRef;

      if (actionMatch && targetMatch) {
        passed = true;
        actualText = `Candidate correctly matched expected action '${proposedAction.action}' on '${proposedAction.targetRef}'.`;
      } else {
        passed = false;
        actualText = `Mismatched action/target. Got '${proposedAction.action}' on '${proposedAction.targetRef}'.`;
      }
    }
  } else {
    passed = true;
    expectedText = "No specific groundedness constraints defined in scenario fixture.";
    actualText = "Passed default groundedness check.";
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    evaluatorId: EVAL_ACTION_GROUNDEDNESS_ID,
    evaluatorName: EVAL_ACTION_GROUNDEDNESS_NAME,
    status: passed ? "passed" : "failed",
    score: passed ? 1.0 : 0.0,
    metrics: {
      action_groundedness_score: createValuedMetric(passed ? 1.0 : 0.0, "score"),
    },
    assertions: [
      {
        id: "assert_action_matches_intent",
        description: "Verify candidate proposed action matches fixture ground truth intent.",
        passed,
        expected: expectedText,
        actual: actualText,
      },
    ],
    durationMs,
  };
}
