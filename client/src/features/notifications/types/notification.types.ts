export type NotificationType =
  | "task.due_soon"
  | "task.overdue"
  | "task.assigned"
  | "project.invited"
  | "mention.created"
  | "ai.insight_ready"
  | "ai.daily_brief_ready"
  | "system.announcement";

export interface Notification {
  id: string; // The virtual populated from MongoDB's _id
  recipientId: string;
  actorId: string | null;
  type: NotificationType | string; // Permit future arbitrary types
  entityType: "project" | "task" | "system" | null;
  entityId: string | null;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  readAt: string | null; // ISO string if read
  createdAt: string; // ISO string
}

export type NotificationReadStatus = "all" | "unread" | "read";

export interface NotificationPagination {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface CursorPaginatedNotifications {
  items: Notification[];
  pagination: NotificationPagination;
}

export interface NotificationQueryDto {
  cursor?: string;
  limit?: number;
  readStatus?: NotificationReadStatus;
}
