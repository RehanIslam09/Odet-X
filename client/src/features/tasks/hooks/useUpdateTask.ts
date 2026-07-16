import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import type { Task } from "@/features/tasks/types/tasks.types.js";

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

    onSuccess: (responseData) => {
      const { task } = responseData;
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      toast.success("Task updated successfully.");
    },

    onError: () => {
      // Validation errors are mapped onto input elements by form controllers
    },
  });
}
