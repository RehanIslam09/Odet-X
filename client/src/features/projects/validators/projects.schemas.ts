import { z } from "zod";

/**
 * Validation constants — intentionally duplicated from server constants.
 * The frontend validation contract is independently maintainable and should
 * not be coupled to server internals.
 */
const NAME_MAX = 80;
const DESCRIPTION_MAX = 1000;
const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

// ---------------------------------------------------------------------------
// Create Schema
// ---------------------------------------------------------------------------

/**
 * Validation schema for the Create Project form.
 * Rules mirror the backend `createProjectSchema` for instant feedback.
 */
export const createProjectSchema = z.object({
  name: z
    .string({ error: "Project name is required." })
    .trim()
    .min(1, "Project name is required.")
    .max(NAME_MAX, `Project name must be at most ${NAME_MAX} characters.`),

  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters.`)
    .optional()
    .default(""),

  emoji: z
    .string()
    .max(10)
    .optional()
    .default("📁"),

  color: z
    .string()
    .regex(COLOR_REGEX, "Must be a valid hex color (e.g. #3B82F6).")
    .optional()
    .default("#6366f1"),
});

// ---------------------------------------------------------------------------
// Update Schema
// ---------------------------------------------------------------------------

/**
 * Validation schema for the Edit Project form.
 * All fields are optional — partial updates are supported.
 */
export const updateProjectSchema = z.object({
  name: z
    .string({ error: "Project name is required." })
    .trim()
    .min(1, "Project name is required.")
    .max(NAME_MAX, `Project name must be at most ${NAME_MAX} characters.`)
    .optional(),

  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters.`)
    .optional(),

  emoji: z.string().max(10).optional(),

  color: z
    .string()
    .regex(COLOR_REGEX, "Must be a valid hex color (e.g. #3B82F6).")
    .optional(),
});

// ---------------------------------------------------------------------------
// Inferred Types — single source of truth for form values
// ---------------------------------------------------------------------------

export type CreateProjectFormInput = z.input<typeof createProjectSchema>;
export type CreateProjectFormValues = z.output<typeof createProjectSchema>;
export type UpdateProjectFormInput = z.input<typeof updateProjectSchema>;
export type UpdateProjectFormValues = z.output<typeof updateProjectSchema>;
