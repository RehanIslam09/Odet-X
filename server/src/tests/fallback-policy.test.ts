import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import {
  AIBaseError,
  AIProviderError,
  AIValidationError,
  AIConfigurationError,
  AITimeoutError,
  AIFallbackExecutionError,
  AIProviderFailureReason,
} from '../ai/errors/ai.errors.js';
import { isFallbackEligible } from '../ai/utils/fallback-policy.js';
import { AnthropicProvider } from '../ai/providers/anthropic.provider.js';
import { GeminiProvider } from '../ai/providers/gemini.provider.js';
import { aiConfig } from '../ai/config/ai.config.js';
import { AIModelTier } from '../ai/types/index.js';

describe('Phase 22 WP-01: Error Taxonomy & Fallback Policy Tests', () => {

  describe('isFallbackEligible Allowlist Classification', () => {
    it('should return true for allowlisted failure reasons', () => {
      const allowlistedReasons: AIProviderFailureReason[] = [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'RATE_LIMIT_ERROR',
        'SERVER_ERROR',
        'STRUCTURED_PARSE_ERROR',
      ];

      for (const reason of allowlistedReasons) {
        const error = new AIProviderError(`Provider failed with ${reason}`, undefined, reason);
        assert.strictEqual(
          isFallbackEligible(error),
          true,
          `Expected isFallbackEligible to return true for ${reason}`
        );
      }
    });

    it('should return true for AITimeoutError instances', () => {
      const timeoutError = new AITimeoutError('Request timed out after 30000ms');
      assert.strictEqual(isFallbackEligible(timeoutError), true);
    });

    it('should return false for non-eligible failure reasons', () => {
      const nonEligibleReasons: AIProviderFailureReason[] = [
        'SAFETY_REFUSAL',
        'MAX_TOKENS_TRUNCATION',
        'AUTHENTICATION_ERROR',
        'UNKNOWN_ERROR',
      ];

      for (const reason of nonEligibleReasons) {
        const error = new AIProviderError(`Provider failed with ${reason}`, undefined, reason);
        assert.strictEqual(
          isFallbackEligible(error),
          false,
          `Expected isFallbackEligible to return false for ${reason}`
        );
      }
    });

    it('should return false for non-eligible application error classes', () => {
      const validationError = new AIValidationError('JSON schema mismatch');
      const configError = new AIConfigurationError('Missing API key');

      assert.strictEqual(isFallbackEligible(validationError), false);
      assert.strictEqual(isFallbackEligible(configError), false);
    });

    it('should return false for unknown errors, generic Errors, TypeErrors, and primitives', () => {
      assert.strictEqual(isFallbackEligible(new TypeError('Cannot read property of undefined')), false);
      assert.strictEqual(isFallbackEligible(new Error('Generic uncaught error')), false);
      assert.strictEqual(isFallbackEligible({ message: 'Random object' }), false);
      assert.strictEqual(isFallbackEligible('Unexpected string exception'), false);
      assert.strictEqual(isFallbackEligible(null), false);
      assert.strictEqual(isFallbackEligible(undefined), false);
    });
  });

  describe('Gemini Provider Corrective Normalization Tests', () => {
    const originalKey = process.env.GEMINI_API_KEY;
    const testSchema = z.object({ ok: z.boolean() });

    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-gemini-key-do-not-call';
      aiConfig.gemini.apiKey = 'test-gemini-key-do-not-call';
    });

    afterEach(() => {
      if (originalKey !== undefined) {
        process.env.GEMINI_API_KEY = originalKey;
        aiConfig.gemini.apiKey = originalKey;
      } else {
        delete process.env.GEMINI_API_KEY;
        aiConfig.gemini.apiKey = '';
      }
    });

    function setMockGenerateContent(provider: GeminiProvider, mockFn: any) {
      (provider as any).client.models.generateContent = mockFn;
    }

    it('1 & 2: Gemini missing candidate normalizes to UNKNOWN_ERROR and is NOT fallback eligible', async () => {
      const provider = new GeminiProvider();
      setMockGenerateContent(provider, async () => ({ candidates: [] }));

      try {
        await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
        assert.fail('Should have thrown AIProviderError');
      } catch (err: any) {
        assert.ok(err instanceof AIProviderError);
        assert.strictEqual(err.failureReason, 'UNKNOWN_ERROR');
        assert.strictEqual(isFallbackEligible(err), false);
      }
    });

    it('3 & 4: Gemini unrecognized non-STOP finishReason normalizes to UNKNOWN_ERROR and is NOT fallback eligible', async () => {
      const provider = new GeminiProvider();
      setMockGenerateContent(provider, async () => ({
        candidates: [{ finishReason: 'CUSTOM_UNKNOWN_REASON', content: { parts: [{ text: '{}' }] } }],
      }));

      try {
        await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
        assert.fail('Should have thrown AIProviderError');
      } catch (err: any) {
        assert.ok(err instanceof AIProviderError);
        assert.strictEqual(err.failureReason, 'UNKNOWN_ERROR');
        assert.strictEqual(isFallbackEligible(err), false);
      }
    });

    it('5: Gemini SAFETY remains SAFETY_REFUSAL and is NOT fallback eligible', async () => {
      const provider = new GeminiProvider();
      setMockGenerateContent(provider, async () => ({
        candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: '{}' }] } }],
      }));

      try {
        await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
        assert.fail('Should have thrown AIProviderError');
      } catch (err: any) {
        assert.ok(err instanceof AIProviderError);
        assert.strictEqual(err.failureReason, 'SAFETY_REFUSAL');
        assert.strictEqual(isFallbackEligible(err), false);
      }
    });

    it('6: Gemini RECITATION remains SAFETY_REFUSAL and is NOT fallback eligible', async () => {
      const provider = new GeminiProvider();
      setMockGenerateContent(provider, async () => ({
        candidates: [{ finishReason: 'RECITATION', content: { parts: [{ text: '{}' }] } }],
      }));

      try {
        await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
        assert.fail('Should have thrown AIProviderError');
      } catch (err: any) {
        assert.ok(err instanceof AIProviderError);
        assert.strictEqual(err.failureReason, 'SAFETY_REFUSAL');
        assert.strictEqual(isFallbackEligible(err), false);
      }
    });

    it('7: Gemini MAX_TOKENS remains MAX_TOKENS_TRUNCATION and is NOT fallback eligible', async () => {
      const provider = new GeminiProvider();
      setMockGenerateContent(provider, async () => ({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }],
      }));

      try {
        await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
        assert.fail('Should have thrown AIProviderError');
      } catch (err: any) {
        assert.ok(err instanceof AIProviderError);
        assert.strictEqual(err.failureReason, 'MAX_TOKENS_TRUNCATION');
        assert.strictEqual(isFallbackEligible(err), false);
      }
    });

    it('8: Known HTTP 500/503/504 still normalize to SERVER_ERROR and REMAIN fallback eligible', async () => {
      const provider = new GeminiProvider();
      setMockGenerateContent(provider, async () => {
        const err: any = new Error('Service Unavailable');
        err.status = 503;
        throw err;
      });

      try {
        await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
        assert.fail('Should have thrown AIProviderError');
      } catch (err: any) {
        assert.ok(err instanceof AIProviderError);
        assert.strictEqual(err.failureReason, 'SERVER_ERROR');
        assert.strictEqual(isFallbackEligible(err), true);
      }
    });
  });

  describe('AIFallbackExecutionError Structure', () => {
    it('should correctly store primaryError, fallbackError, primaryProvider, and fallbackProvider', () => {
      const primaryErr = new AIProviderError('Gemini 503 Service Unavailable', undefined, 'SERVER_ERROR');
      const fallbackErr = new AIProviderError('Anthropic 429 Rate Limit Exceeded', undefined, 'RATE_LIMIT_ERROR');

      const aggregateErr = new AIFallbackExecutionError(
        'AI request failed on both primary provider (gemini) and fallback provider (anthropic).',
        primaryErr,
        fallbackErr,
        'gemini',
        'anthropic'
      );

      assert.ok(aggregateErr instanceof AIBaseError);
      assert.ok(aggregateErr instanceof Error);
      assert.strictEqual(aggregateErr.primaryError, primaryErr);
      assert.strictEqual(aggregateErr.fallbackError, fallbackErr);
      assert.strictEqual(aggregateErr.primaryProvider, 'gemini');
      assert.strictEqual(aggregateErr.fallbackProvider, 'anthropic');
      assert.strictEqual(
        aggregateErr.message,
        'AI request failed on both primary provider (gemini) and fallback provider (anthropic).'
      );
    });
  });

  describe('AnthropicProvider SDK Configuration', () => {
    it('should explicitly configure Anthropic client with maxRetries: 1', () => {
      // Store original key
      const origKey = aiConfig.anthropic.apiKey;
      aiConfig.anthropic.apiKey = 'dummy-anthropic-key-for-unit-test';

      try {
        const provider = new AnthropicProvider();
        const client = (provider as any).client;
        assert.ok(client, 'Client initialized');
        assert.strictEqual(client.maxRetries, 1, 'Anthropic SDK client maxRetries must be explicitly set to 1');
      } finally {
        aiConfig.anthropic.apiKey = origKey;
      }
    });
  });
});
