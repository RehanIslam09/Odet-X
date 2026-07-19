export type ActivityType =
  | "project.created"
  | "project.updated"
  | "project.archived"
  | "project.restored"
  | "project.deleted"
  | "task.created"
  | "task.updated"
  | "task.status_changed"
  | "task.priority_changed"
  | "task.project_changed"
  | "task.archived"
  | "task.restored"
  | "task.deleted";

export interface Activity {
  id: string;
  owner: string;
  actorId: string;
  type: ActivityType | string; // support unknown future types
  entityType: "project" | "task";
  entityId: string;
  projectId?: string | null;
  taskId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string; // ISO date string
}

export interface ActivityPagination {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface CursorPaginatedActivities {
  items: Activity[];
  pagination: ActivityPagination;
}

export interface ActivityQueryDto {
  cursor?: string;
  limit?: number;
  projectId?: string;
  taskId?: string;
}
