import crypto from 'crypto';
import { ZodSchema } from 'zod';
import { AIProvider } from './providers/base.provider.js';
import { AIProviderFactory } from './providers/provider.factory.js';
import {
  AIRequestOptions,
  AIExecutionResult,
  AIExecutionMetadata,
  AIProviderResponse,
  AIErrorCategory,
} from './types/index.js';
import { buildPrompt } from './prompts/builder/prompt.builder.js';
import { validatePromptTemplate } from './prompts/validation/prompt.validator.js';
import { PromptTemplate } from './prompts/types.js';
import { validateAIResponse } from './validation/ai-response.validator.js';
import {
  AIBaseError,
  AIConfigurationError,
  AIProviderError,
  AITimeoutError,
  AIValidationError,
} from './errors/ai.errors.js';
import { aiLogger } from './utils/logger.js';
import { aiConfig } from './config/ai.config.js';

/**
 * The central orchestration layer for all AI features.
 * Application services should interact exclusively with this service.
 */
export class AIService {
  private customProvider?: AIProvider;

  constructor(provider?: AIProvider) {
    if (provider) {
      this.customProvider = provider;
    }
  }

  private get provider(): AIProvider {
    if (this.customProvider) {
      return this.customProvider;
    }
    return AIProviderFactory.getProvider();
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
    const provider = this.provider;

    let model = 'unknown';
    try {
      model = provider.getModelForTier(options.tier);
    } catch {
      // Defer throwing so we can capture failure telemetry if config/tier resolution fails
    }

    let providerResponse: AIProviderResponse<unknown> | undefined;

    try {
      if (!aiConfig.provider) {
        throw new AIConfigurationError('AI provider is not configured.');
      }

      // Re-evaluate model if initially unknown
      if (model === 'unknown') {
        model = provider.getModelForTier(options.tier);
      }

      // 1. Prompt Validation
      validatePromptTemplate(template);

      // 2. Prompt Construction
      const fullPrompt = buildPrompt(template);

      // 3. Provider Execution
      providerResponse = await provider.generateStructured(fullPrompt, schema, options);
      if (providerResponse === undefined || providerResponse === null || providerResponse.data === undefined || providerResponse.data === null) {
        throw new AIConfigurationError('Provider returned an empty response.');
      }

      // 4. Response Validation
      const validatedData = validateAIResponse(providerResponse.data, schema);

      const durationMs = Date.now() - startTime;
      const concreteModel = providerResponse.metadata.model || model;

      // 5. Execution Metadata
      const metadata: AIExecutionMetadata = {
        executionId,
        provider: provider.providerName,
        model: concreteModel,
        durationMs,
        promptName: template.metadata.name,
        promptVersion: template.metadata.version,
      };

      // 6. Telemetry Logging (Success Path)
      aiLogger.logExecution({
        executionId,
        timestamp: new Date(startTime).toISOString(),
        provider: provider.providerName,
        tier: options.tier,
        model: concreteModel,
        promptName: template.metadata.name,
        promptVersion: template.metadata.version,
        durationMs,
        success: true,
        ...(providerResponse.metadata.usage && { usage: providerResponse.metadata.usage }),
      });

      // 7. Return Result
      return {
        data: validatedData,
        metadata,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      const promptName = template?.metadata?.name || 'unknown';
      const promptVersion = template?.metadata?.version || 'unknown';
      const providerName = provider.providerName;

      // Retain provider-reported usage if response envelope was received prior to failure (e.g. Zod validation failure)
      const usage = providerResponse?.metadata?.usage;

      const errorCategory = this.mapErrorToCategory(error);
      const errorMessage = this.getSanitizedErrorMessage(errorCategory);
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';

      // Telemetry Logging (Failure Path)
      aiLogger.logExecution({
        executionId,
        timestamp: new Date(startTime).toISOString(),
        provider: providerName,
        tier: options.tier,
        model,
        promptName,
        promptVersion,
        durationMs,
        success: false,
        ...(usage && { usage }),
        errorType,
        errorCategory,
        errorMessage,
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
   * Maps normalized application AI errors to standardized telemetry error categories.
   */
  private mapErrorToCategory(error: unknown): AIErrorCategory {
    if (error instanceof AITimeoutError) {
      return 'TIMEOUT_ERROR';
    }
    if (error instanceof AIValidationError) {
      return 'VALIDATION_ERROR';
    }
    if (error instanceof AIConfigurationError) {
      return 'CONFIGURATION_ERROR';
    }
    if (error instanceof AIProviderError) {
      return 'PROVIDER_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Returns a safe, static error description guaranteed not to leak prompts, raw AI outputs, or sensitive PII.
   */
  private getSanitizedErrorMessage(category: AIErrorCategory): string {
    switch (category) {
      case 'TIMEOUT_ERROR':
        return 'AI request timed out';
      case 'VALIDATION_ERROR':
        return 'AI response failed validation';
      case 'CONFIGURATION_ERROR':
        return 'AI provider configuration error';
      case 'PROVIDER_ERROR':
        return 'AI provider execution error';
      case 'UNKNOWN_ERROR':
      default:
        return 'Unknown AI execution error';
    }
  }
}

// Export a singleton instance for easy consumption by controllers/services
export const aiService = new AIService();
