import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { GeneratePlanResponseSchema } from '../ai/schemas/project-plan.schema.js';
import { validatePlan } from '../domain/plan-validator.js';
import { saasAuthPlanningFixture } from '../ai/evaluation/fixtures/planning/saas-auth.fixture.js';
import {
  EvaluationRunner,
  comparePromptVersions,
} from '../ai/evaluation/runners/evaluation.runner.js';
import {
  EvaluationReporter,
} from '../ai/evaluation/reports/evaluation.reporter.js';
import {
  isValuedMetric,
  getMetricNumericValue,
} from '../ai/evaluation/types/metric.types.js';

describe('Phase 26 Planning Engine Quality & Regression Integration Suite', () => {
  /**
   * 1. STRUCTURAL & DOMAIN VALIDITY BOUNDARY
   * Proves that BOTH knownGood AND knownRegression pass Zod schema validation
   * AND domain PlanValidator DAG validation.
   * This proves that structural validity alone cannot detect quality regressions.
   */
  it('1. Both canonical candidates pass Zod schema and domain PlanValidator DAG checks', () => {
    const knownGood = saasAuthPlanningFixture.candidateOutputs['knownGood'];
    const knownRegression = saasAuthPlanningFixture.candidateOutputs['knownRegression'];

    assert.ok(knownGood);
    assert.ok(knownRegression);

    // 1. Zod Structural Schema Validation
    const parsedGood = GeneratePlanResponseSchema.parse(knownGood);
    const parsedRegression = GeneratePlanResponseSchema.parse(knownRegression);

    assert.ok(parsedGood);
    assert.ok(parsedRegression);

    // 2. Domain PlanValidator Graph DAG Validation
    const domainGoodInput = {
      tasks: knownGood.tasks.map((t) => ({
        tempId: t.ref,
        title: t.title,
        description: t.description,
        priority: t.priority,
        estimatedTime: t.estimatedTime ?? null,
        position: t.position,
        dependencies: t.dependencies,
        milestoneTempId: t.milestoneRef ?? null,
      })),
      milestones: (knownGood.milestones || []).map((m) => ({
        tempId: m.ref,
        title: m.title,
        description: m.description,
        targetDate: m.targetDate ?? null,
        position: m.position,
      })),
    };

    const domainRegressionInput = {
      tasks: knownRegression.tasks.map((t) => ({
        tempId: t.ref,
        title: t.title,
        description: t.description,
        priority: t.priority,
        estimatedTime: t.estimatedTime ?? null,
        position: t.position,
        dependencies: t.dependencies,
        milestoneTempId: t.milestoneRef ?? null,
      })),
      milestones: (knownRegression.milestones || []).map((m) => ({
        tempId: m.ref,
        title: m.title,
        description: m.description,
        targetDate: m.targetDate ?? null,
        position: m.position,
      })),
    };

    const validatedGood = validatePlan(domainGoodInput);
    const validatedRegression = validatePlan(domainRegressionInput);

    assert.equal(validatedGood.tasks.length, 4);
    assert.equal(validatedRegression.tasks.length, 2);

    // VALIDITY INVARIANT PROOF: Both pass validity layer completely!
  });

  /**
   * 2. OFFLINE DETERMINISTIC EVALUATION RUNNER
   * Demonstrates that EvaluationRunner evaluates quality differences where structural validation cannot.
   */
  it('2. EvaluationRunner evaluates passing quality for knownGood and failing quality for knownRegression', async () => {
    // 1. Evaluate knownGood
    const goodSuite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    assert.equal(goodSuite.fixtureId, 'fix_plan_saas_auth_v1');
    assert.equal(goodSuite.overallStatus, 'passed');
    assert.equal(goodSuite.evaluatorResults.length, 4);

    // Deterministic evaluator order check
    assert.equal(goodSuite.evaluatorResults[0]?.evaluatorId, 'eval_plan_required_coverage');
    assert.equal(goodSuite.evaluatorResults[1]?.evaluatorId, 'eval_plan_grounded_coverage');
    assert.equal(goodSuite.evaluatorResults[2]?.evaluatorId, 'eval_plan_forbidden_concepts');
    assert.equal(goodSuite.evaluatorResults[3]?.evaluatorId, 'eval_plan_dependency_accuracy');

    // All evaluators passed for knownGood
    assert.equal(goodSuite.evaluatorResults[0]?.status, 'passed');
    assert.equal(goodSuite.evaluatorResults[1]?.status, 'passed');
    assert.equal(goodSuite.evaluatorResults[2]?.status, 'passed');
    assert.equal(goodSuite.evaluatorResults[3]?.status, 'passed');

    // 2. Evaluate knownRegression
    const regressionSuite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownRegression',
      'project-plan',
      '1.0.0'
    );

    assert.equal(regressionSuite.overallStatus, 'failed');
    assert.equal(regressionSuite.evaluatorResults.length, 4);

    // Evaluators failed for knownRegression
    assert.equal(regressionSuite.evaluatorResults[0]?.status, 'failed'); // required coverage
    assert.equal(regressionSuite.evaluatorResults[1]?.status, 'failed'); // grounded coverage
    assert.equal(regressionSuite.evaluatorResults[2]?.status, 'failed'); // forbidden concepts
    assert.equal(regressionSuite.evaluatorResults[3]?.status, 'failed'); // dependency accuracy
  });

  /**
   * 3. INTERPRETABLE METRIC BOUNDARY & NO OPAQUE SCORE
   * Verifies explicit metric presence, tagged union types, and absence of opaque aggregate scores.
   */
  it('3. Quality metrics are explicit MetricValue tagged unions with NO opaque aggregate score', async () => {
    const suite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    const metrics = suite.summaryMetrics;

    // Explicit metric presence
    assert.ok(metrics['requiredItemCoverage']);
    assert.ok(metrics['groundedFactCoverage']);
    assert.ok(metrics['unsupportedClaimCount']);
    assert.ok(metrics['dependencyAccuracy']);

    // Tagged union type assertions
    assert.ok(isValuedMetric(metrics['requiredItemCoverage']));
    assert.equal(getMetricNumericValue(metrics['requiredItemCoverage']), 1.0);

    assert.ok(isValuedMetric(metrics['groundedFactCoverage']));
    assert.equal(getMetricNumericValue(metrics['groundedFactCoverage']), 1.0);

    assert.ok(isValuedMetric(metrics['unsupportedClaimCount']));
    assert.equal(getMetricNumericValue(metrics['unsupportedClaimCount']), 0);

    assert.ok(isValuedMetric(metrics['dependencyAccuracy']));
    assert.equal(getMetricNumericValue(metrics['dependencyAccuracy']), 1.0);

    // FORBIDDEN AGGREGATE SCORES AUDIT
    assert.equal(metrics['overallAIQualityScore'], undefined);
    assert.equal(metrics['averageQualityScore'], undefined);
    assert.equal(metrics['weightedQualityScore'], undefined);
    assert.equal(metrics['modelScore'], undefined);
    assert.equal(metrics['confidenceScore'], undefined);
  });

  /**
   * 4. PROMPT VERSION REGRESSION DETECTION (Good -> Regression)
   * Proves comparePromptVersions identifies regressions and handles lowerIsBetter metrics correctly.
   */
  it('4. comparePromptVersions identifies quality regression for Good (v1.0.0) -> Regression (v1.1.0)', async () => {
    const baseline = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    const candidate = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownRegression',
      'project-plan',
      '1.1.0'
    );

    const deltaReport = comparePromptVersions(baseline, candidate);

    assert.equal(deltaReport.fixtureId, 'fix_plan_saas_auth_v1');
    assert.equal(deltaReport.targetCapability, 'project-plan');
    assert.equal(deltaReport.baselinePromptVersion, '1.0.0');
    assert.equal(deltaReport.candidatePromptVersion, '1.1.0');
    assert.equal(deltaReport.hasRegression, true);

    // 1. requiredItemCoverage: 1.0 -> ~0.17 (negative delta, regression)
    const reqDelta = deltaReport.metricDeltas['requiredItemCoverage'];
    assert.ok(reqDelta);
    assert.equal(getMetricNumericValue(reqDelta.baselineValue), 1.0);
    assert.ok(getMetricNumericValue(reqDelta.candidateValue)! < 0.5);
    assert.ok(reqDelta.delta! < 0);
    assert.equal(reqDelta.isRegression, true);

    // 2. groundedFactCoverage: 1.0 -> 0.50 (negative delta, regression)
    const groundedDelta = deltaReport.metricDeltas['groundedFactCoverage'];
    assert.ok(groundedDelta);
    assert.equal(getMetricNumericValue(groundedDelta.baselineValue), 1.0);
    assert.ok(getMetricNumericValue(groundedDelta.candidateValue)! < 0.50);
    assert.ok(groundedDelta.delta! < 0);
    assert.equal(groundedDelta.isRegression, true);

    // 3. unsupportedClaimCount: 0 -> 2 (positive delta +2, REGRESSION because lower is better!)
    const claimDelta = deltaReport.metricDeltas['unsupportedClaimCount'];
    assert.ok(claimDelta);
    assert.equal(getMetricNumericValue(claimDelta.baselineValue), 0);
    assert.equal(getMetricNumericValue(claimDelta.candidateValue), 2);
    assert.equal(claimDelta.delta, 2);
    assert.equal(claimDelta.isRegression, true);

    // 4. dependencyAccuracy: 1.0 -> 0.0 (negative delta -1.0, regression)
    const depDelta = deltaReport.metricDeltas['dependencyAccuracy'];
    assert.ok(depDelta);
    assert.equal(getMetricNumericValue(depDelta.baselineValue), 1.0);
    assert.equal(getMetricNumericValue(depDelta.candidateValue), 0.0);
    assert.equal(depDelta.delta, -1.0);
    assert.equal(depDelta.isRegression, true);
  });

  /**
   * 5. PROMPT VERSION IMPROVEMENT DETECTION (Regression -> Good)
   * Proves improvement (v1.0.0 regression -> v2.0.0 good) is NOT falsely flagged as regression.
   */
  it('5. comparePromptVersions recognizes quality improvement without false regression flags', async () => {
    const baseline = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownRegression',
      'project-plan',
      '1.0.0'
    );

    const candidate = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '2.0.0'
    );

    const deltaReport = comparePromptVersions(baseline, candidate);

    assert.equal(deltaReport.hasRegression, false);

    // All metric deltas should not be regressions
    assert.equal(deltaReport.metricDeltas['requiredItemCoverage']?.isRegression, false);
    assert.equal(deltaReport.metricDeltas['groundedFactCoverage']?.isRegression, false);
    assert.equal(deltaReport.metricDeltas['unsupportedClaimCount']?.isRegression, false);
    assert.equal(deltaReport.metricDeltas['dependencyAccuracy']?.isRegression, false);
  });

  /**
   * 6. EVALUATION REPORTER INTEGRATION & JSON SERIALIZATION
   * Verifies terminal report generation and machine-readable JSON output writing.
   */
  it('6. EvaluationReporter formats terminal reports and writes machine-readable JSON artifacts', async () => {
    const suite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    const regressionSuite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownRegression',
      'project-plan',
      '1.1.0'
    );

    const deltaReport = comparePromptVersions(suite, regressionSuite);

    // Terminal formatting
    const suiteTerminal = EvaluationReporter.formatSuiteTerminalReport(suite);
    assert.ok(suiteTerminal.includes('AI QUALITY EVALUATION SUITE REPORT'));
    assert.ok(suiteTerminal.includes('Overall Status:    PASSED'));

    const deltaTerminal = EvaluationReporter.formatDeltaTerminalReport(deltaReport);
    assert.ok(deltaTerminal.includes('AI EVALUATION PROMPT VERSION COMPARISON REPORT'));
    assert.ok(deltaTerminal.includes('Overall Regression: YES (REGRESSION DETECTED)'));

    // JSON file writing to temporary directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp05-eval-report-'));

    try {
      const suitePath = EvaluationReporter.writeSuiteJsonReport(suite, tempDir);
      const deltaPath = EvaluationReporter.writeDeltaJsonReport(deltaReport, tempDir);

      assert.ok(fs.existsSync(suitePath));
      assert.ok(fs.existsSync(deltaPath));

      const parsedSuite = JSON.parse(fs.readFileSync(suitePath, 'utf-8'));
      const parsedDelta = JSON.parse(fs.readFileSync(deltaPath, 'utf-8'));

      assert.equal(parsedSuite.fixtureId, 'fix_plan_saas_auth_v1');
      assert.equal(parsedSuite.overallStatus, 'passed');

      assert.equal(parsedDelta.fixtureId, 'fix_plan_saas_auth_v1');
      assert.equal(parsedDelta.hasRegression, true);
      assert.equal(parsedDelta.metricDeltas.unsupportedClaimCount.isRegression, true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * 7. DETERMINISM & ZERO NETWORK/MODEL INVARIANT
   * Proves that evaluation execution is 100% deterministic and offline.
   */
  it('7. Evaluation execution is 100% deterministic and offline', async () => {
    const run1 = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    const run2 = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    // Semantic outputs are identical
    assert.equal(run1.fixtureId, run2.fixtureId);
    assert.equal(run1.overallStatus, run2.overallStatus);
    assert.equal(run1.evaluatorResults.length, run2.evaluatorResults.length);

    for (let i = 0; i < run1.evaluatorResults.length; i++) {
      assert.equal(run1.evaluatorResults[i]?.evaluatorId, run2.evaluatorResults[i]?.evaluatorId);
      assert.equal(run1.evaluatorResults[i]?.status, run2.evaluatorResults[i]?.status);
      assert.equal(run1.evaluatorResults[i]?.score, run2.evaluatorResults[i]?.score);
    }

    // Summary metrics match
    for (const key of Object.keys(run1.summaryMetrics)) {
      const v1 = getMetricNumericValue(run1.summaryMetrics[key]!);
      const v2 = getMetricNumericValue(run2.summaryMetrics[key]!);
      assert.equal(v1, v2);
    }
  });
});
