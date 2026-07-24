import { GeneratePlanResponse, AIPlanTask, AIPlanMilestone } from '../../schemas/project-plan.schema.js';
import { EvaluationAssertion, EvaluationResult } from '../types/evaluation.types.js';
import { createNotApplicableMetric, createValuedMetric } from '../types/metric.types.js';
import { ProjectPlanGroundTruth } from '../fixtures/schemas/fixture.schema.js';
import { containsKeyword } from '../utils/normalization.utils.js';

export const EVAL_REQUIRED_COVERAGE_ID = 'eval_plan_required_coverage';
export const EVAL_REQUIRED_COVERAGE_NAME = 'Required Item Coverage Evaluator';

/**
 * Evaluates how many required task and milestone concepts defined in golden ground truth
 * are present in candidate AI outputs.
 */
export function evaluateRequiredCoverage(
  candidate: GeneratePlanResponse,
  groundTruth: ProjectPlanGroundTruth
): EvaluationResult {
  const startedAt = performance.now();
  const assertions: EvaluationAssertion[] = [];

  const requiredTasks = groundTruth.expectedTasks.filter((t) => t.required !== false);
  const requiredMilestones = groundTruth.expectedMilestones.filter((m) => m.required !== false);

  const totalRequired = requiredTasks.length + requiredMilestones.length;

  if (totalRequired === 0) {
    return {
      evaluatorId: EVAL_REQUIRED_COVERAGE_ID,
      evaluatorName: EVAL_REQUIRED_COVERAGE_NAME,
      status: 'passed',
      score: null,
      metrics: {
        requiredItemCoverage: createNotApplicableMetric('No required task or milestone concepts declared in ground truth'),
      },
      assertions: [
        {
          id: 'assert_no_required_concepts',
          description: 'Verified required concepts count',
          passed: true,
          expected: '0 required concepts',
          actual: '0 required concepts',
        },
      ],
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  let matchedCount = 0;

  // 1. Evaluate Required Task Concepts
  for (const expectedConcept of requiredTasks) {
    const matchingCandidate = candidate.tasks.find((task: AIPlanTask) => {
      const searchableText = `${task.title} ${task.description || ''}`;
      return containsKeyword(searchableText, expectedConcept.keywords);
    });

    const isMatched = Boolean(matchingCandidate);
    if (isMatched) matchedCount++;

    assertions.push({
      id: `assert_task_concept_${expectedConcept.id}`,
      description: `Required task concept '${expectedConcept.concept}' present`,
      passed: isMatched,
      expected: `Task matching keywords [${expectedConcept.keywords.join(', ')}]`,
      actual: isMatched ? `Matched candidate task ref '${matchingCandidate?.ref}'` : 'No matching candidate task found',
    });
  }

  // 2. Evaluate Required Milestone Concepts
  const candidateMilestones = candidate.milestones || [];
  for (const expectedConcept of requiredMilestones) {
    const matchingCandidate = candidateMilestones.find((ms: AIPlanMilestone) => {
      const searchableText = `${ms.title} ${ms.description || ''}`;
      return containsKeyword(searchableText, expectedConcept.keywords);
    });

    const isMatched = Boolean(matchingCandidate);
    if (isMatched) matchedCount++;

    assertions.push({
      id: `assert_milestone_concept_${expectedConcept.id}`,
      description: `Required milestone concept '${expectedConcept.concept}' present`,
      passed: isMatched,
      expected: `Milestone matching keywords [${expectedConcept.keywords.join(', ')}]`,
      actual: isMatched ? `Matched candidate milestone ref '${matchingCandidate?.ref}'` : 'No matching candidate milestone found',
    });
  }

  const coverageScore = matchedCount / totalRequired;
  const passed = coverageScore >= 0.75;

  return {
    evaluatorId: EVAL_REQUIRED_COVERAGE_ID,
    evaluatorName: EVAL_REQUIRED_COVERAGE_NAME,
    status: passed ? 'passed' : 'failed',
    score: coverageScore,
    metrics: {
      requiredItemCoverage: createValuedMetric(coverageScore, 'ratio'),
    },
    assertions,
    durationMs: Math.round(performance.now() - startedAt),
  };
}
