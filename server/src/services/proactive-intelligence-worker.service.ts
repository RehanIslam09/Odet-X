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
  workspaceId?: string;
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

export async function findProactiveCandidateProjects(
  maxProjects: number = PROACTIVE_MAX_CANDIDATE_PROJECTS_PER_RUN,
): Promise<CandidateProjectSummary[]> {
  const projects = (await Project.find({
    isDeleted: false,
    archived: false,
  })
    .select("_id owner workspaceId name description updatedAt createdAt")
    .sort({ updatedAt: -1, _id: 1 })
    .limit(maxProjects)
    .lean()) as any[];

  return projects.map((p) => ({
    id: p._id.toString(),
    ownerId: p.owner.toString(),
    workspaceId: p.workspaceId ? p.workspaceId.toString() : undefined,
    name: p.name,
    description: p.description,
    updatedAt: p.updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// 2. Persistent Per-User Daily AI Quota Accounting
// ---------------------------------------------------------------------------

export function getStartOfUTCDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

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

  const userDailyCallCounts = new Map<string, number>();

  const candidates = await findProactiveCandidateProjects(maxCandidateProjects);

  for (const project of candidates) {
    projectsScanned++;

    try {
      const signals = await loadAndDetectProjectSignals(project.id, project.ownerId, now);
      signalsDetectedCount += signals.length;

      const expiredCount = await reconcileProjectRecommendations(project.id, project.ownerId, signals, now);
      recommendationsExpiredTotal += expiredCount;

      if (signals.length === 0) {
        continue;
      }

      for (const signal of signals) {
        try {
          if (aiCallsAttempted >= maxAiCallsPerRun) {
            aiBudgetSkips++;
            continue;
          }

          let currentDailyCalls = userDailyCallCounts.get(project.ownerId);
          if (currentDailyCalls === undefined) {
            currentDailyCalls = await getUserDailyProactiveAICalls(project.ownerId, now);
            userDailyCallCounts.set(project.ownerId, currentDailyCalls);
          }

          if (currentDailyCalls >= maxAiCallsPerUserDay) {
            aiBudgetSkips++;
            continue;
          }

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
            aiCallsAttempted++;
            userDailyCallCounts.set(project.ownerId, currentDailyCalls + 1);
          } else {
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
