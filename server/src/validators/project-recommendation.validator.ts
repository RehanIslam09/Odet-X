import { z } from "zod";

import {
  FINGERPRINT_HEX_LENGTH,
  MAX_RECOMMENDATION_EXPLANATION_LENGTH,
  MAX_RECOMMENDATION_RELATED_ENTITIES,
  MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH,
  MAX_RECOMMENDATION_TITLE_LENGTH,
  PROJECT_RECOMMENDATION_SEVERITIES,
  PROJECT_RECOMMENDATION_STATUSES,
  PROJECT_SIGNAL_TYPES,
  RELATED_ENTITY_TYPES,
} from "@/constants/proactive-intelligence.js";

// ---------------------------------------------------------------------------
// Primitive Enum Schemas
// ---------------------------------------------------------------------------

/** Validates lifecycle status enum. */
export const projectRecommendationStatusSchema = z.enum(PROJECT_RECOMMENDATION_STATUSES);

/** Validates severity enum. */
export const projectRecommendationSeveritySchema = z.enum(PROJECT_RECOMMENDATION_SEVERITIES);

/** Validates signal type enum. */
export const projectSignalTypeSchema = z.enum(PROJECT_SIGNAL_TYPES);

/** Validates related entity type enum. */
export const relatedEntityTypeSchema = z.enum(RELATED_ENTITY_TYPES);

// ---------------------------------------------------------------------------
// Structure Schemas
// ---------------------------------------------------------------------------

/** Validates related entity reference object. */
export const relatedEntityRefSchema = z.object({
  type: relatedEntityTypeSchema,
  id: z.string({ error: "Entity ID is required." }).min(1, "Entity ID cannot be empty."),
  label: z.string({ error: "Entity label is required." }).min(1, "Entity label cannot be empty."),
});

/** Validates fingerprint string — trimmed SHA-256 hexadecimal output (64 hex characters). */
export const fingerprintSchema = z
  .string({ error: "Fingerprint is required." })
  .trim()
  .length(FINGERPRINT_HEX_LENGTH, `Fingerprint must be exactly ${FINGERPRINT_HEX_LENGTH} hex characters.`)
  .regex(/^[0-9a-fA-F]{64}$/, "Fingerprint must be a valid SHA-256 hexadecimal string.");

/** Validates recommendation title string. */
export const recommendationTitleSchema = z
  .string({ error: "Title is required." })
  .trim()
  .min(1, "Title cannot be empty.")
  .max(
    MAX_RECOMMENDATION_TITLE_LENGTH,
    `Title cannot exceed ${MAX_RECOMMENDATION_TITLE_LENGTH} characters.`,
  );

/** Validates recommendation explanation string. */
export const recommendationExplanationSchema = z
  .string()
  .trim()
  .max(
    MAX_RECOMMENDATION_EXPLANATION_LENGTH,
    `Explanation cannot exceed ${MAX_RECOMMENDATION_EXPLANATION_LENGTH} characters.`,
  );

/** Validates suggested next step string. */
export const recommendationSuggestedNextStepSchema = z
  .string()
  .trim()
  .max(
    MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH,
    `Suggested next step cannot exceed ${MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH} characters.`,
  )
  .nullable()
  .optional();

// ---------------------------------------------------------------------------
// Domain Object Schema & DTO
// ---------------------------------------------------------------------------

/**
 * Safe DTO Schema representing user-facing ProjectRecommendation output.
 * Internal fields (`owner`, `claimToken`, `claimedAt`, `purgeAt`, `__v`) are excluded.
 */
export const projectRecommendationDtoSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: projectSignalTypeSchema,
  severity: projectRecommendationSeveritySchema,
  title: recommendationTitleSchema,
  explanation: recommendationExplanationSchema,
  suggestedNextStep: recommendationSuggestedNextStepSchema,
  facts: z.record(z.string(), z.unknown()),
  relatedEntities: z.array(relatedEntityRefSchema).max(MAX_RECOMMENDATION_RELATED_ENTITIES),
  fingerprint: fingerprintSchema,
  status: projectRecommendationStatusSchema,
  dismissedAt: z.coerce.date().nullable().optional(),
  actedOnAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  version: z.number().int().min(0),
});

export type ProjectRecommendationDto = z.infer<typeof projectRecommendationDtoSchema>;
