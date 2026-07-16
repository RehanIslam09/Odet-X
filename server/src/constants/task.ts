/**
 * Task domain constants.
 *
 * Single source of truth for field length constraints, status/priority enums,
 * sorting configurations, and pagination limits across both Mongoose and Zod.
 */

/** Maximum characters allowed in a task title. */
export const MAX_TASK_TITLE_LENGTH = 150;

/** Maximum characters allowed in a task description. */
export const MAX_TASK_DESCRIPTION_LENGTH = 5000;

/** Maximum characters allowed in estimated time (e.g., "1d 4h", "30m"). */
export const MAX_TASK_ESTIMATED_TIME_LENGTH = 20;

/** Maximum number of tasks returned per paginated request. */
export const MAX_PAGE_SIZE = 100;

/** Default number of tasks per page when query limit is omitted. */
export const DEFAULT_PAGE_SIZE = 25;

/** Default sort order. */
export const DEFAULT_SORT = "dueDate";

/** Valid task statuses. Includes 'in_review' for standard team workflows. */
export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Valid task priorities. */
export const TASK_PRIORITIES = [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * Whitelisted sort fields.
 *
 * A leading `-` prefix is parsed by the service layer to determine descending order.
 */
export const ALLOWED_SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "title",
  "priority",
  "dueDate",
] as const;

export type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number];
