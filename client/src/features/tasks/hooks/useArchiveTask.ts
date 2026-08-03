import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys.js";
import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { activityKeys } from "@/features/activity/hooks/activity.keys.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.archive(id),

    onSuccess: (responseData) => {
      const { task } = responseData;
      const verb = task.archived ? "archived" : "unarchived";

      queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      if (task.projectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(task.projectId) });
      }

      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });

      toast.success(`Task ${verb} successfully.`);
    },
  });
}
