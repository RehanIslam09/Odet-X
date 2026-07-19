import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";

/**
 * Archive (toggle) task mutation hook.
 *
 * On success: invalidates all task lists and the specific task's detail cache.
 */
export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.archive(id),

    onSuccess: (responseData) => {
      const { task } = responseData;
      const verb = task.archived ? "archived" : "unarchived";

      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });

      // Phase 12.3: Invalidate project summary because archived tasks are excluded from live metrics
      if (task.projectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(task.projectId) });
      }

      toast.success(`Task ${verb} successfully.`);
    },
  });
}
