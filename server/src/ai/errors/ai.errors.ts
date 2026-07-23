/**
 * Strongly-typed failure reason taxonomy for AI provider execution failures.
 */
export type AIProviderFailureReason =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'SERVER_ERROR'
  | 'STRUCTURED_PARSE_ERROR'
  | 'SAFETY_REFUSAL'
  | 'MAX_TOKENS_TRUNCATION'
  | 'AUTHENTICATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Base error class for all AI module exceptions.
 */
export class AIBaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when the underlying AI provider fails (e.g., 500, rate limit).
 * Carries a failureReason property for deterministic fallback classification.
 */
export class AIProviderError extends AIBaseError {
  public readonly failureReason: AIProviderFailureReason;

  constructor(
    message: string,
    public readonly originalError?: unknown,
    failureReason: AIProviderFailureReason = 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.failureReason = failureReason;
  }
}

/**
 * Thrown when the LLM response fails schema validation (hallucinated structure).
 */
export class AIValidationError extends AIBaseError {
  constructor(message: string, public readonly validationErrors?: unknown) {
    super(message);
  }
}

/**
 * Thrown when there is an issue with the AI configuration (e.g., missing API key).
 */
export class AIConfigurationError extends AIBaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when an AI generation request exceeds the configured timeout.
 */
export class AITimeoutError extends AIBaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when both primary and fallback AI provider execution attempts fail.
 * Preserves the original primary error and fallback error for operational auditing.
 */
export class AIFallbackExecutionError extends AIBaseError {
  constructor(
    message: string,
    public readonly primaryError: AIBaseError,
    public readonly fallbackError: AIBaseError,
    public readonly primaryProvider: string,
    public readonly fallbackProvider: string
  ) {
    super(message);
  }
}
