import crypto from 'crypto';
import { ZodSchema } from 'zod';
import { AIProvider } from './providers/base.provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';
import { AIRequestOptions, AIExecutionResult, AIExecutionMetadata , AIModelTier } from './types/index.js';
import { buildPrompt } from './prompts/builder/prompt.builder.js';
import { validatePromptTemplate } from './prompts/validation/prompt.validator.js';
import { PromptTemplate } from './prompts/types.js';
import { validateAIResponse } from './validation/ai-response.validator.js';
import { AIBaseError, AIConfigurationError } from './errors/ai.errors.js';
import { aiLogger } from './utils/logger.js';
import { aiConfig } from './config/ai.config.js';

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
   * @returns The validated data and execution metadata.
   */
  public async generateStructuredData<T>(
    template: PromptTemplate,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<AIExecutionResult<T>> {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();
    
    // Resolve configuration model for logging purposes
    let model = 'unknown';
    try {
      model = this.resolveModelFromTier(options);
    } catch {
      // Defer throwing so we can log it properly
    }

    try {
      if (!aiConfig.provider) {
        throw new AIConfigurationError('AI provider is not configured.');
      }

      // 1. Prompt Validation
      validatePromptTemplate(template);

      // 2. Prompt Construction
      const fullPrompt = buildPrompt(template);

      // 3. Provider Execution
      const rawResponse = await this.provider.generateStructured(fullPrompt, schema, options);
      if (rawResponse === undefined || rawResponse === null) {
        throw new AIConfigurationError('Provider returned an empty response.');
      }

      // 4. Response Validation
      const validatedData = validateAIResponse(rawResponse, schema);

      const durationMs = Date.now() - startTime;

      // 5. Execution Metadata
      const metadata: AIExecutionMetadata = {
        executionId,
        provider: aiConfig.provider,
        model,
        durationMs,
        promptName: template.metadata.name,
        promptVersion: template.metadata.version,
      };

      // 6. Logging (Success)
      aiLogger.logExecution({
        executionId,
        provider: metadata.provider,
        model: metadata.model,
        promptName: metadata.promptName,
        promptVersion: metadata.promptVersion,
        executionTimeMs: durationMs,
        success: true,
      });

      // 7. Return Result
      return {
        data: validatedData,
        metadata,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      
      const promptName = template?.metadata?.name || 'unknown';
      const promptVersion = template?.metadata?.version || 'unknown';
      
      // 6. Logging (Failure)
      aiLogger.logExecution({
        executionId,
        provider: aiConfig.provider || 'unknown',
        model,
        promptName,
        promptVersion,
        executionTimeMs: durationMs,
        success: false,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // Re-throw custom AI errors directly, allowing the application to handle them.
      if (error instanceof AIBaseError) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new Error(`Unexpected failure in AIService: ${(error as Error).message}`, { cause: error });
    }
  }

  /**
   * Helper to resolve model name from tier for observability logging.
   */
  private resolveModelFromTier(options: AIRequestOptions): string {
    switch (options.tier) {
      case AIModelTier.FAST_JSON:
        return aiConfig.models.fastJson;
      case AIModelTier.DEEP_CONTEXT:
        return aiConfig.models.deepContext;
      default:
        throw new AIConfigurationError(`Unsupported model tier: ${options.tier}`);
    }
  }
}

// Export a singleton instance for easy consumption by controllers/services
export const aiService = new AIService();
