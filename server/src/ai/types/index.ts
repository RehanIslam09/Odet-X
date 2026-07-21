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
 * Options required to formulate a request to the AI service.
 */
export interface AIRequestOptions {
  /**
   * The capability tier required for this request.
   */
  tier: AIModelTier;
  
  /**
   * Contextual data to inject into the prompt (e.g., Project Description, Task Notes).
   */
  context: string;
  
  /**
   * The specific instruction or user query for the model.
   */
  intent: string;

  /**
   * Optional custom timeout in milliseconds.
   */
  timeoutMs?: number;
}
