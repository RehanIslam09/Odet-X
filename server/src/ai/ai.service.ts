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
  AIFallbackExecutionError,
} from './errors/ai.errors.js';
import { isFallbackEligible } from './utils/fallback-policy.js';
import { aiLogger } from './utils/logger.js';
import { aiConfig } from './config/ai.config.js';
import { AIRouter } from './routing/index.js';

import { AIRoutingStrategy, AIRoutingReasonCode, AIRoutingDecision } from './routing/types.js';

interface AIAttemptContext {
  attempt: number;
  isFallback: boolean;
  fallbackFromProvider?: string;
  primaryErrorCategory?: AIErrorCategory;
  routingStrategy?: AIRoutingStrategy;
  routingReasonCode?: AIRoutingReasonCode;
  candidateProviders?: string[];
}

/**
 * The central orchestration layer for all AI features.
 * Application services should interact exclusively with this service.
 */
export class AIService {
  private customProvider?: AIProvider;
  private customFallbackProvider?: AIProvider;

  /**
   * Constructs AIService.
   * @param provider Optional custom primary AIProvider instance (primarily for test/custom injection seam).
   * @param fallbackProvider Optional custom alternate AIProvider instance (primarily for test/custom injection seam).
   */
  constructor(provider?: AIProvider, fallbackProvider?: AIProvider) {
    if (provider) {
      this.customProvider = provider;
    }
    if (fallbackProvider) {
      this.customFallbackProvider = fallbackProvider;
    }
  }

  /**
   * Executes a single provider attempt (Primary or Alternate), performing prompt construction,
   * provider invocation, schema validation, timing, and telemetry logging.
   */
  private async executeSingleAttempt<T>(
    provider: AIProvider,
    template: PromptTemplate,
    schema: ZodSchema<T>,
    options: AIRequestOptions,
    executionId: string,
    attemptContext: AIAttemptContext
  ): Promise<AIExecutionResult<T>> {
    const attemptStartedAtMs = Date.now();
    const attemptStartedMonotonic = performance.now();

    let model = 'unknown';
    try {
      model = provider.getModelForTier(options.tier);
    } catch {
      // Defer throwing so we can capture failure telemetry if config/tier resolution fails
    }

    let providerResponse: AIProviderResponse<unknown> | undefined;

    try {
      if (!provider) {
        throw new AIConfigurationError('AI provider is not configured.');
      }

      if (model === 'unknown') {
        model = provider.getModelForTier(options.tier);
      }

      // 1. Prompt Validation
      validatePromptTemplate(template);

      // 2. Prompt Construction
      const fullPrompt = buildPrompt(template);

      // 3. Provider Execution
      providerResponse = await provider.generateStructured(fullPrompt, schema, options);
      if (
        providerResponse === undefined ||
        providerResponse === null ||
        providerResponse.data === undefined ||
        providerResponse.data === null
      ) {
        throw new AIConfigurationError('Provider returned an empty response.');
      }

      // 4. Response Validation
      const validatedData = validateAIResponse(providerResponse.data, schema);

      const durationMs = Math.round(performance.now() - attemptStartedMonotonic);
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
        timestamp: new Date(attemptStartedAtMs).toISOString(),
        provider: provider.providerName,
        tier: options.tier,
        model: concreteModel,
        promptName: template.metadata.name,
        promptVersion: template.metadata.version,
        durationMs,
        success: true,
        attempt: attemptContext.attempt,
        isFallback: attemptContext.isFallback,
        ...(attemptContext.fallbackFromProvider && { fallbackFromProvider: attemptContext.fallbackFromProvider }),
        ...(attemptContext.primaryErrorCategory && { primaryErrorCategory: attemptContext.primaryErrorCategory }),
        ...(attemptContext.routingStrategy && { routingStrategy: attemptContext.routingStrategy }),
        ...(attemptContext.routingReasonCode && { routingReasonCode: attemptContext.routingReasonCode }),
        ...(attemptContext.candidateProviders && { candidateProviders: attemptContext.candidateProviders }),
        ...(providerResponse.metadata.usage && { usage: providerResponse.metadata.usage }),
      });

