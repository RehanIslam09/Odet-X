export const ACTIVITY_TYPES = {
  PROJECT_CREATED: "project.created",
  PROJECT_UPDATED: "project.updated",
  PROJECT_ARCHIVED: "project.archived",
  PROJECT_RESTORED: "project.restored", // from archive
  PROJECT_DELETED: "project.deleted",

  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_STATUS_CHANGED: "task.status_changed",
  TASK_PRIORITY_CHANGED: "task.priority_changed",
  TASK_PROJECT_CHANGED: "task.project_changed",
  TASK_ARCHIVED: "task.archived",
  TASK_RESTORED: "task.restored", // from archive
  TASK_DELETED: "task.deleted",

  AI_TASKS_GENERATED: "ai.tasks_generated",
  AI_SUMMARY_GENERATED: "ai.summary_generated",
  AI_LABELS_GENERATED: "ai.labels_generated",
  AI_PLAN_GENERATED: "ai.plan_generated",
  AI_PLAN_COMMITTED: "ai.plan_committed",
  AI_PLAN_DISCARDED: "ai.plan_discarded",
} as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];
