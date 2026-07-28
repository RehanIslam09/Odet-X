import { z } from "zod";

/**
 * Zod schema for recommendation list query params.
 *
 * Excludes internal statuses like PENDING_ENRICHMENT.
 */
export const recommendationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "DISMISSED", "EXPIRED"]).optional().default("ACTIVE"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export type RecommendationQueryDto = z.infer<typeof recommendationQuerySchema>;

/**
 * Strict schema for recommendation dismissal request body.
 * Body fields are optional / forbidden to prevent malicious parameter injection.
 */
export const dismissRecommendationSchema = z.object({}).strict();
