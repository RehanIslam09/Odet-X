import { GeneratePlanResponse, AIPlanTask, AIPlanMilestone } from '../../schemas/project-plan.schema.js';
import { EvaluationAssertion, EvaluationResult } from '../types/evaluation.types.js';
import { createValuedMetric } from '../types/metric.types.js';
import { ProjectPlanGroundTruth } from '../fixtures/schemas/fixture.schema.js';
import { containsKeyword } from '../utils/normalization.utils.js';

export const EVAL_FORBIDDEN_CONCEPTS_ID = 'eval_plan_forbidden_concepts';
export const EVAL_FORBIDDEN_CONCEPTS_NAME = 'Forbidden Concept Evaluator';

/**
 * Detects whether fixture-declared forbidden/unsupported concepts appear in candidate AI outputs.
 *
 * CRITICAL METRIC DISTINCTION:
 * If groundTruth.forbiddenClaims is empty (length === 0), metric is VALUED(0), NOT NOT_APPLICABLE.
 * Reason: The candidate has 0 violations against an empty set of forbidden rules.
 *
 * CRITICAL LIMITATION:
 * Detects ONLY forbidden concepts explicitly listed in fixture ground truth.
 * Does NOT prove the total absence of all possible AI hallucinations.
 */
export function evaluateForbiddenConcepts(
  candidate: GeneratePlanResponse,
  groundTruth: ProjectPlanGroundTruth
): EvaluationResult {
  const startedAt = performance.now();
  const assertions: EvaluationAssertion[] = [];

  const forbiddenClaims = groundTruth.forbiddenClaims || [];

  if (forbiddenClaims.length === 0) {
    return {
      evaluatorId: EVAL_FORBIDDEN_CONCEPTS_ID,
      evaluatorName: EVAL_FORBIDDEN_CONCEPTS_NAME,
      status: 'passed',
      score: null,
      metrics: {
        unsupportedClaimCount: createValuedMetric(0, 'claims'),
      },
      assertions: [
        {
          id: 'assert_empty_forbidden_set',
          description: 'Empty forbidden claims set verified',
          passed: true,
          expected: '0 forbidden claims',
          actual: '0 forbidden claims detected',
        },
      ],
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  // Concatenate candidate text for deterministic scanning
  const taskText = candidate.tasks.map((t: AIPlanTask) => `${t.title} ${t.description || ''}`).join(' ');
  const milestoneText = (candidate.milestones || []).map((m: AIPlanMilestone) => `${m.title} ${m.description || ''}`).join(' ');
  const fullCandidateText = `${taskText} ${milestoneText}`;

  let detectedCount = 0;

  for (const claim of forbiddenClaims) {
    const isDetected = containsKeyword(fullCandidateText, [claim]);
    if (isDetected) detectedCount++;

    assertions.push({
      id: `assert_forbidden_${claim.toLowerCase().replace(/[^\w]/g, '_')}`,
      description: `Forbidden concept '${claim}' absent from candidate text`,
      passed: !isDetected,
      expected: `Concept '${claim}' absent`,
      actual: isDetected ? `Forbidden concept '${claim}' DETECTED in candidate output` : `Concept '${claim}' absent`,
    });
  }

  const passed = detectedCount === 0;

  return {
    evaluatorId: EVAL_FORBIDDEN_CONCEPTS_ID,
    evaluatorName: EVAL_FORBIDDEN_CONCEPTS_NAME,
    status: passed ? 'passed' : 'failed',
    score: null, // Score is null because unsupportedClaimCount is an un-normalized count
    metrics: {
      unsupportedClaimCount: createValuedMetric(detectedCount, 'claims'),
    },
    assertions,
    durationMs: Math.round(performance.now() - startedAt),
  };
}
