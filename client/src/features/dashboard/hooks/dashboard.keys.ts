/**
 * Phase 32: TanStack Query key factory for dashboard queries.
 *
 * All workspace-sensitive dashboard keys MUST include workspaceId as per
 * the Phase 32 architecture contract (§21 — Workspace Switching & Cache Isolation).
 * This prevents stale cross-workspace data from being served by the cache when
 * switching between workspaces.
 */
export const dashboardKeys = {
  all: ["dashboard"] as const,
  /** Workspace-scoped overview key — includes workspaceId to isolate per workspace */
  overview: (workspaceId: string) => [...dashboardKeys.all, "overview", workspaceId] as const,
};
