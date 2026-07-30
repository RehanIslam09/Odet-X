/**
 * Type definitions for the Tasks feature.
 */

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  projectName?: string;
  projectColor?: string; // Hex or HSL color code to match modern aesthetics
  assigneeId?: string | null;
  watcherIds?: string[];
  dueDate: string | null; // ISO format: YYYY-MM-DD
  estimatedTime: string | null; // e.g., "2h", "1d", "30m"
  labels: string[];
  archived: boolean;
  isDeleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  version: number;
}

export interface TasksQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  projectId?: string | "all";
  sort?: string;
  archived?: boolean;
  quickFilter?: "all" | "my-tasks" | "due-today" | "overdue" | "completed";
}

export interface TaskResponseData {
  task: Task;
}

export interface TasksListResponseData {
  items: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
