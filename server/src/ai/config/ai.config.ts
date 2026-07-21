import dotenv from 'dotenv';
dotenv.config();

/**
 * Centralized configuration for the AI module.
 */

export const aiConfig = {
  /**
   * The primary provider to use for AI requests.
   */
  provider: 'anthropic',

  /**
   * Provider specific configuration
   */
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },

  /**
   * Model identifiers grouped by capability tiers.
   */
  models: {
    fastJson: process.env.AI_DEFAULT_MODEL || 'claude-3-haiku-20240307',
    deepContext: 'claude-3-sonnet-20240229',
  },

  /**
   * Timeouts for provider requests.
   */
  timeouts: {
    standard: parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10),
  }
};
