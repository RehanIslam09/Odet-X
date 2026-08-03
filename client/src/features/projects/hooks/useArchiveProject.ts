import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys.js";
import { projectsApi } from "@/features/projects/services/projects.api.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";
import { activityKeys } from "@/features/activity/hooks/activity.keys.js";

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
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });

      toast.success(`Project ${verb} successfully.`);
    },
  });
}
