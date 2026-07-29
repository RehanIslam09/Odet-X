import crypto from "crypto";
import { Types } from "mongoose";
import Project from "@/models/project.model.js";
import ProjectRecommendation, { IProjectRecommendationDocument } from "@/models/project-recommendation.model.js";
import {
  PROACTIVE_CLAIM_LEASE_MS,
  PROACTIVE_DISMISSED_COOLDOWN_DAYS,
  PROACTIVE_RECOMMENDATION_ACTIVE_TTL_DAYS,
  PROACTIVE_RETENTION_PURGE_DAYS,
  ProjectSignal,
} from "@/constants/proactive-intelligence.js";
import { ProjectRecommendationDto } from "@/validators/project-recommendation.validator.js";
import {
  RecommendationEnrichmentResult,
  enrichProjectSignal,
} from "./proactive-recommendation-ai.service.js";

// ---------------------------------------------------------------------------
// DTOs & Typed Outcome Interfaces
// ---------------------------------------------------------------------------

export type RecommendationClaimOutcome =
  | "CLAIMED"
  | "RECOVERED"
  | "SKIPPED_ACTIVE"
  | "SKIPPED_IN_PROGRESS"
  | "SKIPPED_COOLDOWN";

export interface RecommendationClaimResult {
  outcome: RecommendationClaimOutcome;
  recommendationId?: string;
  claimToken?: string;
  recovered?: boolean;
}

export type FinalizationOutcome = "ACTIVATED" | "OWNERSHIP_LOST";

export interface FinalizationResult {
  outcome: FinalizationOutcome;
  recommendation?: ProjectRecommendationDto;
}

export interface OrchestrationResult {
  outcome: RecommendationClaimOutcome | FinalizationOutcome;
  recommendation?: ProjectRecommendationDto;
  isFallback?: boolean;
}

// ---------------------------------------------------------------------------
// 1. Initial Atomic Claim Acquisition & Stale Recovery
// ---------------------------------------------------------------------------

export async function acquireRecommendationClaim(
  signal: ProjectSignal,
  now: Date = new Date(),
): Promise<RecommendationClaimResult> {
  const projectObjId = new Types.ObjectId(signal.projectId);
  const ownerObjId = new Types.ObjectId(signal.ownerId);

  const project = await Project.findById(projectObjId).lean();
  const targetWorkspaceId = project?.workspaceId ? project.workspaceId : undefined;

  const dismissedCooldown = await ProjectRecommendation.findOne({
    projectId: projectObjId,
    fingerprint: signal.fingerprint,
    status: "DISMISSED",
    expiresAt: { $gt: now },
  });

  if (dismissedCooldown) {
    return { outcome: "SKIPPED_COOLDOWN" };
  }

  const myClaimToken = crypto.randomUUID();
  const defaultExpiresAt = new Date(now.getTime() + PROACTIVE_RECOMMENDATION_ACTIVE_TTL_DAYS * 86400000);

  const createPayload: Record<string, unknown> = {
    owner: ownerObjId,
    projectId: projectObjId,
    type: signal.type,
    severity: signal.severity,
    title: "Pending AI Recommendation",
    explanation: "",
    suggestedNextStep: null,
    facts: signal.facts,
    relatedEntities: signal.relatedEntities,
    fingerprint: signal.fingerprint,
    expiresAt: defaultExpiresAt,
    status: "PENDING_ENRICHMENT",
    claimToken: myClaimToken,
    claimedAt: now,
  };

  if (targetWorkspaceId) {
    createPayload.workspaceId = targetWorkspaceId;
  }

  try {
    const doc = (await ProjectRecommendation.create(createPayload)) as unknown as IProjectRecommendationDocument;

    return {
      outcome: "CLAIMED",
      recommendationId: doc._id.toString(),
      claimToken: myClaimToken,
      recovered: false,
    };
  } catch (error: any) {
    if (error?.code !== 11000) {
      throw error;
    }

    const existing = await ProjectRecommendation.findOne({
      projectId: projectObjId,
      fingerprint: signal.fingerprint,
      status: { $in: ["ACTIVE", "PENDING_ENRICHMENT"] },
    });

    if (!existing) {
      return { outcome: "SKIPPED_IN_PROGRESS" };
    }

    if (existing.status === "ACTIVE") {
      return { outcome: "SKIPPED_ACTIVE" };
    }

    const staleThreshold = new Date(now.getTime() - PROACTIVE_CLAIM_LEASE_MS);
    if (!existing.claimedAt || existing.claimedAt.getTime() >= staleThreshold.getTime()) {
      return { outcome: "SKIPPED_IN_PROGRESS" };
    }

    const newClaimToken = crypto.randomUUID();
    const recoveredDoc = await ProjectRecommendation.findOneAndUpdate(
      {
        _id: existing._id,
        owner: ownerObjId,
        projectId: projectObjId,
        status: "PENDING_ENRICHMENT",
        claimedAt: { $lt: staleThreshold },
      },
      {
        $set: {
          claimToken: newClaimToken,
          claimedAt: now,
          ...(targetWorkspaceId ? { workspaceId: targetWorkspaceId } : {}),
        },
      },
      { returnDocument: "after" },
    );

    if (recoveredDoc) {
      return {
        outcome: "RECOVERED",
        recommendationId: recoveredDoc._id.toString(),
        claimToken: newClaimToken,
        recovered: true,
      };
    }

    return { outcome: "SKIPPED_IN_PROGRESS" };
  }
}

