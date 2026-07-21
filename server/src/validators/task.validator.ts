import { Types } from "mongoose";
import { z } from "zod";

import {
  ALLOWED_SORT_FIELDS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  MAX_PAGE_SIZE,
  MAX_TASK_DESCRIPTION_LENGTH,
  MAX_TASK_ESTIMATED_TIME_LENGTH,
  MAX_TASK_TITLE_LENGTH,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "@/constants/task.js";

// ---------------------------------------------------------------------------
// Reusable schemas
// ---------------------------------------------------------------------------

const titleSchema = z
  .string({ error: "Title is required." })
  .trim()
  .min(1, "Title cannot be empty.")
  .max(MAX_TASK_TITLE_LENGTH, `Title must be at most ${MAX_TASK_TITLE_LENGTH} characters.`);

const descriptionSchema = z
  .string()
  .trim()
  .max(
    MAX_TASK_DESCRIPTION_LENGTH,
    `Description must be at most ${MAX_TASK_DESCRIPTION_LENGTH} characters.`,
  )
  .optional();

const projectIdSchema = z
  .preprocess((val) => (val === "" ? null : val), z.string().nullable().optional())
  .refine((val) => val === null || val === undefined || Types.ObjectId.isValid(val), {
    message: "Invalid project ID format.",
  });

const dueDateSchema = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return null;
    return typeof val === "string" ? new Date(val) : val;
  },
  z
    .date({ error: "Invalid date format." })
    .refine((d) => d === null || !isNaN(d.getTime()), {
      message: "Invalid date object.",
    })
    .nullable()
    .optional(),
);

const estimatedTimeSchema = z
  .string()
  .trim()
  .max(
    MAX_TASK_ESTIMATED_TIME_LENGTH,
    `Estimated time must be at most ${MAX_TASK_ESTIMATED_TIME_LENGTH} characters.`,
  )
  .nullable()
  .optional();

const labelsSchema = z
  .array(z.string().trim())
  .optional();

// ---------------------------------------------------------------------------
// Create schema
// ---------------------------------------------------------------------------

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  projectId: projectIdSchema,
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dueDateSchema,
  estimatedTime: estimatedTimeSchema,
  labels: labelsSchema,
});

// ---------------------------------------------------------------------------
// Update schema
// ---------------------------------------------------------------------------

export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  projectId: projectIdSchema,
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dueDateSchema,
  estimatedTime: estimatedTimeSchema,
  labels: labelsSchema,
});

export const updateTaskNotesSchema = z.object({
  notes: z
    .string()
    .max(250000, "Notes must be at most 250,000 characters."),
  expectedVersion: z.number().int().nonnegative().optional(),
});

// ---------------------------------------------------------------------------
// Query schema
// ---------------------------------------------------------------------------

export const taskQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, "Page must be at least 1.")
    .optional()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE, `Limit cannot exceed ${MAX_PAGE_SIZE}.`)
    .optional()
    .default(DEFAULT_PAGE_SIZE),

  search: z.string().trim().optional(),

  status: z
    .enum(["all", ...TASK_STATUSES])
    .optional()
    .default("all"),

  priority: z
    .enum(["all", ...TASK_PRIORITIES])
    .optional()
    .default("all"),

  projectId: z
    .preprocess(
      (val) => (val === "" ? "all" : val),
      z.string().optional().default("all"),
    )
    .refine((val) => val === "all" || Types.ObjectId.isValid(val), {
      message: "Invalid project ID filter format.",
    }),

  sort: z
    .string()
    .refine(
      (val) => {
        const field = val.startsWith("-") ? val.slice(1) : val;
        return (ALLOWED_SORT_FIELDS as readonly string[]).includes(field);
      },
      {
        message: `Sort must be one of: ${ALLOWED_SORT_FIELDS.map((f) => `${f}, -${f}`).join(", ")}.`,
      },
    )
    .optional()
    .default(DEFAULT_SORT),

  archived: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional()
    .default(false),

  quickFilter: z
    .enum(["all", "my-tasks", "due-today", "overdue", "completed"])
    .optional(),
});

// ---------------------------------------------------------------------------
// Infer DTO Types
// ---------------------------------------------------------------------------

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type UpdateTaskNotesDto = z.infer<typeof updateTaskNotesSchema>;
export type TaskQueryDto = z.infer<typeof taskQuerySchema>;
export type TaskParamDto = { id: string };

// ---------------------------------------------------------------------------
// AI Validation
// ---------------------------------------------------------------------------

export const generateTaskLabelsSchema = z.object({}); // Empty body, relies on URL params and user context

export type GenerateTaskLabelsDto = z.infer<typeof generateTaskLabelsSchema>;
