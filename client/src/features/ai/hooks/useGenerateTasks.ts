import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { aiApi } from "@/features/ai/services/ai.api.js";
import type { GenerateTasksDto } from "@/features/ai/types/ai.types.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys.js";
import { activityKeys } from "@/features/activity/hooks/activity.keys.js";

/**
 * Mutation hook for generating tasks using AI for a given project.
 */
export function useGenerateTasks(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateTasksDto) => aiApi.generateTasks(projectId, data),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });

      const count = data.items.length;
      toast.success(
        count === 1
          ? "1 task generated successfully."
          : `${count} tasks generated successfully.`,
      );
    },
  });
}
