import { z } from "zod";

/**
 * Zod schema for ADD_TASK_LABEL proposed action.
 * Target must be a symbolic reference string to a task (e.g. "task_1").
 * Label must be a non-empty string up to 30 characters.
 */
export const AddTaskLabelPayloadSchema = z.object({
  action: z.literal("ADD_TASK_LABEL"),
  targetRef: z.string().trim().min(1, "Target reference cannot be empty").max(50, "Target reference cannot exceed 50 characters"),
  arguments: z.object({
    label: z.string().trim().min(1, "Label cannot be empty").max(30, "Label cannot exceed 30 characters"),
  }),
  explanation: z.preprocess(
    (val) => (typeof val === "string" ? (val.trim().length > 0 ? val.trim() : "Proposed task label addition per user request.") : val),
    z.string().min(1, "Explanation cannot be empty").max(500, "Explanation cannot exceed 500 characters"),
  ),
});

export type AddTaskLabelPayload = z.infer<typeof AddTaskLabelPayloadSchema>;
