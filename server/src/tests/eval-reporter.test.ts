import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EvaluationRunner, comparePromptVersions } from '../ai/evaluation/runners/evaluation.runner.js';
import { saasAuthPlanningFixture } from '../ai/evaluation/fixtures/planning/saas-auth.fixture.js';
import {
  EvaluationReporter,
  sanitizeFilenameComponent,
} from '../ai/evaluation/reports/evaluation.reporter.js';

describe('WP-04 EvaluationReporter Unit Tests', () => {
  it('1. sanitizeFilenameComponent strips unsafe path traversal and special characters', () => {
    assert.equal(sanitizeFilenameComponent('fix_plan_saas_auth_v1'), 'fix_plan_saas_auth_v1');
    const traversal = sanitizeFilenameComponent('../../etc/passwd');
    assert.ok(!traversal.includes('..'));
    assert.ok(!traversal.includes('/'));
    assert.ok(!traversal.includes('\\'));
    assert.equal(sanitizeFilenameComponent('prompt@1.0.0-beta/v1'), 'prompt_1_0_0-beta_v1');
    assert.equal(sanitizeFilenameComponent(''), 'unknown');
  });

  it('2. formatSuiteTerminalReport produces formatted terminal text output', async () => {
    const suite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    const reportText = EvaluationReporter.formatSuiteTerminalReport(suite);

    assert.ok(reportText.includes('AI QUALITY EVALUATION SUITE REPORT'));
    assert.ok(reportText.includes('Fixture ID:        fix_plan_saas_auth_v1'));
    assert.ok(reportText.includes('Prompt Version:    1.0.0'));
    assert.ok(reportText.includes('Overall Status:    PASSED'));
    assert.ok(reportText.includes('requiredItemCoverage'));
    assert.ok(reportText.includes('Required Item Coverage Evaluator'));
  });

  it('3. formatDeltaTerminalReport produces formatted delta text output with regression tag', async () => {
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
    const reportText = EvaluationReporter.formatDeltaTerminalReport(deltaReport);

    assert.ok(reportText.includes('AI EVALUATION PROMPT VERSION COMPARISON REPORT'));
    assert.ok(reportText.includes('Baseline Version:  1.0.0'));
    assert.ok(reportText.includes('Candidate Version: 1.1.0'));
    assert.ok(reportText.includes('YES (REGRESSION DETECTED)'));
    assert.ok(reportText.includes('REGRESSION'));
  });

  it('4. writeSuiteJsonReport writes valid machine-readable JSON to target output directory', async () => {
    const suite = await EvaluationRunner.evaluatePlanningFixture(
      saasAuthPlanningFixture,
      'knownGood',
      'project-plan',
      '1.0.0'
    );

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-report-test-'));

    try {
      const writtenPath = EvaluationReporter.writeSuiteJsonReport(suite, tempDir);

      assert.ok(fs.existsSync(writtenPath));

      const rawJson = fs.readFileSync(writtenPath, 'utf-8');
      const parsed = JSON.parse(rawJson);

      assert.equal(parsed.fixtureId, 'fix_plan_saas_auth_v1');
      assert.equal(parsed.overallStatus, 'passed');
      assert.equal(parsed.summaryMetrics.requiredItemCoverage.type, 'VALUED');
      assert.equal(parsed.summaryMetrics.requiredItemCoverage.value, 1.0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('5. writeDeltaJsonReport writes valid machine-readable JSON comparison report', async () => {
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

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-delta-test-'));

    try {
      const writtenPath = EvaluationReporter.writeDeltaJsonReport(deltaReport, tempDir);

      assert.ok(fs.existsSync(writtenPath));

      const rawJson = fs.readFileSync(writtenPath, 'utf-8');
      const parsed = JSON.parse(rawJson);

      assert.equal(parsed.fixtureId, 'fix_plan_saas_auth_v1');
      assert.equal(parsed.hasRegression, true);
      assert.equal(parsed.metricDeltas.requiredItemCoverage.isRegression, true);
      assert.ok(parsed.metricDeltas.requiredItemCoverage.delta < 0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
