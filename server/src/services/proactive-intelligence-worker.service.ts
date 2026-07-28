import { Types } from "mongoose";
import Project from "@/models/project.model.js";
import ProjectRecommendation from "@/models/project-recommendation.model.js";
import {
  PROACTIVE_MAX_AI_CALLS_PER_RUN,
  PROACTIVE_MAX_AI_CALLS_PER_USER_DAY,
  PROACTIVE_MAX_CANDIDATE_PROJECTS_PER_RUN,
} from "@/constants/proactive-intelligence.js";
import { loadAndDetectProjectSignals } from "@/domain/proactive-intelligence/signal-engine.js";
import {
  processProjectSignalRecommendation,
  reconcileProjectRecommendations,
} from "./project-recommendation.service.js";

// ---------------------------------------------------------------------------
// DTOs & Interfaces
// ---------------------------------------------------------------------------

export interface CandidateProjectSummary {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  updatedAt?: Date;
}

export interface ProactiveWorkerRunResult {
  candidateProjects: number;
  projectsScanned: number;
  signalsDetected: number;
  recommendationsActivated: number;
  recommendationsSkipped: number;
  recommendationsExpired: number;
  aiCallsAttempted: number;
  aiBudgetSkips: number;
  projectFailures: number;
  signalFailures: number;
  startedAt: Date;
  completedAt: Date;
}

export interface ProactiveWorkerOptions {
  now?: Date;
  maxCandidateProjects?: number;
  maxAiCallsPerRun?: number;
  maxAiCallsPerUserDay?: number;
}

// ---------------------------------------------------------------------------
// 1. Candidate Project Discovery
// ---------------------------------------------------------------------------

/**
 * Finds eligible candidate projects for proactive scanning.
 *
 * Rules:
 * - Excludes soft-deleted projects (`isDeleted: false`).
 * - Excludes archived projects (`archived: false`).
 * - Deterministically sorted by `updatedAt` descending with `_id` ascending as tie-breaker.
 * - Max limit: PROACTIVE_MAX_CANDIDATE_PROJECTS_PER_RUN (50).
 */
