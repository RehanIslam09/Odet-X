import crypto from "crypto";
import { Types } from "mongoose";
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

/**
 * Attempts to atomically claim ownership for enriching a ProjectSignal.
 *
 * Concurrency & Deduplication Invariants:
 * 1. Checks if a DISMISSED recommendation for the same fingerprint is in active cooldown.
 * 2. Uses the MongoDB partial unique index on { projectId: 1, fingerprint: 1 } for status IN ["ACTIVE", "PENDING_ENRICHMENT"].
 * 3. On E11000 duplicate key error, inspects existing state:
 *    - If ACTIVE exists -> returns SKIPPED_ACTIVE (0 AI calls).
 *    - If fresh PENDING_ENRICHMENT exists (claimedAt >= now - 30s) -> returns SKIPPED_IN_PROGRESS (0 AI calls).
 *    - If stale PENDING_ENRICHMENT exists (claimedAt < now - 30s) -> attempts atomic findOneAndUpdate recovery.
 */
export async function acquireRecommendationClaim(
  signal: ProjectSignal,
  now: Date = new Date(),
): Promise<RecommendationClaimResult> {
  const projectObjId = new Types.ObjectId(signal.projectId);
  const ownerObjId = new Types.ObjectId(signal.ownerId);

  // 1. Check for DISMISSED cooldown (projectId + fingerprint)
  const existingDismissed = await ProjectRecommendation.findOne({
    owner: ownerObjId,
    projectId: projectObjId,
    fingerprint: signal.fingerprint,
    status: "DISMISSED",
  }).sort({ dismissedAt: -1 });

  if (existingDismissed && existingDismissed.expiresAt && existingDismissed.expiresAt.getTime() > now.getTime()) {
    return { outcome: "SKIPPED_COOLDOWN" };
  }

  // 2. Generate new unique server-side lease token
  const myClaimToken = crypto.randomUUID();

  // Construct initial title fallback from facts or signal type
  const rawTitle = signal.facts.blockingTaskTitle || signal.facts.milestoneTitle;
  const initialTitle = typeof rawTitle === "string" && rawTitle.trim().length > 0
    ? rawTitle.trim()
    : (signal.type === "OVERDUE_HIGH_PRIORITY_TASKS"
      ? "High-priority tasks overdue"
      : signal.type === "PROJECT_STALLED"
      ? "Project activity stalled"
      : "Project attention required");

  // 3. Attempt atomic insert
  try {
    const doc = (await ProjectRecommendation.create({
      owner: ownerObjId,
      projectId: projectObjId,
      type: signal.type,
      severity: signal.severity,
      title: initialTitle,
      explanation: "", // Empty for pending state
      facts: signal.facts,
      relatedEntities: signal.relatedEntities,
      fingerprint: signal.fingerprint,
      status: "PENDING_ENRICHMENT",
      claimToken: myClaimToken,
      claimedAt: now,
    })) as unknown as IProjectRecommendationDocument;

    return {
      outcome: "CLAIMED",
      recommendationId: doc._id.toString(),
      claimToken: myClaimToken,
      recovered: false,
    };
  } catch (error: any) {
    // E11000 duplicate key error handling
    if (error?.code !== 11000) {
      throw error; // Propagate non-duplicate database errors normally
    }

    // Inspect existing active or pending recommendation
    const existing = await ProjectRecommendation.findOne({
      projectId: projectObjId,
      fingerprint: signal.fingerprint,
      status: { $in: ["ACTIVE", "PENDING_ENRICHMENT"] },
    });

    if (!existing) {
      // Race state change -> return in-progress safely
      return { outcome: "SKIPPED_IN_PROGRESS" };
    }

    if (existing.status === "ACTIVE") {
      return { outcome: "SKIPPED_ACTIVE" };
    }

    // Status is PENDING_ENRICHMENT -> evaluate lease staleness
    const staleThreshold = new Date(now.getTime() - PROACTIVE_CLAIM_LEASE_MS);
    if (!existing.claimedAt || existing.claimedAt.getTime() >= staleThreshold.getTime()) {
      return { outcome: "SKIPPED_IN_PROGRESS" }; // Lease is fresh and owned by another worker
    }

    // Lease is stale (claimedAt < now - 30s) -> attempt atomic takeover
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

/**
 * Finalizes recommendation enrichment with strict lease ownership verification.
 *
 * Security & Authority Invariants:
 * 1. Filter requires: _id, owner, status === "PENDING_ENRICHMENT", AND claimToken === callerToken.
 * 2. If matchedCount === 0 (lease stolen/expired/already activated), enrichment is DISCARDED.
 * 3. On success: transitions to ACTIVE, stores AI presentation text, sets expiresAt to now + 14 days,
 *    and unsets claimToken & claimedAt.
 */
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

/**
 * Dismisses an ACTIVE recommendation by user request or domain policy.
 * Sets dismissal cooldown (expiresAt = now + 7 days) and retention purge (purgeAt = now + 30 days).
 */
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

/**
 * Reconciles ACTIVE recommendations for a project against currently detected signals.
 *
 * Transitions:
 * 1. If an ACTIVE recommendation's fingerprint is no longer in activeSignals -> EXPIRED.
 * 2. If an ACTIVE recommendation's logical expiresAt has passed -> EXPIRED.
 * Sets expiresAt = now, purgeAt = now + 30 days.
 */
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
// 5. Convenience Orchestration Pipeline (Claim -> Enrich -> Finalize)
// ---------------------------------------------------------------------------

/**
 * Complete end-to-end orchestration for processing one ProjectSignal.
 *
 * Guarantees:
 * 1. Acquires DB claim BEFORE calling AI (AI calls = 0 if already active/pending/cooldown).
 * 2. Performs ONCE WP-03 AI enrichment only if ownership is acquired.
 * 3. Finalizes with ownership verification.
 */
export async function processProjectSignalRecommendation(
  signal: ProjectSignal,
  projectContext?: { name?: string; description?: string },
  now: Date = new Date(),
): Promise<OrchestrationResult> {
  // 1. Acquire or recover claim
  const claimResult = await acquireRecommendationClaim(signal, now);

  if (claimResult.outcome !== "CLAIMED" && claimResult.outcome !== "RECOVERED") {
    return { outcome: claimResult.outcome }; // ZERO AI calls!
  }

  // 2. Invoke WP-03 enrichment ONCE
  const enrichment = await enrichProjectSignal({
    signal,
    ...(projectContext ? { projectContext } : {}),
  });

  // 3. Ownership-verified finalization
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
