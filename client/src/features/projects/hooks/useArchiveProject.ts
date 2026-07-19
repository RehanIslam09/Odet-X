import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { projectsApi } from "@/features/projects/services/projects.api";
import { projectKeys } from "@/features/projects/hooks/useProjects";

/**
 * Archive (toggle) project mutation.
 *
 * Archiving and unarchiving use the same endpoint — the server toggles
 * the `archived` field and returns the updated project.
 *
 * On success: invalidates all project lists. The project will disappear from
 * the default (non-archived) view and appear in the archived view, or vice versa.
 */
export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.archive(id),

    onSuccess: (data) => {
      const { project } = data;
      const verb = project.archived ? "archived" : "unarchived";

      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.options() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(project.id) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() });

      toast.success(`Project ${verb} successfully.`);
    },
  });
}
