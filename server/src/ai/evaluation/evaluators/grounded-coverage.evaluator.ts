import { GeneratePlanResponse, AIPlanTask, AIPlanMilestone } from '../../schemas/project-plan.schema.js';
import { EvaluationAssertion, EvaluationResult } from '../types/evaluation.types.js';
import { createNotApplicableMetric, createValuedMetric } from '../types/metric.types.js';
import { ProjectPlanGroundTruth } from '../fixtures/schemas/fixture.schema.js';
import { containsKeyword } from '../utils/normalization.utils.js';

export const EVAL_GROUNDED_COVERAGE_ID = 'eval_plan_grounded_coverage';
export const EVAL_GROUNDED_COVERAGE_NAME = 'Grounded Context Coverage Evaluator';

/**
 * Evaluates how many explicitly declared grounded context facts from fixture ground truth
 * are represented in candidate AI outputs.
 *
 * IMPORTANT LIMITATION:
 * This evaluator measures: "How much of the explicitly declared project context appears in candidate text?"
 * It does NOT prove that every statement in candidate text is factually grounded.
 */
export function evaluateGroundedCoverage(
  candidate: GeneratePlanResponse,
  groundTruth: ProjectPlanGroundTruth
): EvaluationResult {
  const startedAt = performance.now();
  const assertions: EvaluationAssertion[] = [];

  const declaredFacts = groundTruth.groundedContextFacts || [];
  const totalFacts = declaredFacts.length;

  if (totalFacts === 0) {
    return {
      evaluatorId: EVAL_GROUNDED_COVERAGE_ID,
      evaluatorName: EVAL_GROUNDED_COVERAGE_NAME,
      status: 'passed',
      score: null,
      metrics: {
        groundedFactCoverage: createNotApplicableMetric('No grounded context facts declared in ground truth'),
      },
      assertions: [
        {
          id: 'assert_no_grounded_facts',
          description: 'Verified declared grounded facts count',
          passed: true,
          expected: '0 facts',
          actual: '0 facts',
        },
      ],
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  // Concatenate all candidate text into a single searchable body
  const taskText = candidate.tasks.map((t: AIPlanTask) => `${t.title} ${t.description || ''}`).join(' ');
  const milestoneText = (candidate.milestones || []).map((m: AIPlanMilestone) => `${m.title} ${m.description || ''}`).join(' ');
  const fullCandidateText = `${taskText} ${milestoneText}`;

  let matchedFactCount = 0;

  for (const fact of declaredFacts) {
    const isMatched = containsKeyword(fullCandidateText, [fact]);
    if (isMatched) matchedFactCount++;

    assertions.push({
      id: `assert_grounded_fact_${fact.toLowerCase().replace(/[^\w]/g, '_')}`,
      description: `Grounded context fact '${fact}' present in candidate text`,
      passed: isMatched,
      expected: `Fact '${fact}' present`,
      actual: isMatched ? `Fact '${fact}' detected in candidate content` : `Fact '${fact}' missing from candidate content`,
    });
  }

  const coverageScore = matchedFactCount / totalFacts;
  const passed = coverageScore >= 0.80;

  return {
    evaluatorId: EVAL_GROUNDED_COVERAGE_ID,
    evaluatorName: EVAL_GROUNDED_COVERAGE_NAME,
    status: passed ? 'passed' : 'failed',
    score: coverageScore,
    metrics: {
      groundedFactCoverage: createValuedMetric(coverageScore, 'ratio'),
    },
    assertions,
    durationMs: Math.round(performance.now() - startedAt),
  };
}
