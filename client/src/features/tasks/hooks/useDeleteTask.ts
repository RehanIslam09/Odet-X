import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";
import type { Task, TasksListResponseData } from "@/features/tasks/types/tasks.types.js";

/**
 * Delete task mutation hook.
 *
 * Performs a soft-delete on the server.
 * On success: removes the detail query cache, invalidates all task lists, and invalidates the project summary.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),

    onMutate: async (id) => {
      // Find the task in the cache to get its projectId for invalidation later
      let taskToCancel: Task | undefined;
      const detail = queryClient.getQueryData<{ task: Task }>(taskKeys.detail(id));
      if (detail?.task) {
        taskToCancel = detail.task;
      } else {
        // Search in list queries if detail is not cached
        const lists = queryClient.getQueriesData<TasksListResponseData>({ queryKey: taskKeys.lists() });
        for (const [_, data] of lists) {
          const found = data?.items?.find((t) => t.id === id);
          if (found) {
            taskToCancel = found;
            break;
          }
        }
      }
      return { previousTask: taskToCancel };
    },

    onSuccess: (_data, id, context) => {
      // Remove detail query cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      // Phase 12.3: Invalidate project summary
      if (context?.previousTask?.projectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(context.previousTask.projectId) });
      }

      toast.success("Task deleted.");
    },
  });
}
