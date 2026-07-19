import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";

/**
 * Create task mutation hook.
 *
 * On success: invalidates all task lists so the new task appears immediately
 * without a manual page refresh. Also invalidates project summary if applicable.
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tasksApi.create,

    onSuccess: (data) => {
      // Invalidate list queries to display the newly created task
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      
      // Phase 12.3: Invalidate project summary if this task belongs to a project
      if (data.task.projectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(data.task.projectId) });
      }
      
      toast.success("Task created successfully.");
    },

    onError: () => {
      // Individual field validation errors are caught by forms and rendered inline
    },
  });
}
