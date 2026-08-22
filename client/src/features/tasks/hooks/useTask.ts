import { useQuery } from "@tanstack/react-query";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

/**
 * Fetches a single task by ID.
 *
 * Scoped to details query key. Disables query execution if the ID is missing.
 */
export function useTask(id?: string) {
  const { activeWorkspaceId } = useActiveWorkspace();

  return useQuery({
    queryKey: id ? taskKeys.detail(id, activeWorkspaceId) : [],
    queryFn: () => {
      if (!id) throw new Error("Task ID is required.");
      return tasksApi.getById(id);
    },
    enabled: Boolean(id),
  });
}
