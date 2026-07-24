import { MetricValue } from './metric.types.js';

/**
 * Execution and quality status of an evaluator run.
 * - passed: Evaluator executed successfully and quality requirements were met.
 * - failed: Evaluator executed successfully but quality requirements failed.
 * - error: Evaluator execution itself crashed or encountered an unhandled exception.
 * - skipped: Evaluator was intentionally not run for this scenario.
 */
export type EvaluationStatus = 'passed' | 'failed' | 'error' | 'skipped';

/**
 * Represents an individual deterministic diagnostic assertion evaluated during a quality test.
 */
export interface EvaluationAssertion {
  /** Unique assertion identifier */
  id: string;
  /** Human-readable explanation of what was verified */
  description: string;
  /** True if assertion passed; false if failed */
  passed: boolean;
  /** Expected value or rule description */
  expected: string;
  /** Actual value observed in candidate output */
  actual: string;
}

/**
 * Result returned by a single evaluator execution.
 */
export interface EvaluationResult {
  /** Unique evaluator identifier */
  evaluatorId: string;
  /** Human-readable evaluator name */
  evaluatorName: string;
  /** Execution status */
  status: EvaluationStatus;
  /** Optional overall evaluator score (0.0 to 1.0) or null if non-numeric */
  score: number | null;
  /** Map of named quality metrics produced by this evaluator */
  metrics: Record<string, MetricValue>;
  /** Diagnostic assertions checked during evaluation */
  assertions: EvaluationAssertion[];
  /** Error message if status === 'error' */
  error?: string;
  /** Evaluator execution duration in milliseconds */
  durationMs: number;
}

/**
 * Composite result of running all evaluators against a single golden scenario fixture.
 */
export interface SuiteEvaluationResult {
  /** Golden fixture identifier (e.g. "fix_plan_saas_auth_v1") */
  fixtureId: string;
  /** Human-readable scenario title */
  scenarioName: string;
  /** Target AI capability (e.g. "project-plan") */
  targetCapability: string;
  /** ISO timestamp of test execution */
  timestamp: string;
  /** Prompt name evaluated */
  promptName: string;
  /** Prompt version evaluated */
  promptVersion: string;
  /** Overall suite status ('passed' if all evaluators passed; 'failed' if any failed; 'error' if any erred) */
  overallStatus: 'passed' | 'failed' | 'error';
  /** Individual evaluator results */
  evaluatorResults: EvaluationResult[];
  /** Summary map of all metric values produced across evaluators */
  summaryMetrics: Record<string, MetricValue>;
  /** Total suite execution duration in milliseconds */
  durationMs: number;
}

/**
 * Metric comparison delta between baseline and candidate evaluation runs.
 */
export interface MetricDelta {
  /** Baseline metric value */
  baselineValue: MetricValue;
  /** Candidate metric value */
  candidateValue: MetricValue;
  /** Calculated numeric difference (candidate - baseline) or null if uncomputable */
  delta: number | null;
  /** True if candidate metric represents a quality regression */
  isRegression: boolean;
}

/**
 * Comprehensive side-by-side prompt version comparison report.
 */
export interface EvaluationDeltaReport {
  /** Golden fixture identifier */
  fixtureId: string;
  /** Target AI capability */
  targetCapability: string;
  /** Baseline prompt version string */
  baselinePromptVersion: string;
  /** Candidate prompt version string */
  candidatePromptVersion: string;
  /** Per-metric comparison deltas */
  metricDeltas: Record<string, MetricDelta>;
  /** True if any metric demonstrated a quality regression beyond allowed threshold */
  hasRegression: boolean;
  /** ISO timestamp of comparison execution */
  timestamp: string;
}

/**
 * Generic contract for a version-controlled golden fixture.
 */
export interface EvaluationFixture<TInput = unknown, TGroundTruth = unknown, TCandidate = unknown> {
  /** Unique immutable identifier for this golden fixture */
  fixtureId: string;
  /** Human-readable scenario title */
  name: string;
  /** Scenario description and quality objectives */
  description: string;
  /** Target AI capability (e.g. "project-plan") */
  targetCapability: string;
  /** Version tag of the fixture definition */
  version: string;
  
  /** Synthetic input payload supplied to the AI service */
  input: TInput;
  
  /** Ground truth expectations for quality measurement */
  groundTruth: TGroundTruth;
  
  /** Static candidate AI outputs for offline deterministic evaluation */
  candidateOutputs: Record<string, TCandidate>;
  
  /** Fixture metadata */
  metadata: {
    author: string;
    createdAt: string;
    tags: string[];
  };
}