export async function findProactiveCandidateProjects(
  maxProjects: number = PROACTIVE_MAX_CANDIDATE_PROJECTS_PER_RUN,
): Promise<CandidateProjectSummary[]> {
  const projects = (await Project.find({
    isDeleted: false,
    archived: false,
  })
    .select("_id owner name description updatedAt createdAt")
    .sort({ updatedAt: -1, _id: 1 })
    .limit(maxProjects)
    .lean()) as any[];

  return projects.map((p) => ({
    id: p._id.toString(),
    ownerId: p.owner.toString(),
    name: p.name,
    description: p.description,
    updatedAt: p.updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// 2. Persistent Per-User Daily AI Quota Accounting
// ---------------------------------------------------------------------------

/**
 * Helper to get UTC midnight start for a given reference date.
 */
export function getStartOfUTCDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Gets the count of proactive AI enrichment calls initiated for an owner on the current UTC day.
 * Query: ProjectRecommendation documents for `owner` created since UTC midnight.
 */
export async function getUserDailyProactiveAICalls(
  ownerId: string,
  now: Date = new Date(),
): Promise<number> {
  const startOfDay = getStartOfUTCDay(now);
  const ownerObjId = new Types.ObjectId(ownerId);

  return await ProjectRecommendation.countDocuments({
    owner: ownerObjId,
    createdAt: { $gte: startOfDay },
    status: { $in: ["ACTIVE", "PENDING_ENRICHMENT"] },
  });
}

// ---------------------------------------------------------------------------
// 3. Main Worker Cycle Orchestrator
// ---------------------------------------------------------------------------

/**
 * Executes a single bounded Proactive Intelligence worker run.
 *
 * Guaranteed Invariants:
 * 1. Bounded candidate scanning (<= 50 projects/run).
 * 2. Hard run-level AI limit (<= 10 AI calls/run).
 * 3. Hard persistent user-level daily AI limit (<= 20 AI calls/user/day UTC).
 * 4. Per-project and per-signal error isolation (failures log safely and do not abort run).
 * 5. Lifecycle reconciliation before signal processing.
 * 6. 0 Activity records created, 0 ProjectMemory reads/writes, 0 Project/Task mutations.
 */
export async function runProactiveIntelligenceCycle(
  options: ProactiveWorkerOptions = {},
): Promise<ProactiveWorkerRunResult> {
  const startedAt = new Date();
  const now = options.now || startedAt;
  const maxCandidateProjects = options.maxCandidateProjects ?? PROACTIVE_MAX_CANDIDATE_PROJECTS_PER_RUN;
  const maxAiCallsPerRun = options.maxAiCallsPerRun ?? PROACTIVE_MAX_AI_CALLS_PER_RUN;
  const maxAiCallsPerUserDay = options.maxAiCallsPerUserDay ?? PROACTIVE_MAX_AI_CALLS_PER_USER_DAY;

  let projectsScanned = 0;
  let signalsDetectedCount = 0;
  let recommendationsActivated = 0;
  let recommendationsSkipped = 0;
  let recommendationsExpiredTotal = 0;
  let aiCallsAttempted = 0;
  let aiBudgetSkips = 0;
  let projectFailures = 0;
  let signalFailures = 0;

  // Track per-user daily AI call counts in memory during the run, backed by persistent DB queries
  const userDailyCallCounts = new Map<string, number>();

  // 1. Discover candidate projects
  const candidates = await findProactiveCandidateProjects(maxCandidateProjects);

  for (const project of candidates) {
    projectsScanned++;

    try {
      // Step A: Detect current signals for project (WP-02)
      const signals = await loadAndDetectProjectSignals(project.id, project.ownerId, now);
      signalsDetectedCount += signals.length;

      // Step B: Reconcile active recommendations against current signals (WP-04)
      const expiredCount = await reconcileProjectRecommendations(project.id, project.ownerId, signals, now);
      recommendationsExpiredTotal += expiredCount;

      if (signals.length === 0) {
        continue; // No signals to process
      }

      // Step C: Process signals in deterministic WP-02 order
      for (const signal of signals) {
        try {
          // Check Run-level AI Budget
          if (aiCallsAttempted >= maxAiCallsPerRun) {
            aiBudgetSkips++;
            continue; // Hard stop on AI calls for this run
          }

          // Check User-level Daily AI Budget
          let currentDailyCalls = userDailyCallCounts.get(project.ownerId);
          if (currentDailyCalls === undefined) {
            currentDailyCalls = await getUserDailyProactiveAICalls(project.ownerId, now);
            userDailyCallCounts.set(project.ownerId, currentDailyCalls);
          }

          if (currentDailyCalls >= maxAiCallsPerUserDay) {
            aiBudgetSkips++;
            continue; // Hard stop on AI calls for this user today
          }

          // Execute WP-04 atomic claim -> WP-03 enrichment -> WP-04 finalization
          const projectContext = {
            name: project.name,
            ...(project.description ? { description: project.description } : {}),
          };

          const result = await processProjectSignalRecommendation(
            signal,
            projectContext,
            now,
          );

          if (result.outcome === "ACTIVATED") {
            recommendationsActivated++;
            aiCallsAttempted++;
            userDailyCallCounts.set(project.ownerId, currentDailyCalls + 1);
          } else if (result.outcome === "CLAIMED" || result.outcome === "RECOVERED") {
            // Claimed/Recovered but finalization outcome differed
            aiCallsAttempted++;
            userDailyCallCounts.set(project.ownerId, currentDailyCalls + 1);
          } else {
            // SKIPPED_ACTIVE, SKIPPED_IN_PROGRESS, SKIPPED_COOLDOWN, OWNERSHIP_LOST
            recommendationsSkipped++;
          }
        } catch (signalErr: any) {
          signalFailures++;
          console.error(
            `[ProactiveWorker] Error processing signal type ${signal.type} for project ${project.id}:`,
            signalErr?.message || signalErr,
          );
        }
      }
    } catch (projectErr: any) {
      projectFailures++;
      console.error(
        `[ProactiveWorker] Error scanning project ${project.id}:`,
        projectErr?.message || projectErr,
      );
    }
  }

  const completedAt = new Date();

  return {
    candidateProjects: candidates.length,
    projectsScanned,
    signalsDetected: signalsDetectedCount,
    recommendationsActivated,
    recommendationsSkipped,
    recommendationsExpired: recommendationsExpiredTotal,
    aiCallsAttempted,
    aiBudgetSkips,
    projectFailures,
    signalFailures,
    startedAt,
    completedAt,
  };
}
