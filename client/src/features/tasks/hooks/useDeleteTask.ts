import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";

/**
 * Delete task mutation hook.
 *
 * Performs a soft-delete on the server.
 * On success: removes the detail query cache and invalidates all task lists.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),

    onSuccess: (_data, id) => {
      // Remove detail query cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      toast.success("Task deleted.");
    },
  });
}
