import { AIModelTier } from '../types/index.js';

/**
 * Context required to make an initial AI provider routing decision.
 */
export interface AIRoutingContext {
  tier: AIModelTier;
}

/**
 * High-level strategy classification used for initial provider target selection.
 */
export type AIRoutingStrategy =
  | 'STATIC_TIER_POLICY'
  | 'SINGLE_CONFIGURED_PROVIDER'
  | 'INJECTED_PROVIDER_OVERRIDE';

/**
 * Bounded telemetry and operational reason codes explaining the routing outcome.
 */
export type AIRoutingReasonCode =
  | 'FAST_TIER_OPTIMAL_TARGET'
  | 'DEEP_TIER_PRIMARY_TARGET'
  | 'SINGLE_PROVIDER_AVAILABLE'
  | 'INJECTED_PROVIDER_OVERRIDE';

/**
 * Result wrapper returned by AIRouter for initial provider target selection.
 */
export interface AIRoutingDecision {
  selectedProvider: string;
  routingStrategy: AIRoutingStrategy;
  routingReasonCode: AIRoutingReasonCode;
  candidateProviders: string[];
}
