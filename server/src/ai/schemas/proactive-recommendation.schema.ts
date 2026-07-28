import { z } from "zod";
import {
  MAX_RECOMMENDATION_EXPLANATION_LENGTH,
  MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH,
  MAX_RECOMMENDATION_TITLE_LENGTH,
} from "@/constants/proactive-intelligence.js";

/**
 * Strict Zod schema for AI-generated proactive recommendation enrichment output.
 *
 * Rules & Invariants:
 * 1. AI is ONLY authorized to output presentation fields: title, explanation, suggestedNextStep.
 * 2. .strict() rejects any forbidden fields (severity, type, fingerprint, status, proposedAction, signingToken, nonce, etc.).
 * 3. Empty or whitespace-only titles/explanations are prohibited.
 */
export const ProactiveRecommendationEnrichmentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Recommendation title is required")
      .max(MAX_RECOMMENDATION_TITLE_LENGTH, `Title cannot exceed ${MAX_RECOMMENDATION_TITLE_LENGTH} characters`),

    explanation: z
      .string()
      .trim()
      .min(1, "Recommendation explanation is required")
      .max(
        MAX_RECOMMENDATION_EXPLANATION_LENGTH,
        `Explanation cannot exceed ${MAX_RECOMMENDATION_EXPLANATION_LENGTH} characters`,
      ),

    suggestedNextStep: z
      .string()
      .trim()
      .max(
        MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH,
        `Suggested next step cannot exceed ${MAX_RECOMMENDATION_SUGGESTED_NEXT_STEP_LENGTH} characters`,
      )
      .nullable()
      .optional()
      .transform((val) => (val && val.length > 0 ? val : null)),
  })
  .strict();

export type ProactiveRecommendationEnrichment = z.infer<typeof ProactiveRecommendationEnrichmentSchema>;
