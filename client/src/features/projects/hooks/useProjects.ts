import { useQuery } from "@tanstack/react-query";

import { projectsApi } from "@/features/projects/services/projects.api";
import type { ProjectsQueryParams } from "@/features/projects/types/projects.types";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------
// Centralizing keys prevents typos and makes targeted invalidation possible.
// All project hooks use keys from this factory.

export const projectKeys = {
  all: ["projects"] as const,
  lists: (workspaceId?: string | null) =>
    workspaceId ? ([...projectKeys.all, "list", workspaceId] as const) : ([...projectKeys.all, "list"] as const),
  list: (params: ProjectsQueryParams, workspaceId?: string | null) =>
    [...projectKeys.lists(workspaceId), params] as const,
  details: (workspaceId?: string | null) =>
    workspaceId ? ([...projectKeys.all, "detail", workspaceId] as const) : ([...projectKeys.all, "detail"] as const),
  detail: (id: string, workspaceId?: string | null) =>
    [...projectKeys.details(workspaceId), id] as const,
  summaries: (workspaceId?: string | null) =>
    workspaceId ? ([...projectKeys.all, "summary", workspaceId] as const) : ([...projectKeys.all, "summary"] as const),
  summary: (id: string, workspaceId?: string | null) =>
    [...projectKeys.summaries(workspaceId), id] as const,
  options: (workspaceId?: string | null) =>
    workspaceId ? ([...projectKeys.all, "options", workspaceId] as const) : ([...projectKeys.all, "options"] as const),
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches a paginated, filtered list of projects.
 *
 * The `params` object is included in the query key — changing any param
 * (page, search, sort, archived) triggers a fresh fetch automatically.
 * React Query handles deduplication and caching.
 *
 * `placeholderData: keepPreviousData` ensures the previous page's data
 * remains visible while the next page loads, preventing UI flicker during
 * pagination.
 */
export function useProjects(params: ProjectsQueryParams = {}) {
  const { activeWorkspaceId } = useActiveWorkspace();
  return useQuery({
    queryKey: projectKeys.list(params, activeWorkspaceId),
    queryFn: () => projectsApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}
