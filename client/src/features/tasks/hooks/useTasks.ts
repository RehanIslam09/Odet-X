import { useQuery } from "@tanstack/react-query";

import { tasksApi } from "@/features/tasks/services/tasks.api.js";
import type { TasksQueryParams } from "@/features/tasks/types/tasks.types.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------
// Centralizing keys prevents typos and makes targeted invalidation possible.
// All task hooks use keys from this factory.

export const taskKeys = {
  all: ["tasks"] as const,
  lists: (workspaceId?: string | null) =>
    workspaceId ? ([...taskKeys.all, "list", workspaceId] as const) : ([...taskKeys.all, "list"] as const),
  list: (params: TasksQueryParams, workspaceId?: string | null) =>
    [...taskKeys.lists(workspaceId), params] as const,
  details: (workspaceId?: string | null) =>
    workspaceId ? ([...taskKeys.all, "detail", workspaceId] as const) : ([...taskKeys.all, "detail"] as const),
  detail: (id: string, workspaceId?: string | null) =>
    [...taskKeys.details(workspaceId), id] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches a paginated, filtered list of tasks.
 *
 * The `params` object is included in the query key — changing any param
 * (page, limit, search, status, priority, projectId, sort, archived)
 * triggers a fresh fetch automatically.
 *
 * `placeholderData: (previousData) => previousData` ensures the previous page's
 * data remains visible while the next page loads, preventing layout shifts
 * during pagination.
 */
export function useTasks(params: TasksQueryParams = {}) {
  const { activeWorkspaceId } = useActiveWorkspace();
  return useQuery({
    queryKey: taskKeys.list(params, activeWorkspaceId),
    queryFn: () => tasksApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}
