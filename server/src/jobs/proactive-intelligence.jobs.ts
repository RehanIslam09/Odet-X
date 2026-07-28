import {
  runProactiveIntelligenceCycle,
  ProactiveWorkerRunResult,
} from "../services/proactive-intelligence-worker.service.js";

/**
 * Background job wrapper for Proactive Intelligence cycle.
 *
 * Fault Tolerance:
 * - Catches any unhandled worker rejection to ensure scheduler loop never crashes.
 * - Logs safe execution metrics only (0 project/task content or AI prompts logged).
 */
export async function processProactiveIntelligenceJob(
  now: Date = new Date(),
): Promise<ProactiveWorkerRunResult | null> {
  try {
    console.log(`[ProactiveWorker] Starting Proactive Intelligence cycle at ${now.toISOString()}...`);
    const result = await runProactiveIntelligenceCycle({ now });
    console.log(
      `[ProactiveWorker] Finished cycle. Scanned: ${result.projectsScanned}/${result.candidateProjects}, Signals: ${result.signalsDetected}, Activated: ${result.recommendationsActivated}, Skipped: ${result.recommendationsSkipped}, Expired: ${result.recommendationsExpired}, AI Calls: ${result.aiCallsAttempted}, Budget Skips: ${result.aiBudgetSkips}, Failures: ${result.projectFailures + result.signalFailures}`,
    );
    return result;
  } catch (error: any) {
    console.error("[ProactiveWorker] Unhandled exception in Proactive Intelligence job:", error?.message || error);
    return null;
  }
}
