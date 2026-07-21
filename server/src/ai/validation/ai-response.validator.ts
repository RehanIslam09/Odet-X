import { ZodSchema } from 'zod';
import { AIValidationError } from '../errors/ai.errors';

/**
 * Enforces Zod schema correctness on raw LLM output.
 *
 * @param rawData The raw JSON object parsed from the provider's response.
 * @param schema The Zod schema to validate against.
 * @returns The strongly-typed, validated object.
 * @throws AIValidationError if the rawData does not match the schema.
 */
export function validateAIResponse<T>(rawData: unknown, schema: ZodSchema<T>): T {
  const result = schema.safeParse(rawData);

  if (!result.success) {
    throw new AIValidationError(
      'The AI provider returned data that did not match the required schema.',
      result.error.format()
    );
  }

  return result.data;
}
