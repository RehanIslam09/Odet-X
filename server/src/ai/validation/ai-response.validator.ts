import { ZodSchema } from 'zod';
import { AIValidationError } from '../errors/ai.errors.js';

/**
 * Normalizes provider response objects before canonical Zod validation.
 * Specifically handles Gemini OpenAPI response_schema quirk where nested `arguments`
 * is serialized as a JSON string (optionally preceded by a leading colon e.g. ":{...}").
 *
 * Immutability: Returns a normalized shallow copy if modifications are performed;
 * returns original rawData reference if no normalization applies.
 */
export function normalizeAIResponsePayload(rawData: unknown): unknown {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return rawData;
  }

  const payload = rawData as Record<string, unknown>;

  if (!payload.proposedAction || typeof payload.proposedAction !== 'object' || Array.isArray(payload.proposedAction)) {
    return rawData;
  }

  const proposedAction = payload.proposedAction as Record<string, unknown>;

  if (typeof proposedAction.arguments === 'string') {
    let rawStr = proposedAction.arguments.trim();

    if (rawStr.startsWith(':')) {
      rawStr = rawStr.slice(1).trim();
    }

    try {
      const parsed = JSON.parse(rawStr);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          ...payload,
          proposedAction: {
            ...proposedAction,
            arguments: parsed,
          },
        };
      }
    } catch {
      // Leave arguments string as-is for canonical Zod validation rejection
    }
  }

  return rawData;
}

/**
 * Enforces Zod schema correctness on raw LLM output.
 *
 * @param rawData The raw JSON object parsed from the provider's response.
 * @param schema The Zod schema to validate against.
 * @returns The strongly-typed, validated object.
 * @throws AIValidationError if the rawData does not match the schema.
 */
export function validateAIResponse<T>(rawData: unknown, schema: ZodSchema<T>): T {
  const normalizedData = normalizeAIResponsePayload(rawData);
  const result = schema.safeParse(normalizedData);

  if (!result.success) {
    const issuesDetail = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
    }));

    const rawProposedAction =
      normalizedData && typeof normalizedData === 'object' && 'proposedAction' in normalizedData
        ? (normalizedData as { proposedAction?: unknown }).proposedAction
        : null;

    // Development & Test diagnostic logging for observable validation debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        '[AI VALIDATION FAILURE DETAIL]\n' +
          JSON.stringify(
            {
              issues: issuesDetail,
              proposedAction: rawProposedAction,
            },
            null,
            2
          )
      );
    }

    throw new AIValidationError(
      'The AI provider returned data that did not match the required schema.',
      {
        issues: issuesDetail,
        formatted: result.error.format(),
      }
    );
  }

  return result.data;
}
