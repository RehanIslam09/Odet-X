import { z } from "zod";

import {
  MAX_WORKSPACE_NAME_LENGTH,
  MAX_WORKSPACE_SLUG_LENGTH,
  MIN_WORKSPACE_NAME_LENGTH,
  MIN_WORKSPACE_SLUG_LENGTH,
  WORKSPACE_SLUG_REGEX,
} from "@/constants/workspace.js";

// ---------------------------------------------------------------------------
// Pure Helper Utility
// ---------------------------------------------------------------------------

/**
 * Normalizes an arbitrary display string into a URL-safe workspace slug.
 * Example: "Rehan's Engineering Team!" -> "rehans-engineering-team"
 */
export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "workspace";
}

// ---------------------------------------------------------------------------
// Reusable Field Schemas
// ---------------------------------------------------------------------------

export const workspaceNameSchema = z
  .string({ error: "Workspace name is required." })
  .trim()
  .min(MIN_WORKSPACE_NAME_LENGTH, "Workspace name is required.")
  .max(
    MAX_WORKSPACE_NAME_LENGTH,
    `Workspace name must be at most ${MAX_WORKSPACE_NAME_LENGTH} characters.`,
  );

export const workspaceSlugSchema = z
  .string({ error: "Workspace slug must be a string." })
  .trim()
  .toLowerCase()
  .min(
    MIN_WORKSPACE_SLUG_LENGTH,
    `Workspace slug must be at least ${MIN_WORKSPACE_SLUG_LENGTH} characters.`,
  )
  .max(
    MAX_WORKSPACE_SLUG_LENGTH,
    `Workspace slug must be at most ${MAX_WORKSPACE_SLUG_LENGTH} characters.`,
  )
  .regex(
    WORKSPACE_SLUG_REGEX,
    "Workspace slug must contain only lowercase letters, numbers, and single hyphens.",
  );

// ---------------------------------------------------------------------------
// Endpoint Request Schemas
// ---------------------------------------------------------------------------

/**
 * Validates `POST /api/v1/workspaces`.
 * `ownerId`, `isPersonal`, and membership roles are server-controlled domain fields
 * and MUST NOT be accepted from client payloads.
 */
export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  slug: workspaceSlugSchema.optional(),
});

/**
 * Validates `PATCH /api/v1/workspaces/:workspaceId`.
 * All fields are optional, but at least one field must be provided.
 */
export const updateWorkspaceSchema = z
  .object({
    name: workspaceNameSchema.optional(),
    slug: workspaceSlugSchema.optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.slug !== undefined,
    {
      message: "At least one field (name or slug) must be provided for update.",
    },
  );

// ---------------------------------------------------------------------------
// DTOs — inferred from schemas as single source of truth
// ---------------------------------------------------------------------------

export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
