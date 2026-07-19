import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";
import type { Task, TasksListResponseData } from "@/features/tasks/types/tasks.types.js";

/**
 * Update task mutation hook.
 *
 * On success: invalidates task details and all list queries to reflect changes.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      tasksApi.update(id, data),

    onMutate: async ({ id }) => {
      // Find the task in the cache to get its previous projectId
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
      return { previousTask };
    },

    onSuccess: (responseData, _variables, context) => {
      const { task } = responseData;
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      // Phase 12.3: Invalidate project summaries
      // If the task was moved between projects, invalidate both.
      const previousProjectId = context?.previousTask?.projectId;
      const newProjectId = task.projectId;

      if (previousProjectId && previousProjectId !== newProjectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(previousProjectId) });
      }
      if (newProjectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(newProjectId) });
      }

      toast.success("Task updated successfully.");
    },

    onError: () => {
      // Validation errors are mapped onto input elements by form controllers
    },
  });
}
