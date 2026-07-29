import type { ActivityQueryDto } from "../types/activity.types";

/**
 * Phase 32: TanStack Query key factory for activity queries.
 *
 * All workspace-sensitive activity keys include workspaceId per the Phase 32
 * architecture contract (s21 - Cache Isolation).
 * Calling lists(workspaceId) produces the workspace list prefix key.
 * Calling lists() produces the prefix key ["activities", "list"] for invalidation.
 */
export const activityKeys = {
  all: ["activities"] as const,

  lists: (workspaceId?: string) =>
    workspaceId
      ? ([...activityKeys.all, "list", workspaceId] as const)
      : ([...activityKeys.all, "list"] as const),

  list: (workspaceId: string, params?: Omit<ActivityQueryDto, "cursor">) =>
    [...activityKeys.lists(workspaceId), params] as const,

  project: (projectId: string) => [...activityKeys.all, "project", projectId] as const,

  task: (taskId: string) => [...activityKeys.all, "task", taskId] as const,
};
