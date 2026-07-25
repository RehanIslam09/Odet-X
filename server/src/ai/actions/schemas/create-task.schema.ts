import { z } from "zod";

/**
 * Zod schema for CREATE_TASK proposed action.
 * Target is always the project itself.
 */
export const CreateTaskPayloadSchema = z.object({
  action: z.literal("CREATE_TASK"),
  targetRef: z.literal("project"),
  arguments: z.object({
    title: z.string().trim().min(1, "Task title cannot be empty").max(200, "Task title cannot exceed 200 characters"),
    description: z.string().max(2000, "Task description cannot exceed 2000 characters").optional().default(""),
    status: z.preprocess(
      (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
      z.enum(["todo", "in_progress", "in_review", "done"]),
    ).optional().default("todo"),
    priority: z.preprocess(
      (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
      z.enum(["low", "medium", "high", "urgent"]),
    ).optional().default("medium"),
    dueDate: z.preprocess(
      (val) => (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim()) ? `${val.trim()}T00:00:00.000Z` : val),
      z.string().datetime({ message: "Invalid ISO date string format" }).nullable(),
    ).optional().default(null),
    labels: z.array(z.string().trim().min(1).max(30)).optional().default([]),
  }),
  explanation: z.preprocess(
    (val) => (typeof val === "string" ? (val.trim().length > 0 ? val.trim() : "Proposed task creation per user request.") : val),
    z.string().min(1, "Explanation cannot be empty").max(500, "Explanation cannot exceed 500 characters"),
  ),
});

export type CreateTaskPayload = z.infer<typeof CreateTaskPayloadSchema>;
