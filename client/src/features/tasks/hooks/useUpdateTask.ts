import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys.js";
import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { activityKeys } from "@/features/activity/hooks/activity.keys.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";
import type { Task, TasksListResponseData } from "@/features/tasks/types/tasks.types.js";

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      tasksApi.update(id, data),

    onMutate: async ({ id }) => {
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
      return { previousTask, previousProjectId: previousTask?.projectId };
    },

    onSuccess: (responseData, _variables, context) => {
      const { task } = responseData;
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      if (task.projectId !== context?.previousProjectId) {
        if (task.projectId) {
          queryClient.invalidateQueries({ queryKey: projectKeys.summary(task.projectId) });
        }
        if (context?.previousProjectId) {
          queryClient.invalidateQueries({ queryKey: projectKeys.summary(context.previousProjectId) });
        }
      }

      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
      toast.success("Task updated successfully.");
    },

    onError: () => {
      // Handled by forms
    },
  });
}
