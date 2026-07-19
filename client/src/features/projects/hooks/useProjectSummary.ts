import { useQuery } from "@tanstack/react-query";

import { projectsApi } from "@/features/projects/services/projects.api.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";

/**
 * Fetches the progress metrics summary for a specific project.
 *
 * The query is disabled when no `id` is provided, allowing the hook
 * to be called unconditionally in components.
 */
export function useProjectSummary(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.summary(id ?? ""),
    queryFn: () => {
      if (!id) {
        throw new Error("Project id is required.");
      }

      return projectsApi.getSummary(id);
    },
    enabled: Boolean(id),
  });
}