// ---------------------------------------------------------------------------
// 2. Ownership-Verified Finalization
// ---------------------------------------------------------------------------

export async function finalizeRecommendationEnrichment(
  recommendationId: string,
  claimToken: string,
  ownerId: string,
  enrichment: RecommendationEnrichmentResult,
  now: Date = new Date(),
): Promise<FinalizationResult> {
  const expiresAt = new Date(now.getTime() + PROACTIVE_RECOMMENDATION_ACTIVE_TTL_DAYS * 86400000);

  const updatedDoc = await ProjectRecommendation.findOneAndUpdate(
    {
      _id: new Types.ObjectId(recommendationId),
      owner: new Types.ObjectId(ownerId),
      status: "PENDING_ENRICHMENT",
      claimToken: claimToken,
    },
    {
      $set: {
        status: "ACTIVE",
        title: enrichment.title,
        explanation: enrichment.explanation,
        suggestedNextStep: enrichment.suggestedNextStep,
        expiresAt,
      },
      $unset: {
        claimToken: "",
        claimedAt: "",
      },
    },
    { returnDocument: "after" },
  );

  if (!updatedDoc) {
    return { outcome: "OWNERSHIP_LOST" };
  }

  return {
    outcome: "ACTIVATED",
    recommendation: updatedDoc.toJSON() as unknown as ProjectRecommendationDto,
  };
}

// ---------------------------------------------------------------------------
// 3. Recommendation Dismissal Operation
// ---------------------------------------------------------------------------

export async function dismissRecommendation(
  recommendationId: string,
  ownerId: string,
  now: Date = new Date(),
): Promise<ProjectRecommendationDto | null> {
  const cooldownExpiresAt = new Date(now.getTime() + PROACTIVE_DISMISSED_COOLDOWN_DAYS * 86400000);
  const purgeAt = new Date(now.getTime() + PROACTIVE_RETENTION_PURGE_DAYS * 86400000);

  const doc = await ProjectRecommendation.findOneAndUpdate(
    {
      _id: new Types.ObjectId(recommendationId),
      owner: new Types.ObjectId(ownerId),
      status: "ACTIVE",
    },
    {
      $set: {
        status: "DISMISSED",
        dismissedAt: now,
        expiresAt: cooldownExpiresAt,
        purgeAt: purgeAt,
      },
      $unset: {
        claimToken: "",
        claimedAt: "",
      },
    },
    { returnDocument: "after" },
  );

  return doc ? (doc.toJSON() as unknown as ProjectRecommendationDto) : null;
}

// ---------------------------------------------------------------------------
// 4. Signal Resolution Reconciliation
// ---------------------------------------------------------------------------

export async function reconcileProjectRecommendations(
  projectId: string,
  ownerId: string,
  activeSignals: ProjectSignal[],
  now: Date = new Date(),
): Promise<number> {
  const projectObjId = new Types.ObjectId(projectId);
  const ownerObjId = new Types.ObjectId(ownerId);

  const activeFingerprints = new Set(activeSignals.map((s) => s.fingerprint));

  const activeDocs = await ProjectRecommendation.find({
    owner: ownerObjId,
    projectId: projectObjId,
    status: "ACTIVE",
  });

  let expiredCount = 0;
  const purgeAt = new Date(now.getTime() + PROACTIVE_RETENTION_PURGE_DAYS * 86400000);

  for (const doc of activeDocs) {
    const isSignalResolved = !activeFingerprints.has(doc.fingerprint);
    const isTtlExpired = doc.expiresAt && doc.expiresAt.getTime() <= now.getTime();

    if (isSignalResolved || isTtlExpired) {
      doc.status = "EXPIRED";
      doc.expiresAt = now;
      doc.purgeAt = purgeAt;
      await doc.save();
      expiredCount++;
    }
  }

  return expiredCount;
}

// ---------------------------------------------------------------------------
// 5. Convenience Orchestration Pipeline
// ---------------------------------------------------------------------------

export async function processProjectSignalRecommendation(
  signal: ProjectSignal,
  projectContext?: { name?: string; description?: string },
  now: Date = new Date(),
): Promise<OrchestrationResult> {
  const claimResult = await acquireRecommendationClaim(signal, now);

  if (claimResult.outcome !== "CLAIMED" && claimResult.outcome !== "RECOVERED") {
    return { outcome: claimResult.outcome };
  }

  const enrichment = await enrichProjectSignal({
    signal,
    ...(projectContext ? { projectContext } : {}),
  });

  const finalResult = await finalizeRecommendationEnrichment(
    claimResult.recommendationId!,
    claimResult.claimToken!,
    signal.ownerId,
    enrichment,
    now,
  );

  return {
    outcome: finalResult.outcome,
    ...(finalResult.recommendation ? { recommendation: finalResult.recommendation } : {}),
    isFallback: enrichment.isFallback,
  };
}
