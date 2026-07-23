import { ZodSchema } from 'zod';
import { GoogleGenAI, GenerateContentConfig, GenerateContentResponse } from '@google/genai';
import { AIProvider } from './base.provider.js';
import { AIModelTier, AIRequestOptions } from '../types/index.js';
import { aiConfig } from '../config/ai.config.js';
import { AIConfigurationError, AIProviderError, AITimeoutError } from '../errors/ai.errors.js';
import { getGeminiResponseSchema } from './gemini-schema.adapter.js';

/**
 * Concrete implementation of the AIProvider for Google Gemini.
 */
export class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenAI;

  constructor() {
    const apiKey = aiConfig.gemini.apiKey;
    if (!apiKey) {
      throw new AIConfigurationError(
        'Gemini API key is missing. Please set GEMINI_API_KEY in your environment variables.'
      );
    }

    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Resolves the configured model identifier for a given AI capability tier.
   */
  private getModelForTier(tier?: AIModelTier): string {
    const requestedTier = tier || AIModelTier.FAST_JSON;
    switch (requestedTier) {
      case AIModelTier.DEEP_CONTEXT:
        return aiConfig.gemini.models.deepContext;
      case AIModelTier.FAST_JSON:
      default:
        return aiConfig.gemini.models.fastJson;
    }
  }

  /**
   * Cleans defensive markdown code fences from AI text outputs.
   */
  private cleanMarkdownFences(text: string): string {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/i, '');
    }
    return cleaned.trim();
  }

  /**
   * Processes and hardens a Gemini GenerateContentResponse object.
   * Enforces prompt feedback checks, candidate existence, finishReason semantics,
   * MAX_TOKENS truncation policies, and defensive text extraction prior to JSON parsing.
   */
  private processResponse<T>(response: GenerateContentResponse): T {
    // 1. Prompt Block Inspection
    if (response.promptFeedback?.blockReason) {
      throw new AIProviderError(
        `Gemini prompt was blocked with reason: ${response.promptFeedback.blockReason}`
      );
    }

    // 2. Candidate Existence Check
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new AIProviderError('Gemini API returned no response candidates.');
    }

    // 3. FinishReason Policy: MAX_TOKENS Truncation Check
    if (candidate.finishReason === 'MAX_TOKENS') {
      throw new AIProviderError('Gemini output truncated due to max_tokens limit');
    }

    // 4. FinishReason Policy: ONLY 'STOP' proceeds to JSON parsing
    if (candidate.finishReason !== 'STOP') {
      throw new AIProviderError(
        `Gemini candidate generation terminated with finishReason: ${candidate.finishReason || 'UNKNOWN'}`
      );
    }

    // 5. Explicit Candidate Part Text Extraction
    const textParts = candidate.content?.parts
      ?.map((part) => part.text)
      .filter((text): text is string => typeof text === 'string' && text.length > 0);

    const rawText = textParts && textParts.length > 0 ? textParts.join('') : (response.text || '');
    const cleanedText = this.cleanMarkdownFences(rawText);

    if (!cleanedText) {
      throw new AIProviderError('Gemini API returned an empty text response.');
    }

    // 6. JSON Parsing & Normalization
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError: any) {
      throw new AIProviderError(
        `Failed to parse JSON response from Gemini API: ${parseError?.message || 'Syntax error'}`
      );
    }

    return parsedData as T;
  }

  /**
   * Maps SDK, HTTP, network, and provider errors into standard application AIBaseError subclasses.
   */
  private mapAndThrowError(error: any): never {
    // Preserve already-normalized application AI errors
    if (
      error instanceof AIProviderError ||
      error instanceof AITimeoutError ||
      error instanceof AIConfigurationError
    ) {
      throw error;
    }

    const status = error?.status || error?.statusCode;

    if (status === 401 || status === 403) {
      throw new AIConfigurationError(
        `Gemini API authentication/authorization failed (status ${status}). Please check GEMINI_API_KEY.`
      );
    }

    if (status === 429) {
      throw new AIProviderError('Gemini API rate limit or quota exceeded (status 429).', error);
    }

    if (status === 500 || status === 503 || status === 504) {
      throw new AIProviderError(`Gemini API service error (status ${status}).`, error);
    }

    if (status === 400) {
      throw new AIProviderError(`Gemini API request validation error (status 400).`, error);
    }

    throw new AIProviderError(
      `Gemini provider execution failed: ${error?.message || 'Unknown error'}`,
      error
    );
  }

  /**
   * Generates structured data using Google Gemini generateContent API, hardens execution safety,
   * enforces timeout bounds via AbortController, and delegates schema validation to AIService.
   */
  public async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<T> {
    const model = this.getModelForTier(options.tier);
    const jsonSchema = getGeminiResponseSchema(schema);
    const timeoutMs = options.timeoutMs || aiConfig.timeouts.standard;

    const controller = new AbortController();
    let timedOut = false;

    const timerId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const config: GenerateContentConfig = {
        responseMimeType: 'application/json',
        responseSchema: jsonSchema,
        abortSignal: controller.signal,
      };

      const response = await this.client.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      // Authoritative internal timeout check post-await
      if (timedOut) {
        throw new AITimeoutError(`Gemini API request timed out after ${timeoutMs}ms`);
      }

      return this.processResponse<T>(response);
    } catch (error: any) {
      // Authoritative internal timeout invariant: timedOut === true is the sole provider timeout signal
      if (timedOut) {
        throw new AITimeoutError(`Gemini API request timed out after ${timeoutMs}ms`);
      }

      // Handle caller/external abort if signal was aborted externally without provider timeout
      if (controller.signal.aborted || error?.name === 'AbortError') {
        throw new AIProviderError('Gemini API request was aborted by caller', error);
      }

      this.mapAndThrowError(error);
    } finally {
      clearTimeout(timerId); // Mandatory cleanup: prevents event loop handles from leaking
    }

    throw new Error('Unreachable');
  }
}
