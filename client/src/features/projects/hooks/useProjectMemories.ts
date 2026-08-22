import { useQuery } from "@tanstack/react-query";

import { projectMemoryApi } from "@/features/projects/services/project-memory.api";
import type { ProjectMemoryQueryParams } from "@/features/projects/types/project-memory.types";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------

export const projectMemoryKeys = {
  all: ["project-memories"] as const,
  projectLists: (projectId: string, workspaceId?: string | null) =>
    workspaceId
      ? ([...projectMemoryKeys.all, "list", projectId, workspaceId] as const)
      : ([...projectMemoryKeys.all, "list", projectId] as const),
  list: (projectId: string, params?: ProjectMemoryQueryParams, workspaceId?: string | null) =>
    [...projectMemoryKeys.projectLists(projectId, workspaceId), params] as const,
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
  const { activeWorkspaceId } = useActiveWorkspace();

  return useQuery({
    queryKey: projectMemoryKeys.list(projectId, params, activeWorkspaceId),
    queryFn: () => projectMemoryApi.list(projectId, params),
    placeholderData: (previousData) => previousData,
    enabled: Boolean(projectId),
  });
}
