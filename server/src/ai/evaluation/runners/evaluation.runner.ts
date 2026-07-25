import { GeneratePlanResponse } from '../../schemas/project-plan.schema.js';
import { ProjectCopilotResponse } from '../../schemas/project-copilot.schema.js';
import {
  EvaluationFixture,
  EvaluationResult,
  SuiteEvaluationResult,
  MetricDelta,
  EvaluationDeltaReport,
} from '../types/evaluation.types.js';
import {
  MetricValue,
  computeMetricDelta,
  createUnknownMetric,
  createValuedMetric,
  createNotApplicableMetric,
} from '../types/metric.types.js';
import { ProjectPlanGroundTruth } from '../fixtures/schemas/fixture.schema.js';
import { CopilotFixtureInput, ProjectCopilotGroundTruth } from '../fixtures/schemas/copilot-fixture.schema.js';
import {
  evaluateRequiredCoverage,
  EVAL_REQUIRED_COVERAGE_ID,
  EVAL_REQUIRED_COVERAGE_NAME,
  evaluateGroundedCoverage,
  EVAL_GROUNDED_COVERAGE_ID,
  EVAL_GROUNDED_COVERAGE_NAME,
  evaluateForbiddenConcepts,
  EVAL_FORBIDDEN_CONCEPTS_ID,
  EVAL_FORBIDDEN_CONCEPTS_NAME,
  evaluateDependencyAccuracy,
  EVAL_DEPENDENCY_ACCURACY_ID,
  EVAL_DEPENDENCY_ACCURACY_NAME,
  evaluateCopilotReferenceAccuracy,
  EVAL_COPILOT_REF_ACCURACY_ID,
  EVAL_COPILOT_REF_ACCURACY_NAME,
} from '../evaluators/index.js';
import { containsKeyword } from '../utils/normalization.utils.js';

/**
 * Metric direction metadata: determines whether higher or lower values represent improvement.
 * - 'higher_is_better': Higher values represent better quality (e.g. coverage, accuracy).
 * - 'lower_is_better': Lower values represent better quality (e.g. unsupported claim counts).
 */
export const METRIC_DIRECTIONS: Record<string, 'higher_is_better' | 'lower_is_better'> = {
  requiredItemCoverage: 'higher_is_better',
  groundedFactCoverage: 'higher_is_better',
  unsupportedClaimCount: 'lower_is_better',
  dependencyAccuracy: 'higher_is_better',
  referenceAccuracy: 'higher_is_better',
  invalidReferenceCount: 'lower_is_better',
};

export class EvaluationRunner {
  /**
   * Runs the four Phase 26 deterministic evaluators against a golden planning fixture candidate.
   *
   * @param fixture The golden evaluation fixture envelope.
   * @param candidateKey Identifier of candidate output within fixture (e.g. 'knownGood', 'knownRegression').
   * @param promptName Name of the prompt template being evaluated (e.g. 'project-plan').
   * @param promptVersion Version tag of the prompt being evaluated (e.g. '1.0.0').
   */
  public static async evaluatePlanningFixture(
    fixture: EvaluationFixture<
      { description: string },
      ProjectPlanGroundTruth,
      GeneratePlanResponse
    >,
    candidateKey: string,
    promptName: string,
    promptVersion: string
  ): Promise<SuiteEvaluationResult> {
    const candidateOutput = fixture.candidateOutputs[candidateKey];
    if (!candidateOutput) {
      throw new Error(
        `Candidate '${candidateKey}' not found in fixture '${fixture.fixtureId}'. Available candidates: [${Object.keys(
          fixture.candidateOutputs
        ).join(', ')}].`
      );
    }

    const startedAt = performance.now();
    const evaluatorResults: EvaluationResult[] = [];

    // 1. evaluateRequiredCoverage
    try {
      const res = evaluateRequiredCoverage(candidateOutput, fixture.groundTruth);
      evaluatorResults.push(res);
    } catch (err) {
      evaluatorResults.push({
        evaluatorId: EVAL_REQUIRED_COVERAGE_ID,
        evaluatorName: EVAL_REQUIRED_COVERAGE_NAME,
        status: 'error',
        score: null,
        metrics: {},
        assertions: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      });
    }

    // 2. evaluateGroundedCoverage
    try {
      const res = evaluateGroundedCoverage(candidateOutput, fixture.groundTruth);
      evaluatorResults.push(res);
    } catch (err) {
      evaluatorResults.push({
        evaluatorId: EVAL_GROUNDED_COVERAGE_ID,
        evaluatorName: EVAL_GROUNDED_COVERAGE_NAME,
        status: 'error',
        score: null,
        metrics: {},
        assertions: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      });
    }

    // 3. evaluateForbiddenConcepts
    try {
      const res = evaluateForbiddenConcepts(candidateOutput, fixture.groundTruth);
      evaluatorResults.push(res);
    } catch (err) {
      evaluatorResults.push({
        evaluatorId: EVAL_FORBIDDEN_CONCEPTS_ID,
        evaluatorName: EVAL_FORBIDDEN_CONCEPTS_NAME,
        status: 'error',
        score: null,
        metrics: {},
        assertions: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      });
    }

    // 4. evaluateDependencyAccuracy
    try {
      const res = evaluateDependencyAccuracy(candidateOutput, fixture.groundTruth);
      evaluatorResults.push(res);
    } catch (err) {
      evaluatorResults.push({
        evaluatorId: EVAL_DEPENDENCY_ACCURACY_ID,
        evaluatorName: EVAL_DEPENDENCY_ACCURACY_NAME,
        status: 'error',
        score: null,
        metrics: {},
        assertions: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      });
    }

    const durationMs = Math.round(performance.now() - startedAt);

    // Compute overall suite status
    let overallStatus: 'passed' | 'failed' | 'error' = 'passed';
    if (evaluatorResults.some((r) => r.status === 'error')) {
      overallStatus = 'error';
    } else if (evaluatorResults.some((r) => r.status === 'failed')) {
      overallStatus = 'failed';
    }

    // Aggregate summary metrics across evaluator results
    const summaryMetrics: Record<string, MetricValue> = {};
    for (const res of evaluatorResults) {
      for (const [key, val] of Object.entries(res.metrics)) {
        summaryMetrics[key] = val;
      }
    }

    return {
      fixtureId: fixture.fixtureId,
      scenarioName: fixture.name,
      targetCapability: fixture.targetCapability,
      timestamp: new Date().toISOString(),
      promptName,
      promptVersion,
      overallStatus,
      evaluatorResults,
      summaryMetrics,
      durationMs,
    };
  }

