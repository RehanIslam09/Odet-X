import { z } from "zod";
import {
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
} from "../types/search.types.js";

/**
 * Zod validation schema for GET /api/v1/search query parameters.
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(
      SEARCH_MIN_QUERY_LENGTH,
      `Query must be at least ${SEARCH_MIN_QUERY_LENGTH} characters`
    )
    .max(
      SEARCH_MAX_QUERY_LENGTH,
      `Query cannot exceed ${SEARCH_MAX_QUERY_LENGTH} characters`
    ),
  type: z
    .enum(["all", "project", "task", "milestone", "memory"])
    .optional()
    .default("all"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SEARCH_MAX_LIMIT)
    .optional()
    .default(SEARCH_DEFAULT_LIMIT),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
