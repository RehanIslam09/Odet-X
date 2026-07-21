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
 */
export class AIProviderError extends AIBaseError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
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
