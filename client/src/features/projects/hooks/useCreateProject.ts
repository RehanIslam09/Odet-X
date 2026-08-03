import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys.js";
import { projectsApi } from "@/features/projects/services/projects.api.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";
import { activityKeys } from "@/features/activity/hooks/activity.keys.js";
import type { CreateProjectDto } from "@/features/projects/types/projects.types.js";

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDto) => projectsApi.create(data),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.options() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });

      toast.success(`Project "${data.project.name}" created successfully.`);
    },
  });
}
