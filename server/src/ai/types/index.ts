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

/**
 * Token usage counts reported by the underlying AI provider.
 */
export interface AIProviderUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Metadata captured directly from the provider execution layer.
 */
export interface AIProviderMetadata {
  model: string;
  usage?: AIProviderUsage;
}

/**
 * Enhanced response object returned by concrete AIProvider implementations.
 */
export interface AIProviderResponse<T> {
  data: T;
  metadata: AIProviderMetadata;
}

/**
 * High-level normalized error categories for observability.
 */
export type AIErrorCategory =
  | 'PROVIDER_ERROR'
  | 'VALIDATION_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Standardized telemetry event emitted for every AI capability request.
 */
export interface AITelemetryEvent {
  executionId: string;
  timestamp: string;
  provider: string;
  tier: AIModelTier;
  model: string;
  promptName: string;
  promptVersion: string;
  durationMs: number;
  success: boolean;
  attempt?: number;
  isFallback?: boolean;
  fallbackFromProvider?: string;
  primaryErrorCategory?: AIErrorCategory;
  usage?: AIProviderUsage;
  errorType?: string;
  errorCategory?: AIErrorCategory;
  errorMessage?: string;
}

/**
 * Listener interface for telemetry events (used for test assertions and future sinks).
 */
export type AITelemetryListener = (event: AITelemetryEvent) => void;
