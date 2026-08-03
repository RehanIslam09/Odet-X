import { z } from "zod";

import {
  ALLOWED_SORT_FIELDS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  MAX_PAGE_SIZE,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
} from "@/constants/project.js";

// ---------------------------------------------------------------------------
// Reusable field schemas
// ---------------------------------------------------------------------------

/**
 * Name field — trimmed, bounded by the same constant used in the Mongoose schema
 * so the two layers cannot silently diverge.
 */
const nameSchema = z
  .string({ error: "Name is required." })
  .trim()
  .min(1, "Project name is required.")
  .max(
    MAX_PROJECT_NAME_LENGTH,
    `Project name must be at most ${MAX_PROJECT_NAME_LENGTH} characters.`,
  );

/**
 * Description field — optional, trimmed, bounded.
 */
const descriptionSchema = z
  .string()
  .trim()
  .max(
    MAX_PROJECT_DESCRIPTION_LENGTH,
    `Description must be at most ${MAX_PROJECT_DESCRIPTION_LENGTH} characters.`,
  )
  .optional()
  .default("");

/**
 * Emoji / Icon field — stored as a plain string (Lucide icon name or legacy emoji string).
 */
const emojiSchema = z.string().max(50).optional().default("Folder");

/**
 * Color field — hex color only. Validated against the 6-digit lowercase or
 * uppercase hex format (#3B82F6). No RGB, no alpha, no named colors.
 */
const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color (e.g. #3B82F6).")
  .optional()
  .default("#6366f1");

// ---------------------------------------------------------------------------
// Create schema
// ---------------------------------------------------------------------------

/**
 * Validates the body of `POST /projects`.
 *
 * `owner` is NOT part of this schema — it is always derived from the
 * authenticated user on the service layer and never accepted from the client.
 */
export const createProjectSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  emoji: emojiSchema,
  color: colorSchema,
});

// ---------------------------------------------------------------------------
// Update schema
// ---------------------------------------------------------------------------

/**
 * Validates the body of `PATCH /projects/:id`.
 *
 * All fields are optional — partial updates are supported.
 * `owner`, `isDeleted`, and `archived` cannot be updated through this endpoint.
 * Archive is a separate operation (`POST /projects/:id/archive`).
 */
export const updateProjectSchema = z.object({
  name: nameSchema.optional(),
  description: descriptionSchema,
  emoji: emojiSchema,
  color: colorSchema,
  aiSummary: z.object({
    summary: z.string(),
    highlights: z.array(z.string()),
    risks: z.array(z.string())
  }).optional(),
});

// ---------------------------------------------------------------------------
// Query schema
// ---------------------------------------------------------------------------

/**
 * Validates query parameters for `GET /projects`.
 *
 * All params are optional with safe defaults so callers can omit them.
 *
 * - `page` / `limit` — server-enforced pagination. `limit` is capped at
 *   `MAX_PAGE_SIZE` regardless of what the caller sends.
 * - `search` — case-insensitive substring match on `name`. Backed by a regex
 *   query now; designed so a MongoDB text index or Atlas Search can be
 *   transparently swapped in later without changing the API contract.
 * - `sort` — whitelisted to prevent arbitrary field injection. A leading `-`
 *   prefix signals descending order and is applied by the service layer.
 * - `archived` — when true, includes only archived projects. When false
 *   (default), includes only non-archived projects. "Show Archived" toggle
 *   in the UI maps to this param.
 */
export const projectQuerySchema = z.object({
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
});

// ---------------------------------------------------------------------------
// DTOs — inferred from schemas, single source of truth
// ---------------------------------------------------------------------------

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type ProjectQueryDto = z.infer<typeof projectQuerySchema>;

// ---------------------------------------------------------------------------
// AI Validation
// ---------------------------------------------------------------------------

export const generateProjectTasksSchema = z.object({
  description: z.string().trim().min(1, "A project description is required for task generation."),
});

export type GenerateProjectTasksDto = z.infer<typeof generateProjectTasksSchema>;

export const generateProjectSummarySchema = z.object({}); // Empty body

export type GenerateProjectSummaryDto = z.infer<typeof generateProjectSummarySchema>;
