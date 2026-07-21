import { ZodSchema } from 'zod';
import { AIProvider } from './base.provider';
import { AIRequestOptions, AIModelTier } from '../types';
import { aiConfig } from '../config/ai.config';
import { AIConfigurationError, AIProviderError, AITimeoutError } from '../errors/ai.errors';

/**
 * Concrete implementation of the AIProvider for Anthropic.
 */
export class AnthropicProvider implements AIProvider {
  // In a real implementation, you would initialize the Anthropic SDK client here.
  // private client: Anthropic;
  //
  // constructor(apiKey: string) {
  //   if (!apiKey) throw new AIConfigurationError('Anthropic API key is missing.');
  //   this.client = new Anthropic({ apiKey });
  // }

  public async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<T> {
    const model = this.getModelForTier(options.tier);
    const timeout = options.timeoutMs || aiConfig.timeouts.standard;

    // Stubbed implementation for Phase 19.1
    // 1. Prepare messages array for Anthropic.
    // 2. Set max_tokens, temperature (usually 0 for structured).
    // 3. Make the API call wrapping in a timeout promise.
    // 4. Map Anthropic errors to our custom AIProviderError.
    // 5. Extract text from the response block and parse as JSON.
    // 6. Return the raw (unvalidated) JSON object. Validation happens in the generic validator.

    throw new Error('Anthropic SDK integration is out of scope for Phase 19.1');
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
