import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";

/**
 * Update task notes mutation hook.
 *
 * On success: explicitly invalidates ONLY the task detail query.
 * It does NOT invalidate task lists, dashboard, or activity timelines,
 * ensuring autosaves do not cause widespread background refetching.
 */
export function useUpdateTaskNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes, expectedVersion }: { id: string; notes: string; expectedVersion?: number }) =>
      tasksApi.updateNotes(id, notes, expectedVersion),

    onSuccess: (responseData) => {
      const { task } = responseData;
      // We explicitly only set/invalidate the detail query.
      queryClient.setQueryData(taskKeys.detail(task.id), { task });
    },

    onError: () => {
      toast.error("Failed to save task notes.");
    },
  });
}
