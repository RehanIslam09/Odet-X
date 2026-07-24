/**
 * Represents the strongly typed value of a quality evaluation metric.
 * Uses a Tagged Union to preserve explicit state distinctions between:
 * - VALUED: A valid numeric score or measurement.
 * - NOT_APPLICABLE: The metric does not apply to the given scenario/fixture.
 * - UNKNOWN: The metric could not be computed (e.g. missing evaluation data).
 *
 * CRITICAL INVARIANT:
 * UNKNOWN and NOT_APPLICABLE MUST NEVER be silently converted or coerced to numeric zero (0.0).
 */
export type MetricValue =
  | { type: 'VALUED'; value: number; unit?: string }
  | { type: 'NOT_APPLICABLE'; reason: string }
  | { type: 'UNKNOWN'; reason: string };

/**
 * Type guard helper to check if a MetricValue is VALUED with a numeric score.
 */
export function isValuedMetric(
  metric: MetricValue
): metric is { type: 'VALUED'; value: number; unit?: string } {
  return metric.type === 'VALUED';
}

/**
 * Safe helper to extract a numeric metric value if available.
 * Returns null if the metric is UNKNOWN or NOT_APPLICABLE.
 */
export function getMetricNumericValue(metric: MetricValue): number | null {
  return isValuedMetric(metric) ? metric.value : null;
}

/**
 * Factory helper for constructing a VALUED metric.
 */
export function createValuedMetric(value: number, unit?: string): MetricValue {
  return { type: 'VALUED', value, ...(unit && { unit }) };
}

/**
 * Factory helper for constructing a NOT_APPLICABLE metric.
 */
export function createNotApplicableMetric(reason: string): MetricValue {
  return { type: 'NOT_APPLICABLE', reason };
}

/**
 * Factory helper for constructing an UNKNOWN metric.
 */
export function createUnknownMetric(reason: string): MetricValue {
  return { type: 'UNKNOWN', reason };
}

/**
 * Computes the delta between two metric values.
 * Returns null if either baseline or candidate metric is NOT VALUED.
 *
 * @param baseline The baseline metric value.
 * @param candidate The candidate metric value.
 * @param lowerIsBetter Optional flag indicating if a lower numeric value represents improvement (default: false).
 */
export function computeMetricDelta(
  baseline: MetricValue,
  candidate: MetricValue,
  lowerIsBetter = false
): { delta: number | null; isRegression: boolean } {
  const bVal = getMetricNumericValue(baseline);
  const cVal = getMetricNumericValue(candidate);

  if (bVal === null || cVal === null) {
    return { delta: null, isRegression: false };
  }

  const rawDelta = cVal - bVal;
  const delta = Math.round(rawDelta * 10000) / 10000;
  const isRegression = lowerIsBetter ? delta > 0 : delta < 0;

  return { delta, isRegression };
}
