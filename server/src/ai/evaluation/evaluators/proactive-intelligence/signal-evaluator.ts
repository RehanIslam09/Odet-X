import { detectProjectSignals } from "../../../../domain/proactive-intelligence/signal-engine.js";
import { generateOverdueSignalFingerprint } from "../../../../domain/proactive-intelligence/signal-fingerprint.js";
import { EvaluationAssertion, EvaluationResult } from "../../types/evaluation.types.js";
import { createValuedMetric } from "../../types/metric.types.js";
import { ProactiveSignalFixture } from "../../fixtures/proactive-intelligence/types.js";

export interface SignalEvaluationMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  severityExactMatchRate: number;
  fingerprintStabilityRate: number;
  canonicalOrderingPassRate: number;
}

export interface SignalEvaluationReport {
  overallPassed: boolean;
  metrics: SignalEvaluationMetrics;
  result: EvaluationResult;
}

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

const SIGNAL_TYPE_ORDER: Record<string, number> = {
  OVERDUE_HIGH_PRIORITY_TASKS: 1,
  MILESTONE_AT_RISK: 2,
  DEPENDENCY_BOTTLENECK: 3,
  PROJECT_STALLED: 4,
};

/**
 * Evaluates deterministic signal engine quality across fixture corpus.
 */
export function evaluateSignalQuality(fixtures: ProactiveSignalFixture[]): SignalEvaluationReport {
  const startTime = Date.now();
  const assertions: EvaluationAssertion[] = [];

  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let severityMatches = 0;
  let totalTp = 0;
  let fingerprintStabilityPasses = 0;
  let canonicalOrderingPasses = 0;

  for (const fixture of fixtures) {
    const { now, project, tasks, milestones, latestActivityDate } = fixture.input;

    // Execute detector
    const detectedSignals = detectProjectSignals({
      project: project as any,
      tasks: tasks as any,
      milestones: milestones as any,
      latestActivityDate: latestActivityDate || null,
      now,
    });

    // 1. Evaluate Canonical Ordering
    let isOrderedCorrectly = true;
    for (let i = 0; i < detectedSignals.length - 1; i++) {
      const curr = detectedSignals[i]!;
      const next = detectedSignals[i + 1]!;

      const rCurr = SEVERITY_RANK[curr.severity] || 0;
      const rNext = SEVERITY_RANK[next.severity] || 0;

      if (rCurr > rNext) {
        isOrderedCorrectly = false;
        break;
      }

      if (rCurr === rNext) {
        const tCurr = SIGNAL_TYPE_ORDER[curr.type] || 99;
        const tNext = SIGNAL_TYPE_ORDER[next.type] || 99;

        if (tCurr > tNext) {
          isOrderedCorrectly = false;
          break;
        }

        if (tCurr === tNext) {
          if (curr.fingerprint.localeCompare(next.fingerprint) > 0) {
            isOrderedCorrectly = false;
            break;
          }
        }
      }
    }

    if (isOrderedCorrectly) {
      canonicalOrderingPasses++;
    } else {
      assertions.push({
        id: `ordering_${fixture.id}`,
        description: `Canonical signal ordering for fixture ${fixture.id}`,
        passed: false,
        expected: "Signals sorted by severity rank, type, and fingerprint",
        actual: JSON.stringify(detectedSignals.map((s) => ({ type: s.type, severity: s.severity }))),
      });
    }

    // 2. Evaluate Fingerprint Determinism & Stability
    const clonedTasks = tasks.map((t) => ({ ...t, dueDate: t.dueDate ? new Date(t.dueDate) : t.dueDate }));
    const clonedMilestones = milestones.map((m) => ({ ...m, targetDate: m.targetDate ? new Date(m.targetDate) : m.targetDate }));

    const reruns = detectProjectSignals({
      project: { ...project } as any,
      tasks: clonedTasks as any,
      milestones: clonedMilestones as any,
      latestActivityDate: latestActivityDate || null,
      now,
    });

    const isStable =
      detectedSignals.length === reruns.length &&
      detectedSignals.every((s, idx) => s.fingerprint === reruns[idx]?.fingerprint);

    if (isStable) {
      fingerprintStabilityPasses++;
    } else {
      assertions.push({
        id: `fingerprint_stability_${fixture.id}`,
        description: `Fingerprint stability across cloned inputs for fixture ${fixture.id}`,
        passed: false,
        expected: "Identical fingerprints on cloned input",
        actual: "Fingerprints diverged across runs",
      });
    }

    // 3. Match Expected vs Detected Signals
    const expectedList = [...fixture.expectedSignals];
    const unmatchedDetected = [...detectedSignals];

    for (const expected of expectedList) {
      const foundIdx = unmatchedDetected.findIndex((d) => d.type === expected.type);

      if (foundIdx >= 0) {
        const found = unmatchedDetected[foundIdx]!;
        unmatchedDetected.splice(foundIdx, 1);
        truePositives++;
        totalTp++;

        const severityMatch = found.severity === expected.severity;
        if (severityMatch) {
          severityMatches++;
        }

        assertions.push({
          id: `signal_match_${fixture.id}_${expected.type}`,
          description: `Signal detection and severity for ${expected.type} in ${fixture.id}`,
          passed: severityMatch,
          expected: `Type: ${expected.type}, Severity: ${expected.severity}`,
          actual: `Type: ${found.type}, Severity: ${found.severity}`,
        });
      } else {
        falseNegatives++;
        assertions.push({
          id: `signal_missing_${fixture.id}_${expected.type}`,
          description: `Missing expected signal ${expected.type} in fixture ${fixture.id}`,
          passed: false,
          expected: `Type: ${expected.type}, Severity: ${expected.severity}`,
          actual: "Signal not detected",
        });
      }
    }

    for (const falsePos of unmatchedDetected) {
      falsePositives++;
      assertions.push({
        id: `signal_false_pos_${fixture.id}_${falsePos.type}`,
        description: `Unexpected false positive signal ${falsePos.type} in fixture ${fixture.id}`,
        passed: false,
        expected: "No signal",
        actual: `Type: ${falsePos.type}, Severity: ${falsePos.severity}`,
      });
    }
  }

  const precision = truePositives + falsePositives === 0 ? 1.0 : truePositives / (truePositives + falsePositives);
  const recall = truePositives + falseNegatives === 0 ? 1.0 : truePositives / (truePositives + falseNegatives);
  const severityExactMatchRate = totalTp === 0 ? 1.0 : severityMatches / totalTp;
  const fingerprintStabilityRate = fixtures.length === 0 ? 1.0 : fingerprintStabilityPasses / fixtures.length;
  const canonicalOrderingPassRate = fixtures.length === 0 ? 1.0 : canonicalOrderingPasses / fixtures.length;

  const overallPassed =
    precision === 1.0 &&
    recall === 1.0 &&
    severityExactMatchRate === 1.0 &&
    fingerprintStabilityRate === 1.0 &&
    canonicalOrderingPassRate === 1.0;

  const durationMs = Date.now() - startTime;

  const result: EvaluationResult = {
    evaluatorId: "eval_proactive_signal_quality_v1",
    evaluatorName: "Proactive Signal Engine Quality Evaluator",
    status: overallPassed ? "passed" : "failed",
    score: overallPassed ? 1.0 : 0.0,
    metrics: {
      precision: createValuedMetric(precision),
      recall: createValuedMetric(recall),
      severityExactMatchRate: createValuedMetric(severityExactMatchRate),
      fingerprintStabilityRate: createValuedMetric(fingerprintStabilityRate),
      canonicalOrderingPassRate: createValuedMetric(canonicalOrderingPassRate),
      truePositives: createValuedMetric(truePositives),
      falsePositives: createValuedMetric(falsePositives),
      falseNegatives: createValuedMetric(falseNegatives),
    },
    assertions,
    durationMs,
  };

  return {
    overallPassed,
    metrics: {
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      severityExactMatchRate,
      fingerprintStabilityRate,
      canonicalOrderingPassRate,
    },
    result,
  };
}

/**
 * Tests fingerprint sensitivity to canonical state mutations.
 */
export function evaluateFingerprintSensitivity(): boolean {
  const hashA = generateOverdueSignalFingerprint("p1", ["task_100"]);
  const hashB = generateOverdueSignalFingerprint("p1", ["task_101"]);

  return hashA !== hashB && hashA.length === 64 && hashB.length === 64;
}