      // 7. Return Result
      return {
        data: validatedData,
        metadata,
      };
    } catch (error: any) {
      const durationMs = Math.round(performance.now() - attemptStartedMonotonic);

      const promptName = template?.metadata?.name || 'unknown';
      const promptVersion = template?.metadata?.version || 'unknown';
      const providerName = provider.providerName;

      const usage = providerResponse?.metadata?.usage;

      const errorCategory = this.mapErrorToCategory(error);
      const errorMessage = this.getSanitizedErrorMessage(errorCategory);
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';

      // Telemetry Logging (Failure Path)
      aiLogger.logExecution({
        executionId,
        timestamp: new Date(attemptStartedAtMs).toISOString(),
        provider: providerName,
        tier: options.tier,
        model,
        promptName,
        promptVersion,
        durationMs,
        success: false,
        attempt: attemptContext.attempt,
        isFallback: attemptContext.isFallback,
        ...(attemptContext.fallbackFromProvider && { fallbackFromProvider: attemptContext.fallbackFromProvider }),
        ...(attemptContext.primaryErrorCategory && { primaryErrorCategory: attemptContext.primaryErrorCategory }),
        ...(attemptContext.routingStrategy && { routingStrategy: attemptContext.routingStrategy }),
        ...(attemptContext.routingReasonCode && { routingReasonCode: attemptContext.routingReasonCode }),
        ...(attemptContext.candidateProviders && { candidateProviders: attemptContext.candidateProviders }),
        ...(usage && { usage }),
        errorType,
        errorCategory,
        errorMessage,
      });

      // Re-throw error so caller / AIService orchestration can inspect it
      if (error instanceof AIBaseError) {
        throw error;
      }

      throw new Error(`Unexpected failure in AIService: ${(error as Error).message}`, { cause: error });
    }
  }

  /**
   * Generates and validates structured data from the AI provider, executing a single
   * alternate provider fallback attempt if the primary provider fails in a fallback-eligible manner.
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
    const requestStartMonotonic = performance.now();
    const totalTimeoutMs = options.timeoutMs || aiConfig.timeouts.standard;

    let primaryProvider: AIProvider;
    let routingDecision: AIRoutingDecision | undefined;

    if (this.customProvider) {
      primaryProvider = this.customProvider;
    } else {
      routingDecision = AIRouter.selectInitialProvider({ tier: options.tier });
      primaryProvider = AIProviderFactory.getProvider(routingDecision.selectedProvider);
    }

    const primaryProviderName = primaryProvider.providerName;

    // Attempt 1: Primary Provider Execution
    try {
      return await this.executeSingleAttempt(
        primaryProvider,
        template,
        schema,
        { ...options, timeoutMs: totalTimeoutMs },
        executionId,
        {
          attempt: 1,
          isFallback: false,
          ...(routingDecision && {
            routingStrategy: routingDecision.routingStrategy,
            routingReasonCode: routingDecision.routingReasonCode,
            candidateProviders: routingDecision.candidateProviders,
          }),
        }
      );
    } catch (primaryError: any) {
      // 1. Evaluate Fallback Eligibility
      const eligible = isFallbackEligible(primaryError);

      // 2. Canonical Alternate Provider Identity
      const alternateProviderName =
        this.customFallbackProvider?.providerName ??
        AIProviderFactory.resolveAlternateProviderName(primaryProviderName);

      // 3. Monotonic Latency Budget Calculation
      const elapsedMs = Math.round(performance.now() - requestStartMonotonic);
      const remainingTimeoutMs = Math.max(0, totalTimeoutMs - elapsedMs);

      if (!eligible || !alternateProviderName || remainingTimeoutMs < 3000) {
        // Fallback is NOT authorized -> Re-throw original primary error directly without re-wrapping
        throw primaryError;
      }

      // 4. Lazy Alternate Provider Resolution (Attempt 2)
      let alternateProvider: AIProvider;
      try {
        alternateProvider =
          this.customFallbackProvider ||
          AIProviderFactory.getProvider(alternateProviderName);
      } catch (constructionError: any) {
        // Alternate provider construction failed (e.g. missing API key AIConfigurationError)
        const normPrimary = this.normalizeToAIBaseError(primaryError, primaryProviderName);
        const normFallback = this.normalizeToAIBaseError(constructionError, alternateProviderName);

        throw new AIFallbackExecutionError(
          `AI request failed on both primary provider (${primaryProviderName}) and fallback provider (${alternateProviderName}).`,
          normPrimary,
          normFallback,
          primaryProviderName,
          alternateProviderName
        );
      }

      const primaryErrorCategory = this.mapErrorToCategory(primaryError);

      try {
        return await this.executeSingleAttempt(
          alternateProvider,
          template,
          schema,
          { ...options, timeoutMs: remainingTimeoutMs },
          executionId,
          {
            attempt: 2,
            isFallback: true,
            fallbackFromProvider: primaryProviderName,
            primaryErrorCategory,
          }
        );
      } catch (fallbackError: any) {
        // Double Failure: Both Primary and Fallback attempts failed
        const normPrimary = this.normalizeToAIBaseError(primaryError, primaryProviderName);
        const normFallback = this.normalizeToAIBaseError(fallbackError, alternateProvider.providerName);

        throw new AIFallbackExecutionError(
          `AI request failed on both primary provider (${primaryProviderName}) and fallback provider (${alternateProvider.providerName}).`,
          normPrimary,
          normFallback,
          primaryProviderName,
          alternateProvider.providerName
        );
      }
    }
  }

  /**
   * Helper to normalize unknown errors to AIBaseError subclasses for AIFallbackExecutionError context.
   */
  private normalizeToAIBaseError(error: unknown, _providerName: string): AIBaseError {
    if (error instanceof AIBaseError) {
      return error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new AIProviderError(`Provider execution failed: ${message}`, error, 'UNKNOWN_ERROR');
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
