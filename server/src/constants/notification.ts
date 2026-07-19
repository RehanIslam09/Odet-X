export const NOTIFICATION_TYPES = {
  // Deferred: Scheduled Reminders
  TASK_DUE_SOON: "task.due_soon",
  TASK_OVERDUE: "task.overdue",

  // Deferred: Collaboration
  TASK_ASSIGNED: "task.assigned",
  PROJECT_INVITED: "project.invited",
  MENTION_CREATED: "mention.created",

  // Deferred: AI
  AI_INSIGHT_READY: "ai.insight_ready",
  AI_DAILY_BRIEF_READY: "ai.daily_brief_ready",

  // General System
  SYSTEM_ANNOUNCEMENT: "system.announcement",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