  /**
   * Compares two SuiteEvaluationResult runs (baseline vs candidate prompt version)
   * and produces a deterministic EvaluationDeltaReport.
   */
  public static comparePromptVersions(
    baselineSuite: SuiteEvaluationResult,
    candidateSuite: SuiteEvaluationResult
  ): EvaluationDeltaReport {
    if (baselineSuite.fixtureId !== candidateSuite.fixtureId) {
      throw new Error(
        `Cannot compare evaluation suites from different fixtures: '${baselineSuite.fixtureId}' vs '${candidateSuite.fixtureId}'.`
      );
    }

    const allMetricKeys = Array.from(
      new Set([
        ...Object.keys(baselineSuite.summaryMetrics),
        ...Object.keys(candidateSuite.summaryMetrics),
      ])
    );

    const metricDeltas: Record<string, MetricDelta> = {};
    let hasRegression = false;

    for (const key of allMetricKeys) {
      const baselineValue =
        baselineSuite.summaryMetrics[key] ||
        createUnknownMetric(`Metric '${key}' missing in baseline suite`);
      const candidateValue =
        candidateSuite.summaryMetrics[key] ||
        createUnknownMetric(`Metric '${key}' missing in candidate suite`);

      const lowerIsBetter = METRIC_DIRECTIONS[key] === 'lower_is_better';
      const { delta, isRegression } = computeMetricDelta(
        baselineValue,
        candidateValue,
        lowerIsBetter
      );

      if (isRegression) {
        hasRegression = true;
      }

      metricDeltas[key] = {
        baselineValue,
        candidateValue,
        delta,
        isRegression,
      };
    }

    return {
      fixtureId: baselineSuite.fixtureId,
      targetCapability: baselineSuite.targetCapability,
      baselinePromptVersion: baselineSuite.promptVersion,
      candidatePromptVersion: candidateSuite.promptVersion,
      metricDeltas,
      hasRegression,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Runs deterministic evaluators against a golden Copilot fixture candidate.
   *
   * Evaluates:
   * 1. Copilot Required Concept Coverage
   * 2. Copilot Forbidden Concept Detection
   * 3. Copilot Reference Accuracy
   */
  public static async evaluateCopilotFixture(
    fixture: EvaluationFixture<
      CopilotFixtureInput,
      ProjectCopilotGroundTruth,
      ProjectCopilotResponse
    >,
    candidateKey: string,
    promptName: string,
    promptVersion: string
  ): Promise<SuiteEvaluationResult> {
    const candidateOutput = fixture.candidateOutputs[candidateKey];
    if (!candidateOutput) {
      throw new Error(
        `Candidate '${candidateKey}' not found in fixture '${fixture.fixtureId}'. Available candidates: [${Object.keys(
          fixture.candidateOutputs
        ).join(', ')}].`
      );
    }

    const startedAt = performance.now();
    const evaluatorResults: EvaluationResult[] = [];

    // 1. evaluateCopilotRequiredCoverage
    try {
      const requiredConcepts = fixture.groundTruth.expectedConcepts.filter((c) => c.required !== false);
      const assertions = [];
      let matchedCount = 0;

      for (const concept of requiredConcepts) {
        const isMatched = containsKeyword(candidateOutput.answer, concept.keywords);
        if (isMatched) matchedCount++;

        assertions.push({
          id: `assert_copilot_concept_${concept.id}`,
          description: `Required concept '${concept.concept}' present`,
          passed: isMatched,
          expected: `Answer containing keywords [${concept.keywords.join(', ')}]`,
          actual: isMatched ? 'Matched concept in candidate answer' : 'No matching concept in candidate answer',
        });
      }

      const totalRequired = requiredConcepts.length;
      const coverageScore = totalRequired > 0 ? matchedCount / totalRequired : 1.0;
      const passed = coverageScore >= 0.75;

      evaluatorResults.push({
        evaluatorId: EVAL_REQUIRED_COVERAGE_ID,
        evaluatorName: EVAL_REQUIRED_COVERAGE_NAME,
        status: passed ? 'passed' : 'failed',
        score: coverageScore,
        metrics: {
          requiredItemCoverage: totalRequired > 0
            ? createValuedMetric(coverageScore, 'ratio')
            : createNotApplicableMetric('No required concepts declared'),
        },
        assertions,
        durationMs: 0,
      });
    } catch (err) {
      evaluatorResults.push({
        evaluatorId: EVAL_REQUIRED_COVERAGE_ID,
        evaluatorName: EVAL_REQUIRED_COVERAGE_NAME,
        status: 'error',
        score: null,
        metrics: {},
        assertions: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      });
    }

    // 2. evaluateCopilotForbiddenConcepts
    try {
      const forbiddenClaims = fixture.groundTruth.forbiddenClaims || [];
      const assertions = [];
      let detectedCount = 0;

      for (const claim of forbiddenClaims) {
        const isDetected = containsKeyword(candidateOutput.answer, [claim]);
        if (isDetected) detectedCount++;

        assertions.push({
          id: `assert_forbidden_${claim.toLowerCase().replace(/[^\w]/g, '_')}`,
          description: `Forbidden claim '${claim}' absent`,
          passed: !isDetected,
          expected: `Claim '${claim}' absent`,
          actual: isDetected ? `Forbidden claim '${claim}' DETECTED` : `Claim '${claim}' absent`,
        });
      }

      const passed = detectedCount === 0;

      evaluatorResults.push({
        evaluatorId: EVAL_FORBIDDEN_CONCEPTS_ID,
        evaluatorName: EVAL_FORBIDDEN_CONCEPTS_NAME,
        status: passed ? 'passed' : 'failed',
        score: null,
        metrics: {
          unsupportedClaimCount: createValuedMetric(detectedCount, 'claims'),
        },
        assertions,
        durationMs: 0,
      });
    } catch (err) {
      evaluatorResults.push({
        evaluatorId: EVAL_FORBIDDEN_CONCEPTS_ID,
        evaluatorName: EVAL_FORBIDDEN_CONCEPTS_NAME,
        status: 'error',
        score: null,
        metrics: {},
        assertions: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      });
    }

    // 3. evaluateCopilotReferenceAccuracy
    try {
      const res = evaluateCopilotReferenceAccuracy(candidateOutput, fixture.groundTruth);
      evaluatorResults.push(res);
    } catch (err) {
      evaluatorResults.push({
        evaluatorId: EVAL_COPILOT_REF_ACCURACY_ID,
        evaluatorName: EVAL_COPILOT_REF_ACCURACY_NAME,
        status: 'error',
        score: null,
        metrics: {},
        assertions: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      });
    }

    const durationMs = Math.round(performance.now() - startedAt);

    let overallStatus: 'passed' | 'failed' | 'error' = 'passed';
    if (evaluatorResults.some((r) => r.status === 'error')) {
      overallStatus = 'error';
    } else if (evaluatorResults.some((r) => r.status === 'failed')) {
      overallStatus = 'failed';
    }

    const summaryMetrics: Record<string, MetricValue> = {};
    for (const res of evaluatorResults) {
      for (const [key, val] of Object.entries(res.metrics)) {
        summaryMetrics[key] = val;
      }
    }

    return {
      fixtureId: fixture.fixtureId,
      scenarioName: fixture.name,
      targetCapability: fixture.targetCapability,
      timestamp: new Date().toISOString(),
      promptName,
      promptVersion,
      overallStatus,
      evaluatorResults,
      summaryMetrics,
      durationMs,
    };
  }
}

/**
 * Pure function helper for evaluatePlanningFixture.
 */
export const runEvaluationSuite = EvaluationRunner.evaluatePlanningFixture;

/**
 * Pure function helper for evaluateCopilotFixture.
 */
export const runCopilotEvaluationSuite = EvaluationRunner.evaluateCopilotFixture;

/**
 * Pure function helper for comparePromptVersions.
 */
export const comparePromptVersions = EvaluationRunner.comparePromptVersions;
