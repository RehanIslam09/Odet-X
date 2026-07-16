import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";

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

      toast.success(`Task ${verb} successfully.`);
    },
  });
}
