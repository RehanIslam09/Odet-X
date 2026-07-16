import { useQuery } from "@tanstack/react-query";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";

/**
 * Fetches a single task by ID.
 *
 * Scoped to details query key. Disables query execution if the ID is missing.
 */
export function useTask(id?: string) {
  return useQuery({
    queryKey: id ? taskKeys.detail(id) : [],
    queryFn: () => {
      if (!id) throw new Error("Task ID is required.");
      return tasksApi.getById(id);
    },
    enabled: Boolean(id),
  });
}
