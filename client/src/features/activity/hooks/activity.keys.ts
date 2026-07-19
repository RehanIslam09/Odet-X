import type { ActivityQueryDto } from "../types/activity.types";

export const activityKeys = {
  all: ["activities"] as const,

  lists: () => [...activityKeys.all, "list"] as const,

  list: (params?: ActivityQueryDto) => [...activityKeys.lists(), params] as const,

  project: (projectId: string) => [...activityKeys.all, "project", projectId] as const,

  task: (taskId: string) => [...activityKeys.all, "task", taskId] as const,
};
