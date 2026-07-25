import { z } from "zod";

/**
 * Zod schema for UPDATE_TASK_STATUS proposed action.
 * Target must be a symbolic reference string to a task (e.g. "task_1").
 */
export const UpdateTaskStatusPayloadSchema = z.object({
  action: z.literal("UPDATE_TASK_STATUS"),
  targetRef: z.string().trim().min(1, "Target reference cannot be empty").max(50, "Target reference cannot exceed 50 characters"),
  arguments: z.object({
    status: z.preprocess(
      (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
      z.enum(["todo", "in_progress", "in_review", "done", "cancelled"], {
        error: "Status must be one of: todo, in_progress, in_review, done, cancelled",
      }),
    ),
  }),
  explanation: z.preprocess(
    (val) => (typeof val === "string" ? (val.trim().length > 0 ? val.trim() : "Proposed task status change per user request.") : val),
    z.string().min(1, "Explanation cannot be empty").max(500, "Explanation cannot exceed 500 characters"),
  ),
});

export type UpdateTaskStatusPayload = z.infer<typeof UpdateTaskStatusPayloadSchema>;
