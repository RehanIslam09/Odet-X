import { ZodSchema } from 'zod';
import { AIProvider } from './providers/base.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { AIRequestOptions } from './types';
import { buildPrompt } from './prompts/prompt.builder';
import { validateAIResponse } from './validation/ai-response.validator';
import { AIBaseError } from './errors/ai.errors';

/**
 * The central orchestration layer for all AI features.
 * Application services should interact exclusively with this service.
 */
export class AIService {
  private provider: AIProvider;

  constructor() {
    // For Phase 19.1, we directly instantiate the single provider we have.
    // In future phases, this could be injected via a factory or DI container.
    this.provider = new AnthropicProvider();
  }

  /**
   * Generates and validates structured data from the AI provider.
   *
   * @param systemInstructions The immutable system rules for this feature.
   * @param schema The Zod schema representing the expected output shape.
   * @param options The context, intent, and tier for the request.
   * @returns The validated data matching the provided Zod schema.
   * @throws AIBaseError or its subclasses (e.g., AIProviderError, AIValidationError) on failure.
   */
  public async generateStructuredData<T>(
    systemInstructions: string,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<T> {
    try {
      // 1. Build the prompt
      const fullPrompt = buildPrompt(systemInstructions, options.context, options.intent);

      // 2. Delegate to the provider interface
      const rawResponse = await this.provider.generateStructured(fullPrompt, schema, options);

      // 3. Validate the response
      const validatedData = validateAIResponse(rawResponse, schema);

      // 4. Return result
      return validatedData;
    } catch (error) {
      // Re-throw custom AI errors directly, allowing the application to handle them.
      if (error instanceof AIBaseError) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new Error(`Unexpected failure in AIService: ${(error as Error).message}`);
    }
  }
}

// Export a singleton instance for easy consumption by controllers/services
export const aiService = new AIService();
