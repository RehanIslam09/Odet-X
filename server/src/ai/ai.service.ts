import { ZodSchema } from 'zod';
import { AIProvider } from './providers/base.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { AIRequestOptions } from './types';
import { buildPrompt } from './prompts/builder/prompt.builder';
import { validatePromptTemplate } from './prompts/validation/prompt.validator';
import { PromptTemplate } from './prompts/types';
import { validateAIResponse } from './validation/ai-response.validator';
import { AIBaseError } from './errors/ai.errors';

/**
 * The central orchestration layer for all AI features.
 * Application services should interact exclusively with this service.
 */
export class AIService {
  private provider: AIProvider;

  constructor() {
    this.provider = new AnthropicProvider();
  }

  /**
   * Generates and validates structured data from the AI provider.
   *
   * @param template The structured prompt template containing all sections.
   * @param schema The Zod schema representing the expected output shape.
   * @param options The tier and timeout for the request.
   * @returns The validated data matching the provided Zod schema.
   */
  public async generateStructuredData<T>(
    template: PromptTemplate,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<T> {
    try {
      // 1. Validate the template dynamically provided by the caller
      validatePromptTemplate(template);

      // 2. Build the prompt
      const fullPrompt = buildPrompt(template);

      // 3. Delegate to the provider interface
      const rawResponse = await this.provider.generateStructured(fullPrompt, schema, options);

      // 4. Validate the response
      const validatedData = validateAIResponse(rawResponse, schema);

      // 5. Return result
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
