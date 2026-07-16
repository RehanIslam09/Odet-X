import { z } from "zod";

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;
const ESTIMATED_TIME_MAX = 20;

const TASK_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"] as const;
const TASK_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

export const createTaskSchema = z.object({
  title: z
    .string({ error: "Title is required." })
    .trim()
    .min(1, "Title is required.")
    .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters.`),

  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters.`)
    .optional()
    .default(""),

  projectId: z
    .string()
    .nullable()
    .optional()
    .default(null),

  status: z
    .enum(TASK_STATUSES)
    .optional()
    .default("todo"),

  priority: z
    .enum(TASK_PRIORITIES)
    .optional()
    .default("none"),

  dueDate: z
    .string()
    .nullable()
    .optional()
    .default(null),

  estimatedTime: z
    .string()
    .trim()
    .max(ESTIMATED_TIME_MAX, `Estimated time must be at most ${ESTIMATED_TIME_MAX} characters.`)
    .nullable()
    .optional()
    .default(null),

  labelsString: z
    .string()
    .optional()
    .default(""),
});

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

export const updateTaskSchema = z.object({
  title: z
    .string({ error: "Title is required." })
    .trim()
    .min(1, "Title is required.")
    .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters.`)
    .optional(),

  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters.`)
    .optional(),

  projectId: z
    .string()
    .nullable()
    .optional(),

  status: z
    .enum(TASK_STATUSES)
    .optional(),

  priority: z
    .enum(TASK_PRIORITIES)
    .optional(),

  dueDate: z
    .string()
    .nullable()
    .optional(),

  estimatedTime: z
    .string()
    .trim()
    .max(ESTIMATED_TIME_MAX, `Estimated time must be at most ${ESTIMATED_TIME_MAX} characters.`)
    .nullable()
    .optional(),

  labelsString: z
    .string()
    .optional(),
});

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

export type CreateTaskFormInput = z.input<typeof createTaskSchema>;
export type CreateTaskFormValues = z.output<typeof createTaskSchema>;
export type UpdateTaskFormInput = z.input<typeof updateTaskSchema>;
export type UpdateTaskFormValues = z.output<typeof updateTaskSchema>;
