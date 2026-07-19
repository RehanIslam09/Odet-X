import { useQuery } from "@tanstack/react-query";

import { projectsApi } from "@/features/projects/services/projects.api";
import type { ProjectsQueryParams } from "@/features/projects/types/projects.types";

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------
// Centralizing keys prevents typos and makes targeted invalidation possible.
// All project hooks use keys from this factory.

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: ProjectsQueryParams) =>
    [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  summaries: () => [...projectKeys.all, "summary"] as const,
  summary: (id: string) => [...projectKeys.summaries(), id] as const,
  options: () => [...projectKeys.all, "options"] as const,
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
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => projectsApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}
