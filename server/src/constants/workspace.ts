/**
 * Workspace domain constants.
 *
 * Single source of truth for field limits, roles, and validation patterns
 * shared across Mongoose schemas, Zod validators, and domain services.
 */

/** Minimum characters allowed in a workspace name. */
export const MIN_WORKSPACE_NAME_LENGTH = 1;

/** Maximum characters allowed in a workspace name. */
export const MAX_WORKSPACE_NAME_LENGTH = 80;

/** Minimum characters allowed in a workspace slug. */
export const MIN_WORKSPACE_SLUG_LENGTH = 2;

/** Maximum characters allowed in a workspace slug. */
export const MAX_WORKSPACE_SLUG_LENGTH = 50;

/** Regex pattern for valid URL-safe workspace slugs: lowercase alphanumeric and single hyphens. */
export const WORKSPACE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Whitelisted Phase 32 workspace roles. */
export const WORKSPACE_ROLES = ["OWNER", "MEMBER"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
