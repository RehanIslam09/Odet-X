import { z } from "zod";

import {
  MAX_WORKSPACE_NAME_LENGTH,
  MAX_WORKSPACE_SLUG_LENGTH,
  MIN_WORKSPACE_NAME_LENGTH,
  MIN_WORKSPACE_SLUG_LENGTH,
  WORKSPACE_SLUG_REGEX,
  WORKSPACE_ROLES,
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

export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  slug: workspaceSlugSchema.optional(),
  type: z.enum(["PERSONAL", "TEAM"]).optional(),
  accentColor: z.string().optional(),
  color: z.string().optional(),
});

export const updateWorkspaceSchema = z
  .object({
    name: workspaceNameSchema.optional(),
    slug: workspaceSlugSchema.optional(),
    accentColor: z.string().optional(),
    color: z.string().optional(),
    aiSettings: z
      .object({
        model: z.string().optional(),
        proactiveEnabled: z.boolean().optional(),
        memoryRetentionDays: z.number().optional(),
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.slug !== undefined ||
      data.accentColor !== undefined ||
      data.color !== undefined ||
      data.aiSettings !== undefined,
    {
      message: "At least one field must be provided for update.",
    },
  );

export const createInvitationSchema = z.object({
  email: z.string({ error: "Email address is required." }).trim().toLowerCase().email("Invalid email address."),
  role: z.enum(WORKSPACE_ROLES, { error: "Invalid workspace role." }).default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(WORKSPACE_ROLES, { error: "Invalid workspace role." }),
});

export const transferOwnershipSchema = z.object({
  newOwnerUserId: z.string({ error: "Target new owner user ID is required." }).min(1),
});

// ---------------------------------------------------------------------------
// DTOs — inferred from schemas as single source of truth
// ---------------------------------------------------------------------------

export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
export type CreateInvitationDto = z.infer<typeof createInvitationSchema>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>;
