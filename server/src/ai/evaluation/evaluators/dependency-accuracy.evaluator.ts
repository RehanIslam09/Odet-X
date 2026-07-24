import { GeneratePlanResponse, AIPlanTask } from '../../schemas/project-plan.schema.js';
import { EvaluationAssertion, EvaluationResult } from '../types/evaluation.types.js';
import { createNotApplicableMetric, createValuedMetric } from '../types/metric.types.js';
import { ProjectPlanGroundTruth } from '../fixtures/schemas/fixture.schema.js';
import { containsKeyword } from '../utils/normalization.utils.js';

export const EVAL_DEPENDENCY_ACCURACY_ID = 'eval_plan_dependency_accuracy';
export const EVAL_DEPENDENCY_ACCURACY_NAME = 'Dependency Accuracy Evaluator';

/**
 * Evaluates whether fixture-declared prerequisite relationships are accurately expressed
 * in candidate task dependency arrays.
 *
 * PRODUCTION SEMANTICS:
 * dependentTask.dependencies = [prerequisiteTask.ref]
 * Means dependentTask depends on prerequisiteTask.
 */
export function evaluateDependencyAccuracy(
  candidate: GeneratePlanResponse,
  groundTruth: ProjectPlanGroundTruth
): EvaluationResult {
  const startedAt = performance.now();
  const assertions: EvaluationAssertion[] = [];

  const expectedEdges = groundTruth.expectedDependencyEdges || [];
  const totalEdges = expectedEdges.length;

  if (totalEdges === 0) {
    return {
      evaluatorId: EVAL_DEPENDENCY_ACCURACY_ID,
      evaluatorName: EVAL_DEPENDENCY_ACCURACY_NAME,
      status: 'passed',
      score: null,
      metrics: {
        dependencyAccuracy: createNotApplicableMetric('No expected dependency edges defined in ground truth'),
      },
      assertions: [
        {
          id: 'assert_no_dependency_edges',
          description: 'Verified expected dependency edges count',
          passed: true,
          expected: '0 expected edges',
          actual: '0 expected edges',
        },
      ],
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  let satisfiedCount = 0;

  for (const edge of expectedEdges) {
    // Locate concept keyword definitions
    const prereqConceptDef = groundTruth.expectedTasks.find((t) => t.concept === edge.prerequisiteConcept);
    const depConceptDef = groundTruth.expectedTasks.find((t) => t.concept === edge.dependentConcept);

    const prereqKeywords = prereqConceptDef?.keywords || [edge.prerequisiteConcept];
    const depKeywords = depConceptDef?.keywords || [edge.dependentConcept];

    // Find matching candidate tasks
    const prereqCandidateTasks = candidate.tasks.filter((task: AIPlanTask) => {
      const text = `${task.title} ${task.description || ''}`;
      return containsKeyword(text, prereqKeywords);
    });

    const depCandidateTasks = candidate.tasks.filter((task: AIPlanTask) => {
      const text = `${task.title} ${task.description || ''}`;
      return containsKeyword(text, depKeywords);
    });

    let edgeSatisfied = false;
    let detailMessage: string;

    if (prereqCandidateTasks.length === 0) {
      detailMessage = `Prerequisite concept task '${edge.prerequisiteConcept}' missing from candidate`;
    } else if (depCandidateTasks.length === 0) {
      detailMessage = `Dependent concept task '${edge.dependentConcept}' missing from candidate`;
    } else {
      // Check if dependent candidate task references prerequisite candidate task ref in dependencies array
      const prereqRefs = new Set(prereqCandidateTasks.map((t: AIPlanTask) => t.ref));
      const matchingDepTask = depCandidateTasks.find((depTask: AIPlanTask) =>
        depTask.dependencies.some((ref: string) => prereqRefs.has(ref))
      );

      if (matchingDepTask) {
        edgeSatisfied = true;
        detailMessage = `Satisfied: Candidate dependent task ref '${matchingDepTask.ref}' explicitly lists prerequisite task in dependencies`;
      } else {
        detailMessage = `Failed: Candidate dependent task '${edge.dependentConcept}' does not list prerequisite task in dependencies`;
      }
    }

    if (edgeSatisfied) satisfiedCount++;

    assertions.push({
      id: `assert_dependency_${edge.prerequisiteConcept.toLowerCase().replace(/[^\w]/g, '_')}_to_${edge.dependentConcept.toLowerCase().replace(/[^\w]/g, '_')}`,
      description: `Dependency edge: '${edge.prerequisiteConcept}' -> '${edge.dependentConcept}'`,
      passed: edgeSatisfied,
      expected: `Dependent '${edge.dependentConcept}' references Prerequisite '${edge.prerequisiteConcept}'`,
      actual: detailMessage,
    });
  }

  const accuracyScore = satisfiedCount / totalEdges;
  const passed = accuracyScore === 1.0;

  return {
    evaluatorId: EVAL_DEPENDENCY_ACCURACY_ID,
    evaluatorName: EVAL_DEPENDENCY_ACCURACY_NAME,
    status: passed ? 'passed' : 'failed',
    score: accuracyScore,
    metrics: {
      dependencyAccuracy: createValuedMetric(accuracyScore, 'ratio'),
    },
    assertions,
    durationMs: Math.round(performance.now() - startedAt),
  };
}
