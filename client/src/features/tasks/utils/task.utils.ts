import type { TaskStatus } from "../types/tasks.types.js";

/**
 * Shared utility to determine if a task is overdue.
 *
 * A Task is overdue only when:
 * 1. dueDate exists
 * 2. dueDate < current time (beginning of day)
 * 3. status !== "done"
 * 4. status !== "cancelled"
 */
export function isTaskOverdue(dueDate: string | Date | null | undefined, status: TaskStatus): boolean {
  if (!dueDate || status === "done" || status === "cancelled") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return due.getTime() < today.getTime();
}
