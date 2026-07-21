/**
 * Centralized configuration for the AI module.
 * Future configurations (like environment variable mapping) should happen here.
 */

export const aiConfig = {
  /**
   * The primary provider to use for AI requests.
   */
  provider: 'anthropic',

  /**
   * Model identifiers grouped by capability tiers.
   */
  models: {
    /**
     * Tier for deterministic, structured JSON output with small context.
     * E.g., Auto-labeling, quick classification.
     */
    fastJson: 'claude-3-haiku-20240307',
    
    /**
     * Tier for generative, large-context, reasoning-heavy output.
     * E.g., Project deconstruction, note summarization.
     */
    deepContext: 'claude-3-sonnet-20240229',
  },

  /**
   * Timeouts for provider requests.
   */
  timeouts: {
    // 30 seconds for standard requests
    standard: 30000,
  }
};
