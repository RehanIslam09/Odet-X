import { z } from "zod";

import {
  DEFAULT_MEMORY_PAGE_SIZE,
  MAX_MEMORY_CONTENT_LENGTH,
  MAX_MEMORY_PAGE_SIZE,
  MIN_MEMORY_CONTENT_LENGTH,
  MemorySourceType,
} from "@/constants/project-memory.js";

// ---------------------------------------------------------------------------
// Reusable field schemas
// ---------------------------------------------------------------------------

/**
 * Content field — trimmed, 1-1000 characters.
 * Trimming outer whitespace occurs before length checks so whitespace-only strings fail.
 * Internal whitespace is preserved.
 */
const contentSchema = z
  .string({ error: "Content is required." })
  .trim()
  .min(MIN_MEMORY_CONTENT_LENGTH, "Content cannot be empty.")
  .max(
    MAX_MEMORY_CONTENT_LENGTH,
    `Content must be at most ${MAX_MEMORY_CONTENT_LENGTH} characters.`,
  );

/**
 * Expected version field — integer >= 0 for optimistic concurrency control.
 */
const expectedVersionSchema = z
  .number({ error: "expectedVersion is required." })
  .int("expectedVersion must be an integer.")
  .min(0, "expectedVersion must be at least 0.");

// ---------------------------------------------------------------------------
// Create schema
// ---------------------------------------------------------------------------

/**
 * Validates memory creation payload.
 * `owner`, `projectId`, `sourceType` are server-assigned and never accepted here.
 */
export const createProjectMemorySchema = z.object({
  content: contentSchema,
});

// ---------------------------------------------------------------------------
// Update schema
// ---------------------------------------------------------------------------

/**
 * Validates memory update payload.
 * Requires `content` and `expectedVersion`.
 */
export const updateProjectMemorySchema = z.object({
  content: contentSchema,
  expectedVersion: expectedVersionSchema,
});

// ---------------------------------------------------------------------------
// Query schema
// ---------------------------------------------------------------------------

/**
 * Validates query parameters for listing project memories.
 */
export const projectMemoryQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer.")
    .min(1, "Page must be at least 1.")
    .optional()
    .default(1),

  limit: z.coerce
    .number()
    .int("Limit must be an integer.")
    .min(1, "Limit must be at least 1.")
    .max(MAX_MEMORY_PAGE_SIZE, `Limit cannot exceed ${MAX_MEMORY_PAGE_SIZE}.`)
    .optional()
    .default(DEFAULT_MEMORY_PAGE_SIZE),
});

// ---------------------------------------------------------------------------
// Inferred DTO Types
// ---------------------------------------------------------------------------

export type CreateProjectMemoryDto = z.infer<typeof createProjectMemorySchema>;
export type UpdateProjectMemoryDto = z.infer<typeof updateProjectMemorySchema>;
export type ProjectMemoryQueryDto = z.infer<typeof projectMemoryQuerySchema>;

/**
 * Safe DTO returned to service callers / clients.
 * `owner`, `projectId`, and raw `__v` are intentionally excluded.
 */
export interface ProjectMemoryDto {
  id: string;
  content: string;
  sourceType: MemorySourceType;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
