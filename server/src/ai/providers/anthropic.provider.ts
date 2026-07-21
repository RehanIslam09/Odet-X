import { ZodSchema } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from './base.provider';
import { AIRequestOptions, AIModelTier } from '../types';
import { aiConfig } from '../config/ai.config';
import { 
  AIBaseError, 
  AIConfigurationError, 
  AIProviderError, 
  AITimeoutError 
} from '../errors/ai.errors';

/**
 * Concrete implementation of the AIProvider for Anthropic.
 */
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    const apiKey = aiConfig.anthropic.apiKey;
    if (!apiKey) {
      throw new AIConfigurationError('Anthropic API key is missing. Please set ANTHROPIC_API_KEY in your environment variables.');
    }
    
    this.client = new Anthropic({
      apiKey,
    });
  }

  public async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<T> {
    const model = this.getModelForTier(options.tier);
    const timeoutMs = options.timeoutMs || aiConfig.timeouts.standard;
    const startTime = Date.now();

    try {
      // Append a specific instruction to ensure the model outputs valid JSON.
      const jsonPrompt = `${prompt}\n\nPlease output your response as valid JSON matching the requested structure. Output ONLY JSON, with no other text, markdown formatting, or explanations.`;

      const response = await this.client.messages.create(
        {
          model,
          max_tokens: 4096,
          temperature: 0, // Deterministic output for structured data
          messages: [
            {
              role: 'user',
              content: jsonPrompt,
            },
          ],
        },
        { timeout: timeoutMs }
      );

      const contentBlock = response.content[0];
      if (contentBlock.type !== 'text') {
        throw new AIProviderError(`Unexpected content type received from Anthropic: ${contentBlock.type}`);
      }

      let rawText = contentBlock.text.trim();
      
      // Attempt to clean up markdown code block wrapping if the LLM ignored our "no formatting" instruction
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (err) {
        throw new AIProviderError(`Failed to parse LLM output as JSON. Raw output: ${rawText.substring(0, 100)}...`, err);
      }
      
      // Note: We return raw parsed JSON. Validation happens centrally in the ai-response.validator.ts 
      // as orchestrated by the AIService.
      return parsedJson as T;
    } catch (error: any) {
      this.mapAndThrowError(error);
    }
    
    throw new Error('Unreachable');
  }

  /**
   * Maps Anthropic SDK errors into our custom error hierarchy.
   */
  private mapAndThrowError(error: any): never {
    if (error instanceof AIBaseError) {
      throw error; // Already mapped
    }

    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      throw new AITimeoutError(`Anthropic API timed out after configured limit.`);
    }

    if (error instanceof Anthropic.AuthenticationError) {
      throw new AIConfigurationError('Anthropic authentication failed. Check your API key.');
    }

    if (error instanceof Anthropic.RateLimitError) {
      throw new AIProviderError('Anthropic rate limit exceeded.', error);
    }

    if (error instanceof Anthropic.APIError) {
      throw new AIProviderError(`Anthropic API error: ${error.message}`, error);
    }

    throw new AIProviderError(`Unexpected error during AI generation: ${error.message || 'Unknown'}`, error);
  }

  /**
   * Maps an internal AIModelTier to the concrete Anthropic model string.
   */
  private getModelForTier(tier: AIModelTier): string {
    switch (tier) {
      case AIModelTier.FAST_JSON:
        return aiConfig.models.fastJson;
      case AIModelTier.DEEP_CONTEXT:
        return aiConfig.models.deepContext;
      default:
        throw new AIConfigurationError(`Unsupported model tier: ${tier}`);
    }
  }
}
