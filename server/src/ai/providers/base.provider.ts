import { ZodSchema } from 'zod';
import { AIRequestOptions, AIModelTier, AIProviderResponse } from '../types/index.js';

/**
 * The core contract that any AI provider must fulfill.
 * This keeps the AI service agnostic of specific SDKs (like Anthropic or Gemini).
 */
export interface AIProvider {
  /**
   * Unique name identifying the concrete provider (e.g. 'anthropic', 'gemini').
   */
  readonly providerName: string;

  /**
   * Resolves the concrete model identifier for a given capability tier.
   * Enables model resolution on success AND failure paths without inspecting config.
   */
  getModelForTier(tier: AIModelTier): string;

  /**
   * Generates structured data validated against the provided Zod schema,
   * returning parsed data along with provider-level metadata (model, usage).
   *
   * @param prompt The complete constructed prompt (system + context + intent).
   * @param schema The Zod schema to enforce on the provider's output.
   * @param options Additional options such as model tier and timeouts.
   * @returns A promise that resolves to the valid structured data and metadata wrapper.
   */
  generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<AIProviderResponse<T>>;
}
