/**
 * Project memory domain constants.
 *
 * These are the single source of truth for all field limits used by both the
 * Mongoose schema and the Zod validator. Keeping them here ensures the two
 * layers can never silently diverge.
 */

/** Minimum characters allowed in project memory content after trimming. */
export const MIN_MEMORY_CONTENT_LENGTH = 1;

/** Maximum characters allowed in project memory content after trimming. */
export const MAX_MEMORY_CONTENT_LENGTH = 1000;

/** Default number of memory items per page when caller omits limit parameter. */
export const DEFAULT_MEMORY_PAGE_SIZE = 25;

/** Maximum number of memory items returned per paginated request. */
export const MAX_MEMORY_PAGE_SIZE = 50;

/** Allowed source types for project memory documents in V1. */
export const MEMORY_SOURCE_TYPES = ["USER"] as const;

export type MemorySourceType = (typeof MEMORY_SOURCE_TYPES)[number];
