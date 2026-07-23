import { AIModelTier } from '../types/index.js';
import { AIConfigurationError } from '../errors/ai.errors.js';
import { aiConfig } from '../config/ai.config.js';
import {
  AIRoutingContext,
  AIRoutingDecision,
  AIRoutingReasonCode,
} from './types.js';

/**
 * Pure, deterministic routing engine for initial AI provider selection (Attempt 1).
 * Inspects provider configuration and capability tier to choose the initial execution target.
 */
export class AIRouter {
  /**
   * Selects the initial execution target provider for an AI request based on capability tier
   * and configured provider availability.
   *
   * @param context The routing context containing the requested AIModelTier.
   * @param configOverride Optional configuration snapshot for isolated testing. Defaults to system aiConfig.
   * @returns The deterministic AIRoutingDecision containing the selected provider name and routing metadata.
   * @throws AIConfigurationError if zero candidate providers have valid credentials or tier is invalid.
   */
  public static selectInitialProvider(
    context: AIRoutingContext,
    configOverride?: typeof aiConfig
  ): AIRoutingDecision {
    const config = configOverride ?? aiConfig;

    // 1. Validate Capability Tier Input
    if (!context || !Object.values(AIModelTier).includes(context.tier)) {
      throw new AIConfigurationError(
        `Unsupported or invalid AI model tier: '${context?.tier}'`
      );
    }

    // 2. Discover Configured Candidate Providers (Deterministic Array Order)
    const candidates: string[] = [];
    const hasAnthropicKey = Boolean(config.anthropic?.apiKey && config.anthropic.apiKey.trim().length > 0);
    if (hasAnthropicKey) {
      candidates.push('anthropic');
    }

    const hasGeminiKey = Boolean(config.gemini?.apiKey && config.gemini.apiKey.trim().length > 0);
    if (hasGeminiKey) {
      candidates.push('gemini');
    }

    // 3. Fail Fast if No Providers are Available
    if (candidates.length === 0) {
      throw new AIConfigurationError(
        'No configured AI providers available for routing. Please check API key environment variables.'
      );
    }

    // 4. Single Candidate Case
    if (candidates.length === 1) {
      return {
        selectedProvider: candidates[0]!,
        routingStrategy: 'SINGLE_CONFIGURED_PROVIDER',
        routingReasonCode: 'SINGLE_PROVIDER_AVAILABLE',
        candidateProviders: candidates,
      };
    }

    // 5. Policy Evaluation for Multiple Available Candidates
    let selectedProvider: string;
    let reasonCode: AIRoutingReasonCode;

    if (context.tier === AIModelTier.FAST_JSON) {
      // FAST_JSON Tier Policy: Prefer Gemini for fast, cost-optimized execution
      selectedProvider = candidates.includes('gemini') ? 'gemini' : candidates[0]!;
      reasonCode = 'FAST_TIER_OPTIMAL_TARGET';
    } else {
      // DEEP_CONTEXT Tier Policy: Prefer configured primary provider
      const primary = (config.provider || 'anthropic').toLowerCase().trim();
      selectedProvider = candidates.includes(primary) ? primary : candidates[0]!;
      reasonCode = 'DEEP_TIER_PRIMARY_TARGET';
    }

    return {
      selectedProvider,
      routingStrategy: 'STATIC_TIER_POLICY',
      routingReasonCode: reasonCode,
      candidateProviders: candidates,
    };
  }
}
