import { z } from "zod";

/**
 * Zod schema for UPDATE_TASK_DUE_DATE proposed action.
 * Target must be a symbolic reference string to a task (e.g. "task_1").
 * Due date must be an ISO datetime string or null (to clear due date).
 */
export const UpdateTaskDueDatePayloadSchema = z.object({
  action: z.literal("UPDATE_TASK_DUE_DATE"),
  targetRef: z.string().trim().min(1, "Target reference cannot be empty").max(50, "Target reference cannot exceed 50 characters"),
  arguments: z.object({
    dueDate: z.preprocess(
      (val) => (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim()) ? `${val.trim()}T00:00:00.000Z` : val),
      z.string().datetime({ message: "Invalid ISO date string format" }).nullable(),
    ),
  }),
  explanation: z.preprocess(
    (val) => (typeof val === "string" ? (val.trim().length > 0 ? val.trim() : "Proposed task due date change per user request.") : val),
    z.string().min(1, "Explanation cannot be empty").max(500, "Explanation cannot exceed 500 characters"),
  ),
});

export type UpdateTaskDueDatePayload = z.infer<typeof UpdateTaskDueDatePayloadSchema>;
