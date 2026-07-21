import { ZodSchema } from 'zod';
import { AIRequestOptions } from '../types';

/**
 * The core contract that any AI provider must fulfill.
 * This keeps the AI service agnostic of specific SDKs (like Anthropic or OpenAI).
 */
export interface AIProvider {
  /**
   * Generates structured data validated against the provided Zod schema.
   *
   * @param prompt The complete constructed prompt (system + context + intent).
   * @param schema The Zod schema to enforce on the provider's output.
   * @param options Additional options such as model tier and timeouts.
   * @returns A promise that resolves to the valid structured data, or rejects with an AIError.
   */
  generateStructured<T>(prompt: string, schema: ZodSchema<T>, options: AIRequestOptions): Promise<T>;
}
