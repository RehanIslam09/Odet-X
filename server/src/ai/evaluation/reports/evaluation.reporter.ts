import fs from 'node:fs';
import path from 'node:path';
import { SuiteEvaluationResult, EvaluationDeltaReport } from '../types/evaluation.types.js';

/**
 * Sanitizes an input string for safe usage in file system paths.
 * Prevents path traversal and replaces unsafe characters.
 */
export function sanitizeFilenameComponent(raw: string): string {
  if (!raw) return 'unknown';
  return raw
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[^\w-]/g, '_')
    .toLowerCase();
}

function formatMetricValueString(metric?: { type: string; value?: number; unit?: string; reason?: string }): string {
  if (!metric) return 'N/A';
  if (metric.type === 'VALUED' && metric.value !== undefined) {
    return Number.isInteger(metric.value) ? `${metric.value}` : metric.value.toFixed(2);
  }
  if (metric.type === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (metric.type === 'UNKNOWN') return 'UNKNOWN';
  return 'N/A';
}

export class EvaluationReporter {
  /**
   * Formats a SuiteEvaluationResult as a clean, human-readable terminal report.
   */
  public static formatSuiteTerminalReport(suiteResult: SuiteEvaluationResult): string {
    const lines: string[] = [];

    lines.push('============================================================');
    lines.push('AI QUALITY EVALUATION SUITE REPORT');
    lines.push('============================================================');
    lines.push(`Fixture ID:        ${suiteResult.fixtureId}`);
    lines.push(`Scenario:          ${suiteResult.scenarioName}`);
    lines.push(`Target Capability: ${suiteResult.targetCapability}`);
    lines.push(`Prompt Name:       ${suiteResult.promptName}`);
    lines.push(`Prompt Version:    ${suiteResult.promptVersion}`);
    lines.push(`Overall Status:    ${suiteResult.overallStatus.toUpperCase()}`);
    lines.push(`Duration:          ${suiteResult.durationMs}ms`);
    lines.push('------------------------------------------------------------');
    lines.push('Summary Metrics:');

    for (const [key, val] of Object.entries(suiteResult.summaryMetrics)) {
      const valStr = formatMetricValueString(val);
      lines.push(`  ${key.padEnd(24)}: ${valStr}`);
    }

    lines.push('------------------------------------------------------------');
    lines.push('Evaluator Diagnostic Results:');

    for (const res of suiteResult.evaluatorResults) {
      const tag = res.status.toUpperCase().padEnd(7);
      const scoreStr = res.score !== null ? res.score.toFixed(2) : 'N/A';
      lines.push(`  [${tag}] ${res.evaluatorName} (score: ${scoreStr})`);

      for (const assertion of res.assertions) {
        const assertTag = assertion.passed ? '✓' : '✗';
        lines.push(`    ${assertTag} ${assertion.description}`);
        if (!assertion.passed) {
          lines.push(`      Expected: ${assertion.expected}`);
          lines.push(`      Actual:   ${assertion.actual}`);
        }
      }

      if (res.error) {
        lines.push(`    ERROR: ${res.error}`);
      }
    }

    lines.push('============================================================');

    return lines.join('\n');
  }

  /**
   * Formats an EvaluationDeltaReport as a side-by-side terminal comparison report.
   */
  public static formatDeltaTerminalReport(deltaReport: EvaluationDeltaReport): string {
    const lines: string[] = [];

    lines.push('============================================================');
    lines.push('AI EVALUATION PROMPT VERSION COMPARISON REPORT');
    lines.push('============================================================');
    lines.push(`Fixture ID:        ${deltaReport.fixtureId}`);
    lines.push(`Target Capability: ${deltaReport.targetCapability}`);
    lines.push(`Baseline Version:  ${deltaReport.baselinePromptVersion}`);
    lines.push(`Candidate Version: ${deltaReport.candidatePromptVersion}`);
    lines.push(`Overall Regression:${deltaReport.hasRegression ? ' YES (REGRESSION DETECTED)' : ' NO (PASSED)'}`);
    lines.push('------------------------------------------------------------');
    lines.push(
      `${'Metric'.padEnd(25)} ${'Baseline'.padStart(10)} ${'Candidate'.padStart(10)} ${'Delta'.padStart(10)} Status`
    );
    lines.push('------------------------------------------------------------');

    for (const [key, deltaInfo] of Object.entries(deltaReport.metricDeltas)) {
      const bStr = formatMetricValueString(deltaInfo.baselineValue).padStart(10);
      const cStr = formatMetricValueString(deltaInfo.candidateValue).padStart(10);

      let deltaStr = 'N/A';
      if (deltaInfo.delta !== null) {
        const sign = deltaInfo.delta > 0 ? '+' : '';
        deltaStr = Number.isInteger(deltaInfo.delta)
          ? `${sign}${deltaInfo.delta}`
          : `${sign}${deltaInfo.delta.toFixed(2)}`;
      }
      deltaStr = deltaStr.padStart(10);

      const statusStr = deltaInfo.isRegression ? 'REGRESSION' : 'OK';

      lines.push(`${key.padEnd(25)} ${bStr} ${cStr} ${deltaStr} ${statusStr}`);
    }

    lines.push('============================================================');

    return lines.join('\n');
  }

  /**
   * Writes a SuiteEvaluationResult to a machine-readable JSON file.
   * Default path: dist/reports/evaluation/suite_<fixtureId>_<version>_<timestamp>.json
   */
  public static writeSuiteJsonReport(
    suiteResult: SuiteEvaluationResult,
    outputDir?: string
  ): string {
    const dir =
      outputDir || path.resolve(process.cwd(), 'dist', 'reports', 'evaluation');
    fs.mkdirSync(dir, { recursive: true });

    const safeFixtureId = sanitizeFilenameComponent(suiteResult.fixtureId);
    const safeVersion = sanitizeFilenameComponent(suiteResult.promptVersion);
    const filename = `suite_${safeFixtureId}_${safeVersion}_${Date.now()}.json`;

    const targetPath = path.join(dir, filename);
    fs.writeFileSync(targetPath, JSON.stringify(suiteResult, null, 2), 'utf-8');

    return targetPath;
  }

  /**
   * Writes an EvaluationDeltaReport to a machine-readable JSON file.
   * Default path: dist/reports/evaluation/delta_<fixtureId>_<baseline>_vs_<candidate>_<timestamp>.json
   */
  public static writeDeltaJsonReport(
    deltaReport: EvaluationDeltaReport,
    outputDir?: string
  ): string {
    const dir =
      outputDir || path.resolve(process.cwd(), 'dist', 'reports', 'evaluation');
    fs.mkdirSync(dir, { recursive: true });

    const safeFixtureId = sanitizeFilenameComponent(deltaReport.fixtureId);
    const safeBase = sanitizeFilenameComponent(deltaReport.baselinePromptVersion);
    const safeCand = sanitizeFilenameComponent(deltaReport.candidatePromptVersion);
    const filename = `delta_${safeFixtureId}_${safeBase}_vs_${safeCand}_${Date.now()}.json`;

    const targetPath = path.join(dir, filename);
    fs.writeFileSync(targetPath, JSON.stringify(deltaReport, null, 2), 'utf-8');

    return targetPath;
  }
}

export const formatSuiteTerminalReport = EvaluationReporter.formatSuiteTerminalReport;
export const formatDeltaTerminalReport = EvaluationReporter.formatDeltaTerminalReport;
export const writeSuiteJsonReport = EvaluationReporter.writeSuiteJsonReport;
export const writeDeltaJsonReport = EvaluationReporter.writeDeltaJsonReport;
