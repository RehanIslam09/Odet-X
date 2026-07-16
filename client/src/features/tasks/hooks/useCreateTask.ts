import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";

/**
 * Create task mutation hook.
 *
 * On success: invalidates all task lists so the new task appears immediately
 * without a manual page refresh.
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.create,

    onSuccess: () => {
      // Invalidate list queries to display the newly created task
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success("Task created successfully.");
    },

    onError: () => {
      // Individual field validation errors are caught by forms and rendered inline
    },
  });
}
