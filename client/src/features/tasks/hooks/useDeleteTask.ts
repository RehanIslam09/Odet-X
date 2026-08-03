import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys.js";
import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { activityKeys } from "@/features/activity/hooks/activity.keys.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";
import type { Task, TasksListResponseData } from "@/features/tasks/types/tasks.types.js";

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),

    onMutate: async (id) => {
      let previousTask: Task | undefined;
      const detail = queryClient.getQueryData<{ task: Task }>(taskKeys.detail(id));
      if (detail?.task) {
        previousTask = detail.task;
      } else {
        const lists = queryClient.getQueriesData<TasksListResponseData>({ queryKey: taskKeys.lists() });
        for (const [_, data] of lists) {
          const found = data?.items?.find((t) => t.id === id);
          if (found) {
            previousTask = found;
            break;
          }
        }
      }
      return { previousProjectId: previousTask?.projectId };
    },

    onSuccess: (_responseData, id, context) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      if (context?.previousProjectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(context.previousProjectId) });
      }

      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });

      toast.success("Task deleted successfully.");
    },
  });
}
