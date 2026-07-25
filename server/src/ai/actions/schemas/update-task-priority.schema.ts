import { z } from "zod";

/**
 * Zod schema for UPDATE_TASK_PRIORITY proposed action.
 * Target must be a symbolic reference string to a task (e.g. "task_1").
 */
export const UpdateTaskPriorityPayloadSchema = z.object({
  action: z.literal("UPDATE_TASK_PRIORITY"),
  targetRef: z.string().trim().min(1, "Target reference cannot be empty").max(50, "Target reference cannot exceed 50 characters"),
  arguments: z.object({
    priority: z.preprocess(
      (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
      z.enum(["low", "medium", "high", "urgent"], {
        error: "Priority must be one of: low, medium, high, urgent",
      }),
    ),
  }),
  explanation: z.preprocess(
    (val) => (typeof val === "string" ? (val.trim().length > 0 ? val.trim() : "Proposed task priority change per user request.") : val),
    z.string().min(1, "Explanation cannot be empty").max(500, "Explanation cannot exceed 500 characters"),
  ),
});

export type UpdateTaskPriorityPayload = z.infer<typeof UpdateTaskPriorityPayloadSchema>;
