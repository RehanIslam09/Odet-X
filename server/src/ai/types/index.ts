/**
 * Identifies the tier of model required for the request.
 */
export enum AIModelTier {
  /**
   * Fast, cheap, and suited for small-context structured JSON tasks (e.g., auto-labeling).
   */
  FAST_JSON = 'FAST_JSON',

  /**
   * More capable, expensive, suited for reasoning and large context tasks.
   */
  DEEP_CONTEXT = 'DEEP_CONTEXT',
}

/**
 * Metadata associated with an AI execution, returned to the caller for observability.
 */
export interface AIExecutionMetadata {
  executionId: string;
  provider: string;
  model: string;
  durationMs: number;
  promptName: string;
  promptVersion: string;
}

/**
 * A wrapper for the validated data and its associated execution metadata.
 */
export interface AIExecutionResult<T> {
  data: T;
  metadata: AIExecutionMetadata;
}

/**
 * Options required to formulate a request to the AI service.
 */
export interface AIRequestOptions {
  /**
   * The capability tier required for this request.
   */
  tier: AIModelTier;

  /**
   * Optional custom timeout in milliseconds.
   */
  timeoutMs?: number;
}
