/**
 * Project domain constants.
 *
 * These are the single source of truth for all field limits used by both the
 * Mongoose schema and the Zod validator. Keeping them here ensures the two
 * layers can never silently diverge.
 */

/** Maximum characters allowed in a project name. Chosen for card layout. */
export const MAX_PROJECT_NAME_LENGTH = 80;

/** Maximum characters allowed in a project description. */
export const MAX_PROJECT_DESCRIPTION_LENGTH = 1000;

/**
 * Maximum number of projects returned per paginated request.
 * Enforced on the service layer — callers cannot bypass this ceiling.
 */
export const MAX_PAGE_SIZE = 50;

/** Default number of projects per page when the caller omits the param. */
export const DEFAULT_PAGE_SIZE = 12;

/** Default sort order for the project list. */
export const DEFAULT_SORT = "-updatedAt";

/**
 * Whitelisted sort fields.
 *
 * A leading `-` prefix is applied by the service to sort descending.
 * Regex search is used for the `name` field. Text indexing can be
 * introduced later (Atlas Search / $text) without changing this list.
 *
 * Format: the value used in the query param, which is then mapped to the
 * Mongoose sort expression by the service.
 */
export const ALLOWED_SORT_FIELDS = ["updatedAt", "createdAt", "name"] as const;

export type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number];
