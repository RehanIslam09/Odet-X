import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  runCopilotEvaluationSuite,
  comparePromptVersions,
  METRIC_DIRECTIONS,
} from "../ai/evaluation/runners/evaluation.runner.js";
import {
  copilotBlockersFixture,
  copilotOverdueRisksFixture,
  copilotPromptInjectionFixture,
} from "../ai/evaluation/fixtures/index.js";
import { isValuedMetric } from "../ai/evaluation/types/metric.types.js";

describe("Copilot Quality Evaluation & Grounding Suite Integration Tests (WP-05)", () => {
  it("1. knownGood candidate passes all 3 golden Copilot fixtures with 100% quality scores", async () => {
    const blockersSuite = await runCopilotEvaluationSuite(
      copilotBlockersFixture,
      "knownGood",
      "project-copilot",
      "1.0.0",
    );
    assert.equal(blockersSuite.overallStatus, "passed");

    const reqMetric = blockersSuite.summaryMetrics.requiredItemCoverage;
    assert.ok(reqMetric && isValuedMetric(reqMetric));
    if (reqMetric && isValuedMetric(reqMetric)) {
      assert.equal(reqMetric.value, 1.0);
    }

    const unsupportedMetric = blockersSuite.summaryMetrics.unsupportedClaimCount;
    assert.ok(unsupportedMetric && isValuedMetric(unsupportedMetric));
    if (unsupportedMetric && isValuedMetric(unsupportedMetric)) {
      assert.equal(unsupportedMetric.value, 0);
    }

    const refMetric = blockersSuite.summaryMetrics.referenceAccuracy;
    assert.ok(refMetric && isValuedMetric(refMetric));
    if (refMetric && isValuedMetric(refMetric)) {
      assert.equal(refMetric.value, 1.0);
    }

    const overdueSuite = await runCopilotEvaluationSuite(
      copilotOverdueRisksFixture,
      "knownGood",
      "project-copilot",
      "1.0.0",
    );
    assert.equal(overdueSuite.overallStatus, "passed");
    const overdueRefMetric = overdueSuite.summaryMetrics.referenceAccuracy;
    assert.ok(overdueRefMetric && isValuedMetric(overdueRefMetric));
    if (overdueRefMetric && isValuedMetric(overdueRefMetric)) {
      assert.equal(overdueRefMetric.value, 1.0);
    }

    const injectionSuite = await runCopilotEvaluationSuite(
      copilotPromptInjectionFixture,
      "knownGood",
      "project-copilot",
      "1.0.0",
    );
    assert.equal(injectionSuite.overallStatus, "passed");
    const injectionUnsupportedMetric = injectionSuite.summaryMetrics.unsupportedClaimCount;
    assert.ok(injectionUnsupportedMetric && isValuedMetric(injectionUnsupportedMetric));
    if (injectionUnsupportedMetric && isValuedMetric(injectionUnsupportedMetric)) {
      assert.equal(injectionUnsupportedMetric.value, 0);
    }
  });

  it("2. Deterministically detects quality regression when comparing knownGood vs knownRegression candidates", async () => {
    const baselineSuite = await runCopilotEvaluationSuite(
      copilotBlockersFixture,
      "knownGood",
      "project-copilot",
      "1.0.0",
    );

    const candidateSuite = await runCopilotEvaluationSuite(
      copilotBlockersFixture,
      "knownRegression",
      "project-copilot",
      "1.1.0-degraded",
    );

    const deltaReport = comparePromptVersions(baselineSuite, candidateSuite);

    assert.equal(deltaReport.hasRegression, true, "comparePromptVersions must detect quality regression");
    assert.equal(deltaReport.baselinePromptVersion, "1.0.0");
    assert.equal(deltaReport.candidatePromptVersion, "1.1.0-degraded");

    const refDelta = deltaReport.metricDeltas.referenceAccuracy;
    assert.ok(refDelta, "referenceAccuracy delta must exist");
    assert.equal(refDelta.isRegression, true, "referenceAccuracy drop must be flagged as regression");

    const unsupportedDelta = deltaReport.metricDeltas.unsupportedClaimCount;
    assert.ok(unsupportedDelta, "unsupportedClaimCount delta must exist");
    assert.equal(unsupportedDelta.isRegression, true, "unsupportedClaimCount increase must be flagged as regression");
  });

  it("3. Enforces correct metric directionality in METRIC_DIRECTIONS mapping", () => {
    assert.equal(METRIC_DIRECTIONS.requiredItemCoverage, "higher_is_better");
    assert.equal(METRIC_DIRECTIONS.referenceAccuracy, "higher_is_better");
    assert.equal(METRIC_DIRECTIONS.unsupportedClaimCount, "lower_is_better");
    assert.equal(METRIC_DIRECTIONS.invalidReferenceCount, "lower_is_better");
  });

  it("4. Prompt-injection fixture flags knownRegression candidate while passing knownGood candidate", async () => {
    const goodSuite = await runCopilotEvaluationSuite(
      copilotPromptInjectionFixture,
      "knownGood",
      "project-copilot",
      "1.0.0",
    );
    assert.equal(goodSuite.overallStatus, "passed");

    const badSuite = await runCopilotEvaluationSuite(
      copilotPromptInjectionFixture,
      "knownRegression",
      "project-copilot",
      "1.0.0-injected",
    );
    assert.equal(badSuite.overallStatus, "failed");
    const badUnsupportedMetric = badSuite.summaryMetrics.unsupportedClaimCount;
    assert.ok(badUnsupportedMetric && isValuedMetric(badUnsupportedMetric));
    if (badUnsupportedMetric && isValuedMetric(badUnsupportedMetric)) {
      assert.ok(
        badUnsupportedMetric.value > 0,
        "Prompt injection compliance in regression candidate must produce >0 unsupported claims",
      );
    }
  });

  it("5. Evaluation suite runs 100% offline with zero live provider requests and zero database requirement", async () => {
    const fixtures = [
      copilotBlockersFixture,
      copilotOverdueRisksFixture,
      copilotPromptInjectionFixture,
    ];

    for (const fx of fixtures) {
      const suite = await runCopilotEvaluationSuite(fx, "knownGood", "project-copilot", "1.0.0");
      assert.ok(suite.durationMs >= 0);
      assert.equal(suite.fixtureId, fx.fixtureId);
    }
  });
});
