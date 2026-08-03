import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys.js";
import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { activityKeys } from "@/features/activity/hooks/activity.keys.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";
import type { CreateTaskDto } from "@/features/tasks/types/tasks.types.js";

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskDto) => tasksApi.create(data),

    onSuccess: (responseData) => {
      const { task } = responseData;

      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      if (task.projectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(task.projectId) });
      }

      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });

      toast.success(`Task "${task.title}" created successfully.`);
    },
  });
}
