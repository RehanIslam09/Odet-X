import { EvaluationResult } from "../types/evaluation.types.js";
import { createValuedMetric } from "../types/metric.types.js";
import { ProposedActionSchema } from "../../actions/action.types.js";

export const EVAL_ACTION_SCHEMA_VALIDITY_ID = "eval_action_schema_validity";
export const EVAL_ACTION_SCHEMA_VALIDITY_NAME = "Action Schema Validity Evaluator";

/**
 * Action Schema Validity Evaluator for Phase 28.
 * Deterministically establishes whether a proposed action matches the canonical Phase 28 action Zod schema.
 */
export function evaluateActionSchemaValidity(candidateOutput: unknown): EvaluationResult {
  const startTime = performance.now();
  const candidateData = candidateOutput as { proposedAction?: unknown };
  const proposedAction = candidateData?.proposedAction ?? null;

  let passed: boolean;
  let actualText: string;
  const expectedText = "Proposed action MUST be null or conform to canonical ProposedActionSchema.";

  if (proposedAction === null || proposedAction === undefined) {
    passed = true;
    actualText = "proposedAction is null (no-action proposal).";
  } else {
    const parsed = ProposedActionSchema.safeParse(proposedAction);
    if (parsed.success) {
      passed = true;
      actualText = `Valid proposedAction of type '${parsed.data.action}'.`;
    } else {
      passed = false;
      actualText = `Invalid action schema structure: ${parsed.error.issues.map((i) => i.message).join("; ")}`;
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  return {
    evaluatorId: EVAL_ACTION_SCHEMA_VALIDITY_ID,
    evaluatorName: EVAL_ACTION_SCHEMA_VALIDITY_NAME,
    status: passed ? "passed" : "failed",
    score: passed ? 1.0 : 0.0,
    metrics: {
      action_schema_valid: createValuedMetric(passed ? 1.0 : 0.0, "score"),
    },
    assertions: [
      {
        id: "assert_action_schema_valid",
        description: "Verify candidate proposedAction conforms to canonical action schema.",
        passed,
        expected: expectedText,
        actual: actualText,
      },
    ],
    durationMs,
  };
}
