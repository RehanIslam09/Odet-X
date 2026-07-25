import { EvaluationResult } from "../types/evaluation.types.js";
import { createValuedMetric } from "../types/metric.types.js";
import { ProposedAction } from "../../actions/action.types.js";

export const EVAL_ACTION_REFERENCE_VALIDITY_ID = "eval_action_reference_validity";
export const EVAL_ACTION_REFERENCE_VALIDITY_NAME = "Action Reference Validity Evaluator";

/**
 * Action Reference Validity Evaluator for Phase 28.
 * Verifies whether the targetRef in candidate proposedAction exists in the scenario fixture's symbolicMap.
 */
export function evaluateActionReferenceValidity(
  candidateOutput: unknown,
  symbolicMap: Record<string, unknown> = {},
): EvaluationResult {
  const startTime = performance.now();
  const candidateData = candidateOutput as { proposedAction?: ProposedAction | null };
  const proposedAction = candidateData?.proposedAction ?? null;

  let passed: boolean;
  let actualText: string;
  const expectedText = "Action targetRef must match an existing symbolic reference in context.";

  if (!proposedAction) {
    passed = true;
    actualText = "No proposed action; target reference validity is not applicable (passes default).";
  } else if (proposedAction.action === "CREATE_TASK") {
    passed = proposedAction.targetRef === "project";
    actualText = passed
      ? "CREATE_TASK targetRef is 'project'."
      : `CREATE_TASK invalid targetRef '${proposedAction.targetRef}' (expected 'project').`;
  } else {
    const existsInMap = Boolean(symbolicMap[proposedAction.targetRef]);
    if (existsInMap) {
      passed = true;
      actualText = `Target reference '${proposedAction.targetRef}' exists in symbolicMap.`;
    } else {
      passed = false;
      actualText = `Target reference '${proposedAction.targetRef}' is hallucinated / unmapped in symbolicMap.`;
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    evaluatorId: EVAL_ACTION_REFERENCE_VALIDITY_ID,
    evaluatorName: EVAL_ACTION_REFERENCE_VALIDITY_NAME,
    status: passed ? "passed" : "failed",
    score: passed ? 1.0 : 0.0,
    metrics: {
      action_reference_valid: createValuedMetric(passed ? 1.0 : 0.0, "score"),
    },
    assertions: [
      {
        id: "assert_target_reference_grounded",
        description: "Verify targetRef matches a valid symbolic entity in project context.",
        passed,
        expected: expectedText,
        actual: actualText,
      },
    ],
    durationMs,
  };
}
