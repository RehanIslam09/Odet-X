import { useQuery } from "@tanstack/react-query";

import { projectMemoryApi } from "@/features/projects/services/project-memory.api";
import type { ProjectMemoryQueryParams } from "@/features/projects/types/project-memory.types";

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------

export const projectMemoryKeys = {
  all: ["project-memories"] as const,
  projectLists: (projectId: string) =>
    [...projectMemoryKeys.all, "list", projectId] as const,
  list: (projectId: string, params?: ProjectMemoryQueryParams) =>
    [...projectMemoryKeys.projectLists(projectId), params] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches a paginated list of project memories.
 */
export function useProjectMemories(
  projectId: string,
  params: ProjectMemoryQueryParams = { page: 1, limit: 25 },
) {
  return useQuery({
    queryKey: projectMemoryKeys.list(projectId, params),
    queryFn: () => projectMemoryApi.list(projectId, params),
    placeholderData: (previousData) => previousData,
    enabled: Boolean(projectId),
  });
}
