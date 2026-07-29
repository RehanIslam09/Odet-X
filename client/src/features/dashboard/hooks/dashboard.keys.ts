/**
 * Phase 32: TanStack Query key factory for dashboard queries.
 *
 * All workspace-sensitive dashboard keys MUST include workspaceId as per
 * the Phase 32 architecture contract (s21 - Workspace Switching and Cache Isolation).
 * Calling overview(workspaceId) produces the exact workspace query key.
 * Calling overview() produces the prefix key ["dashboard", "overview"] for invalidation.
 */
export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: (workspaceId?: string) =>
    workspaceId
      ? ([...dashboardKeys.all, "overview", workspaceId] as const)
      : ([...dashboardKeys.all, "overview"] as const),
};
