import dotenv from 'dotenv';
dotenv.config();

/**
 * Centralized configuration for the AI module.
 */

export const aiConfig = {
  /**
   * The primary provider to use for AI requests.
   */
  provider: (process.env.AI_PROVIDER || 'anthropic').toLowerCase().trim(),

  /**
   * Anthropic provider specific configuration
   */
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    models: {
      fastJson: process.env.ANTHROPIC_FAST_MODEL || process.env.AI_DEFAULT_MODEL || 'claude-3-haiku-20240307',
      deepContext: process.env.ANTHROPIC_DEEP_MODEL || 'claude-3-sonnet-20240229',
    },
  },

  /**
   * Gemini provider specific configuration vocabulary.
   * Note: Gemini model mappings belong to WP-02C following EXP-01 discovery and Gate 4.
   */
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    models: {
      fastJson: process.env.GEMINI_FAST_MODEL || 'gemini-3.6-flash',
      deepContext: process.env.GEMINI_DEEP_MODEL || 'gemini-3.6-flash',
    },
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
  },
};
