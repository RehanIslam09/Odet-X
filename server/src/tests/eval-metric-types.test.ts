import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValuedMetric,
  getMetricNumericValue,
  createValuedMetric,
  createNotApplicableMetric,
  createUnknownMetric,
  computeMetricDelta,
} from '../ai/evaluation/types/metric.types.js';

describe('WP-01 Evaluation Metric Types & Helper Unit Tests', () => {
  it('1. Factories construct correct tagged union variants', () => {
    const valued = createValuedMetric(0.85, 'percent');
    const na = createNotApplicableMetric('No milestones in context');
    const unknown = createUnknownMetric('Metric calculation unhandled');

    assert.equal(valued.type, 'VALUED');
    if (valued.type === 'VALUED') {
      assert.equal(valued.value, 0.85);
      assert.equal(valued.unit, 'percent');
    }

    assert.equal(na.type, 'NOT_APPLICABLE');
    if (na.type === 'NOT_APPLICABLE') {
      assert.equal(na.reason, 'No milestones in context');
    }

    assert.equal(unknown.type, 'UNKNOWN');
    if (unknown.type === 'UNKNOWN') {
      assert.equal(unknown.reason, 'Metric calculation unhandled');
    }
  });

  it('2. Type guard and numeric extractor preserve non-coercion invariants', () => {
    const valued = createValuedMetric(0.75);
    const zeroValued = createValuedMetric(0);
    const na = createNotApplicableMetric('N/A');
    const unknown = createUnknownMetric('Missing data');

    assert.equal(isValuedMetric(valued), true);
    assert.equal(isValuedMetric(zeroValued), true);
    assert.equal(isValuedMetric(na), false);
    assert.equal(isValuedMetric(unknown), false);

    assert.equal(getMetricNumericValue(valued), 0.75);
    assert.equal(getMetricNumericValue(zeroValued), 0);

    // CRITICAL INVARIANT: UNKNOWN and NOT_APPLICABLE MUST NEVER return 0
    assert.equal(getMetricNumericValue(na), null);
    assert.equal(getMetricNumericValue(unknown), null);
    assert.notEqual(getMetricNumericValue(na), 0);
    assert.notEqual(getMetricNumericValue(unknown), 0);
  });

  it('3. computeMetricDelta computes numeric deltas and regression flags accurately', () => {
    const base80 = createValuedMetric(0.80);
    const cand90 = createValuedMetric(0.90);
    const cand70 = createValuedMetric(0.70);

    // Higher is better (e.g. requiredItemCoverage)
    const deltaImpr = computeMetricDelta(base80, cand90, false);
    assert.equal(deltaImpr.delta, 0.10);
    assert.equal(deltaImpr.isRegression, false);

    const deltaReg = computeMetricDelta(base80, cand70, false);
    assert.equal(Math.round(deltaReg.delta! * 100) / 100, -0.10);
    assert.equal(deltaReg.isRegression, true);

    // Lower is better (e.g. unsupportedClaimCount)
    const baseClaims = createValuedMetric(0);
    const candClaimsReg = createValuedMetric(2);

    const deltaClaimsReg = computeMetricDelta(baseClaims, candClaimsReg, true);
    assert.equal(deltaClaimsReg.delta, 2);
    assert.equal(deltaClaimsReg.isRegression, true);
  });

  it('4. computeMetricDelta returns null delta when metrics are UNKNOWN or NOT_APPLICABLE', () => {
    const valued = createValuedMetric(0.85);
    const na = createNotApplicableMetric('N/A');
    const unknown = createUnknownMetric('Unknown');

    const res1 = computeMetricDelta(valued, na);
    assert.equal(res1.delta, null);
    assert.equal(res1.isRegression, false);

    const res2 = computeMetricDelta(unknown, valued);
    assert.equal(res2.delta, null);
    assert.equal(res2.isRegression, false);
  });
});
