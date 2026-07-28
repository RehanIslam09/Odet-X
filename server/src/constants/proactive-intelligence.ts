/**
 * Proactive Project Intelligence domain constants.
 *
 * Single source of truth for Phase 30 policy thresholds, field constraints,
 * status/severity/signal enums, and worker safety bounds.
 */

// ---------------------------------------------------------------------------
// V1 Policy Constants
// ---------------------------------------------------------------------------

/** Days of zero updates/activity before an active project is flagged as STALLED. */
export const PROACTIVE_STALLED_THRESHOLD_DAYS = 7;

/** Days ahead of milestone target date to inspect for incomplete/overdue prerequisite tasks. */
export const PROACTIVE_MILESTONE_RISK_WINDOW_DAYS = 7;

/** Minimum incomplete downstream tasks required to trigger a DEPENDENCY_BOTTLENECK signal. */
export const PROACTIVE_BOTTLENECK_THRESHOLD_TASKS = 3;

/** Days an ACTIVE recommendation remains active before transitioning to EXPIRED if unresolved. */
export const PROACTIVE_RECOMMENDATION_ACTIVE_TTL_DAYS = 14;

/** Days a DISMISSED recommendation suppresses duplicate fingerprint generation during cooldown. */
export const PROACTIVE_DISMISSED_COOLDOWN_DAYS = 7;

/** Retention policy days before EXPIRED or DISMISSED recommendations are physically purged by MongoDB TTL. */
export const PROACTIVE_RETENTION_PURGE_DAYS = 30;

// ---------------------------------------------------------------------------
// Worker Safety Bounds
// ---------------------------------------------------------------------------

/** Maximum candidate active projects evaluated per background worker scan cycle. */
export const PROACTIVE_MAX_CANDIDATE_PROJECTS_PER_RUN = 50;

/** Maximum AI enrichment calls executed per background worker scan cycle. */
export const PROACTIVE_MAX_AI_CALLS_PER_RUN = 10;

/** Maximum AI enrichment calls permitted per user in a 24-hour window. */
export const PROACTIVE_MAX_AI_CALLS_PER_USER_DAY = 20;

/** Timeout in milliseconds for proactive AI enrichment requests (FAST_JSON tier). */
export const PROACTIVE_AI_TIMEOUT_MS = 15000;

/** Atomic lease duration (ms) for in-flight PENDING_ENRICHMENT claims. Must exceed AI execution budget. */
export const PROACTIVE_CLAIM_LEASE_MS = 30000; // 30 seconds

// ---------------------------------------------------------------------------
// Field Bounds
// ---------------------------------------------------------------------------

/** Maximum characters allowed for a recommendation title. */
export const MAX_RECOMMENDATION_TITLE_LENGTH = 150;

/** Maximum characters allowed for a recommendation natural language explanation. */
export const MAX_RECOMMENDATION_EXPLANATION_LENGTH = 1500;

/** Maximum characters allowed for a suggested next step string. */
export const MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH = 300;

/** Maximum number of related entities per recommendation. */
export const MAX_RECOMMENDATION_RELATED_ENTITIES = 20;

/** Length of SHA-256 hexadecimal fingerprint string. */
export const FINGERPRINT_HEX_LENGTH = 64;

// ---------------------------------------------------------------------------
// Canonical Enums & Union Types
// ---------------------------------------------------------------------------

/** Allowed statuses for ProjectRecommendation documents. */
export const PROJECT_RECOMMENDATION_STATUSES = [
  "PENDING_ENRICHMENT",
  "ACTIVE",
  "DISMISSED",
  "ACTED_ON",
  "EXPIRED",
] as const;

export type ProjectRecommendationStatus = (typeof PROJECT_RECOMMENDATION_STATUSES)[number];

/** Allowed severities for ProjectRecommendation documents (assigned 100% deterministically). */
export const PROJECT_RECOMMENDATION_SEVERITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type ProjectRecommendationSeverity = (typeof PROJECT_RECOMMENDATION_SEVERITIES)[number];

/** Frozen V1 signal types. */
export const PROJECT_SIGNAL_TYPES = [
  "OVERDUE_HIGH_PRIORITY_TASKS",
  "MILESTONE_AT_RISK",
  "DEPENDENCY_BOTTLENECK",
  "PROJECT_STALLED",
] as const;

export type ProjectSignalType = (typeof PROJECT_SIGNAL_TYPES)[number];

/** Allowed related entity types. */
export const RELATED_ENTITY_TYPES = ["task", "milestone", "project"] as const;

export type RelatedEntityType = (typeof RELATED_ENTITY_TYPES)[number];

// ---------------------------------------------------------------------------
// Canonical Domain Interfaces
// ---------------------------------------------------------------------------

/** Reference to a related entity attached to a signal or recommendation. */
export interface RelatedEntityRef {
  type: RelatedEntityType;
  id: string;
  label: string;
}

/** Pure deterministic signal emitted by signal detector engine. */
export interface ProjectSignal {
  type: ProjectSignalType;
  ownerId: string;
  projectId: string;
  severity: ProjectRecommendationSeverity;
  detectedAt: Date;
  relatedEntities: RelatedEntityRef[];
  facts: Record<string, unknown>;
  fingerprint: string;
}
