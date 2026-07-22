import { AIProvider } from './base.provider.js';
import { AnthropicProvider } from './anthropic.provider.js';
import { GeminiProvider } from './gemini.provider.js';
import { aiConfig } from '../config/ai.config.js';
import { AIConfigurationError } from '../errors/ai.errors.js';

/**
 * Factory for creating and caching AI provider instances lazily.
 */
export class AIProviderFactory {
  private static cache: Map<string, AIProvider> = new Map();

  /**
   * Resolves and returns an AI provider instance based on the requested or configured provider name.
   * Provider instances are constructed lazily on first access and cached process-wide.
   *
   * @param name Optional provider name override. Defaults to aiConfig.provider if omitted.
   * @returns The resolved AIProvider instance.
   * @throws AIConfigurationError if the requested provider is unsupported or unregistered.
   */
  public static getProvider(name?: string): AIProvider {
    const providerName = (name || aiConfig.provider).toLowerCase().trim();

    if (this.cache.has(providerName)) {
      return this.cache.get(providerName)!;
    }

    let provider: AIProvider;
    switch (providerName) {
      case 'anthropic':
        provider = new AnthropicProvider();
        break;
      case 'gemini':
        provider = new GeminiProvider();
        break;
      default:
        throw new AIConfigurationError(
          `Unsupported or unregistered AI provider: '${providerName}'. Supported providers are 'anthropic', 'gemini'.`
        );
    }

    this.cache.set(providerName, provider);
    return provider;
  }

  /**
   * Resets the internal provider instance cache.
   * Used for lifecycle management and test isolation.
   */
  public static clearCache(): void {
    this.cache.clear();
  }
}
