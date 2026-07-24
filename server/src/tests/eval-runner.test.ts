import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EvaluationRunner, comparePromptVersions } from '../ai/evaluation/runners/evaluation.runner.js';
import { saasAuthPlanningFixture } from '../ai/evaluation/fixtures/planning/saas-auth.fixture.js';
import { getMetricNumericValue } from '../ai/evaluation/types/metric.types.js';

describe('WP-04 EvaluationRunner & Prompt Version Comparison Unit Tests', () => {
  it('1. Running knownGood returns all four evaluator results in deterministic order and passed overallStatus', async () => {
    const suite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    assert.equal(suite.fixtureId, 'fix_plan_saas_auth_v1');
    assert.equal(suite.targetCapability, 'project-plan');
    assert.equal(suite.promptName, 'project-plan');
    assert.equal(suite.promptVersion, '1.0.0');
    assert.equal(suite.overallStatus, 'passed');
    assert.equal(suite.evaluatorResults.length, 4);

    // Verify deterministic evaluator order
    assert.equal(suite.evaluatorResults[0]?.evaluatorId, 'eval_plan_required_coverage');
    assert.equal(suite.evaluatorResults[1]?.evaluatorId, 'eval_plan_grounded_coverage');
    assert.equal(suite.evaluatorResults[2]?.evaluatorId, 'eval_plan_forbidden_concepts');
    assert.equal(suite.evaluatorResults[3]?.evaluatorId, 'eval_plan_dependency_accuracy');

    // All four passed
    assert.equal(suite.evaluatorResults[0]?.status, 'passed');
    assert.equal(suite.evaluatorResults[1]?.status, 'passed');
    assert.equal(suite.evaluatorResults[2]?.status, 'passed');
    assert.equal(suite.evaluatorResults[3]?.status, 'passed');
  });

  it('2. Running knownRegression returns all four evaluator results and failed overallStatus', async () => {
    const suite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownRegression',
      'project-plan',
      '1.0.0'
    );

    assert.equal(suite.overallStatus, 'failed');
    assert.equal(suite.evaluatorResults.length, 4);

    // Verify evaluators failed
    assert.equal(suite.evaluatorResults[0]?.status, 'failed'); // required coverage
    assert.equal(suite.evaluatorResults[1]?.status, 'failed'); // grounded coverage
    assert.equal(suite.evaluatorResults[2]?.status, 'failed'); // forbidden concepts
    assert.equal(suite.evaluatorResults[3]?.status, 'failed'); // dependency accuracy
  });

  it('3. summaryMetrics exposes explicit metrics without opaque aggregate score', async () => {
    const suite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    const keys = Object.keys(suite.summaryMetrics);
    assert.ok(keys.includes('requiredItemCoverage'));
    assert.ok(keys.includes('groundedFactCoverage'));
    assert.ok(keys.includes('unsupportedClaimCount'));
    assert.ok(keys.includes('dependencyAccuracy'));

    // FORBIDDEN METRIC NAMES AUDIT: No aggregate quality score exists
    assert.equal(suite.summaryMetrics['overallAIQualityScore'], undefined);
    assert.equal(suite.summaryMetrics['averageQualityScore'], undefined);
    assert.equal(suite.summaryMetrics['weightedQualityScore'], undefined);
    assert.equal(suite.summaryMetrics['modelScore'], undefined);
  });

  it('4. comparePromptVersions detects regressions correctly for knownGood (baseline) vs knownRegression (candidate)', async () => {
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
    assert.equal(deltaReport.baselinePromptVersion, '1.0.0');
    assert.equal(deltaReport.candidatePromptVersion, '1.1.0');
    assert.equal(deltaReport.hasRegression, true);

    // Check requiredItemCoverage regression
    const reqDelta = deltaReport.metricDeltas['requiredItemCoverage'];
    assert.ok(reqDelta);
    assert.equal(getMetricNumericValue(reqDelta.baselineValue), 1.0);
    assert.ok(getMetricNumericValue(reqDelta.candidateValue)! < 0.5);
    assert.equal(reqDelta.isRegression, true);

    // Check unsupportedClaimCount regression (LOWER IS BETTER)
    const claimDelta = deltaReport.metricDeltas['unsupportedClaimCount'];
    assert.ok(claimDelta);
    assert.equal(getMetricNumericValue(claimDelta.baselineValue), 0);
    assert.equal(getMetricNumericValue(claimDelta.candidateValue), 2);
    assert.equal(claimDelta.delta, 2);
    assert.equal(claimDelta.isRegression, true);
  });

  it('5. comparePromptVersions does NOT falsely flag improvement as regression (knownRegression -> knownGood)', async () => {
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
    assert.equal(deltaReport.metricDeltas['requiredItemCoverage']?.isRegression, false);
    assert.equal(deltaReport.metricDeltas['unsupportedClaimCount']?.isRegression, false);
  });

  it('6. Throws error when attempting to evaluate invalid candidate key', async () => {
    await assert.rejects(
      async () => {
        await EvaluationRunner.evaluatePlanningFixture(
          saasAuthPlanningFixture,
          'nonExistentCandidate',
          'project-plan',
          '1.0.0'
        );
      },
      {
        message: /Candidate 'nonExistentCandidate' not found in fixture/,
      }
    );
  });
});
