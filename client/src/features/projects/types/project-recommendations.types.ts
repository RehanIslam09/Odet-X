/**
 * Strongly typed representation of Phase 30 Proactive Project Intelligence recommendations.
 *
 * Invariants:
 * 1. Matches actual public WP-06 DTO returned by backend REST API.
 * 2. Excludes internal server fields (owner, __v, claimToken, claimedAt, purgeAt).
 * 3. Never represents internal PENDING_ENRICHMENT status in public UI types.
 */

export type ProjectSignalType =
  | "OVERDUE_HIGH_PRIORITY_TASKS"
  | "MILESTONE_AT_RISK"
  | "DEPENDENCY_BOTTLENECK"
  | "PROJECT_STALLED";

export type ProjectRecommendationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ProjectRecommendationStatus = "ACTIVE" | "DISMISSED" | "EXPIRED";

export type RelatedEntityType = "task" | "milestone" | "project";

export interface RelatedEntityRef {
  type: RelatedEntityType;
  id: string;
  label: string;
}

export interface ProjectRecommendation {
  id: string;
  projectId: string;
  type: ProjectSignalType;
  severity: ProjectRecommendationSeverity;
  title: string;
  explanation: string;
  suggestedNextStep?: string | null;
  facts: Record<string, unknown>;
  relatedEntities: RelatedEntityRef[];
  status: ProjectRecommendationStatus;
  dismissedAt?: string | null;
  actedOnAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface RecommendationQueryParams {
  page?: number;
  limit?: number;
  status?: ProjectRecommendationStatus;
  severity?: ProjectRecommendationSeverity;
}

export interface PaginatedRecommendationsResponse {
  recommendations: ProjectRecommendation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Human-readable display mapping for canonical signal types */
export const SIGNAL_TYPE_LABELS: Record<ProjectSignalType, string> = {
  OVERDUE_HIGH_PRIORITY_TASKS: "Overdue priority tasks",
  MILESTONE_AT_RISK: "Milestone at risk",
  DEPENDENCY_BOTTLENECK: "Dependency bottleneck",
  PROJECT_STALLED: "Project stalled",
};

/** Human-readable display mapping for severity values */
export const SEVERITY_LABELS: Record<ProjectRecommendationSeverity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};
