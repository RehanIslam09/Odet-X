import { useQuery } from "@tanstack/react-query";

import { projectsApi } from "@/features/projects/services/projects.api";
import { projectKeys } from "@/features/projects/hooks/useProjects";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

/**
 * Fetches a single project by ID.
 *
 * Used by the project detail page and the edit dialog pre-fill.
 * The query is disabled when no `id` is provided, allowing the hook
 * to be called unconditionally in components.
 */
export function useProject(id: string | undefined) {
  const { activeWorkspaceId } = useActiveWorkspace();

  return useQuery({
    queryKey: id ? projectKeys.detail(id, activeWorkspaceId) : [],
    queryFn: () => {
      if (!id) {
        throw new Error("Project id is required.");
      }

      return projectsApi.getById(id);
    },
    enabled: Boolean(id),
  });
}
