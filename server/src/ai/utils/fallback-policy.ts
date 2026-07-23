import { AITimeoutError, AIProviderError } from '../errors/ai.errors.js';

/**
 * Evaluates whether an error encountered during primary AI execution is fallback-eligible.
 * Enforces an EXPLICIT ALLOWLIST architecture:
 * Eligible reasons: NETWORK_ERROR, TIMEOUT_ERROR, RATE_LIMIT_ERROR, SERVER_ERROR, STRUCTURED_PARSE_ERROR.
 * All other reasons (SAFETY_REFUSAL, MAX_TOKENS_TRUNCATION, AUTHENTICATION_ERROR, AIValidationError, AIConfigurationError, unknown) return false.
 *
 * Note: AITimeoutError returns true at this classification boundary. Remaining latency budget allocation (>= 3000ms)
 * is evaluated at the orchestration layer (WP-02).
 */
export function isFallbackEligible(error: unknown): boolean {
  if (error instanceof AITimeoutError) {
    return true;
  }

  if (error instanceof AIProviderError) {
    switch (error.failureReason) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
      case 'RATE_LIMIT_ERROR':
      case 'SERVER_ERROR':
      case 'STRUCTURED_PARSE_ERROR':
        return true;
      case 'SAFETY_REFUSAL':
      case 'MAX_TOKENS_TRUNCATION':
      case 'AUTHENTICATION_ERROR':
      case 'UNKNOWN_ERROR':
      default:
        return false;
    }
  }

  return false;
}
