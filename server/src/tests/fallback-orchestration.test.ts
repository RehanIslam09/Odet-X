import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z, ZodSchema } from 'zod';
import { AIService } from '../ai/ai.service.js';
import { AIProvider } from '../ai/providers/base.provider.js';
import { AIProviderFactory } from '../ai/providers/provider.factory.js';
import {
  AIProviderError,
  AIValidationError,
  AIConfigurationError,
  AITimeoutError,
  AIFallbackExecutionError,
} from '../ai/errors/ai.errors.js';
import { AIModelTier, AIRequestOptions, AIProviderResponse } from '../ai/types/index.js';
import { aiConfig } from '../ai/config/ai.config.js';
import { aiLogger } from '../ai/utils/logger.js';

class MockProvider implements AIProvider {
  public callCount = 0;
  public lastOptions?: AIRequestOptions;

  constructor(
    public readonly providerName: string,
    private readonly handler: (prompt: string, schema: unknown, options: AIRequestOptions) => Promise<AIProviderResponse<unknown>>
  ) {}

  getModelForTier(_tier: AIModelTier): string {
    return `mock-${this.providerName}-model`;
  }

  async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<AIProviderResponse<T>> {
    this.callCount++;
    this.lastOptions = options;
    return this.handler(prompt, schema, options) as Promise<AIProviderResponse<T>>;
  }
}

describe('Phase 22 WP-02: Fallback Orchestration & Latency Budget Tests', () => {
  const dummyTemplate: unknown = {
    metadata: { name: 'test-prompt', version: '1.0.0' },
    sections: [
      { identifier: 'system', content: 'System prompt content' },
      { identifier: 'intent', content: 'User intent content' },
    ],
  };
  const testSchema = z.object({ success: z.boolean(), message: z.string().optional() });

  describe('Primary Success & Lazy Resolution (Invariants 2 & 4)', () => {
    it('1. Primary success returns result immediately, alternate is never called or constructed', async () => {
      const primaryMock = new MockProvider('gemini', async () => ({
        data: { success: true, message: 'primary ok' },
        metadata: { model: 'gemini-model' },
      }));

      const service = new AIService(primaryMock);
      const result = await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(result.data.success, true);
      assert.strictEqual(result.data.message, 'primary ok');
      assert.strictEqual(primaryMock.callCount, 1);
    });

    it('Issue 3: Primary success proves alternate provider construction is NEVER triggered', async () => {
      const primaryMock = new MockProvider('gemini', async () => ({
        data: { success: true, message: 'primary succeeded' },
        metadata: { model: 'gemini-model' },
      }));

      // Ensure factory lookup for 'anthropic' WOULD fail with AIConfigurationError if attempted
      const origKey = aiConfig.anthropic.apiKey;
      aiConfig.anthropic.apiKey = '';
      AIProviderFactory.clearCache();

      try {
        const service = new AIService(primaryMock);
        const result = await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

        assert.strictEqual(result.data.success, true);
        assert.strictEqual(primaryMock.callCount, 1);
      } finally {
        aiConfig.anthropic.apiKey = origKey;
        AIProviderFactory.clearCache();
      }
    });
  });

  describe('Fallback-Eligible Failure Scenarios (Invariants 3, 6, 7)', () => {
    it('2. Eligible NETWORK_ERROR triggers fallback success', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('Network connection reset', undefined, 'NETWORK_ERROR');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({
        data: { success: true, message: 'fallback ok' },
        metadata: { model: 'claude-model' },
      }));

      const service = new AIService(primaryMock, alternateMock);
      const result = await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(result.data.success, true);
      assert.strictEqual(result.data.message, 'fallback ok');
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 1);
      assert.strictEqual(result.metadata.provider, 'anthropic');
    });

    it('3. Eligible RATE_LIMIT_ERROR triggers fallback success', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('Rate limit 429', undefined, 'RATE_LIMIT_ERROR');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({
        data: { success: true },
        metadata: { model: 'claude-model' },
      }));

      const service = new AIService(primaryMock, alternateMock);
      const result = await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(result.data.success, true);
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 1);
    });

    it('4. Eligible SERVER_ERROR triggers fallback success', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('HTTP 503 Service Unavailable', undefined, 'SERVER_ERROR');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({
        data: { success: true },
        metadata: { model: 'claude-model' },
      }));

      const service = new AIService(primaryMock, alternateMock);
      const result = await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(result.data.success, true);
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 1);
    });

    it('5. Eligible STRUCTURED_PARSE_ERROR triggers fallback success when budget remains', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('Failed to parse JSON', undefined, 'STRUCTURED_PARSE_ERROR');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({
        data: { success: true },
        metadata: { model: 'claude-model' },
      }));

      const service = new AIService(primaryMock, alternateMock);
      const result = await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(result.data.success, true);
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 1);
    });

    it('6. Primary AITimeoutError with remaining budget >= 3000ms triggers fallback', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AITimeoutError('Primary timed out');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({
        data: { success: true },
        metadata: { model: 'claude-model' },
      }));

      const service = new AIService(primaryMock, alternateMock);
      const result = await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON, timeoutMs: 30000 });

      assert.strictEqual(result.data.success, true);
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 1);
    });
  });

  describe('Non-Eligible Failures (Fail Fast Invariants 3 & 6)', () => {
    it('8. NON-ELIGIBLE SAFETY_REFUSAL fails fast immediately', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('Prompt blocked', undefined, 'SAFETY_REFUSAL');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

      const service = new AIService(primaryMock, alternateMock);
      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => err instanceof AIProviderError && err.failureReason === 'SAFETY_REFUSAL'
      );
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 0);
    });

    it('9. NON-ELIGIBLE MAX_TOKENS_TRUNCATION fails fast immediately', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('Truncated', undefined, 'MAX_TOKENS_TRUNCATION');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

      const service = new AIService(primaryMock, alternateMock);
      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => err instanceof AIProviderError && err.failureReason === 'MAX_TOKENS_TRUNCATION'
      );
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 0);
    });

    it('10. NON-ELIGIBLE AUTHENTICATION_ERROR fails fast immediately', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('Auth failed', undefined, 'AUTHENTICATION_ERROR');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

      const service = new AIService(primaryMock, alternateMock);
      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => err instanceof AIProviderError && err.failureReason === 'AUTHENTICATION_ERROR'
      );
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 0);
    });

    it('11. AIValidationError fails fast immediately', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        return { data: { success: 'not-a-boolean' }, metadata: { model: 'm' } };
      });
      const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

      const service = new AIService(primaryMock, alternateMock);
      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => err instanceof AIValidationError
      );
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 0);
    });

    it('12. AIConfigurationError fails fast immediately', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIConfigurationError('Missing key');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

      const service = new AIService(primaryMock, alternateMock);
      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => err instanceof AIConfigurationError
      );
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 0);
    });

    it('13. UNKNOWN_ERROR fails fast immediately', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('Unknown crash', undefined, 'UNKNOWN_ERROR');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

      const service = new AIService(primaryMock, alternateMock);
      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => err instanceof AIProviderError && err.failureReason === 'UNKNOWN_ERROR'
      );
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 0);
    });

    it('14 & Issue 4: Generic TypeError is wrapped exactly once without duplicate AIService prefixes and cause is preserved', async () => {
      const originalTypeError = new TypeError('Cannot read properties of null');
      const primaryMock = new MockProvider('gemini', async () => {
        throw originalTypeError;
      });
      const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

      const service = new AIService(primaryMock, alternateMock);
      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => {
          if (!(err instanceof Error)) return false;
          const prefixMatches = (err.message.match(/Unexpected failure in AIService:/g) || []).length;
          return (
            prefixMatches === 1 &&
            err.message.includes('Cannot read properties of null') &&
            err.cause === originalTypeError
          );
        }
      );
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 0);
    });
  });

  describe('Latency Budget & Monotonic Clock Bounds (Invariant 5 & Issue 1)', () => {

    it('Issue 1: Telemetry duration is calculated via performance.now() and timestamp is an ISO Date string', async () => {
      let loggedEvent: any;
      const listener = (event: any) => {
        loggedEvent = event;
      };
      aiLogger.onTelemetry(listener);

      try {
        const primaryMock = new MockProvider('gemini', async () => ({
          data: { success: true },
          metadata: { model: 'gemini-model' },
        }));

        const service = new AIService(primaryMock);
        await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

        assert.ok(loggedEvent);
        assert.strictEqual(typeof loggedEvent.durationMs, 'number');
        assert.ok(Number.isInteger(loggedEvent.durationMs));
        assert.strictEqual(typeof loggedEvent.timestamp, 'string');
        assert.ok(!isNaN(Date.parse(loggedEvent.timestamp)), 'timestamp must be valid ISO Date string');
      } finally {
        aiLogger.offTelemetry(listener);
      }
    });

    it('7 & 19. Insufficient remaining latency (< 3000ms) aborts fallback and re-throws primary error', async () => {
      const originalNow = performance.now;
      let tickCount = 0;
      performance.now = () => {
        if (tickCount++ === 0) return 1000;
        return 28500; // elapsed = 27500ms, remaining = 30000 - 27500 = 2500ms < 3000ms
      };

      try {
        const primaryMock = new MockProvider('gemini', async () => {
          throw new AIProviderError('503 Service Unavailable', undefined, 'SERVER_ERROR');
        });
        const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

        const service = new AIService(primaryMock, alternateMock);
        await assert.rejects(
          () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON, timeoutMs: 30000 }),
          (err: unknown) => err instanceof AIProviderError && err.failureReason === 'SERVER_ERROR'
        );
        assert.strictEqual(primaryMock.callCount, 1);
        assert.strictEqual(alternateMock.callCount, 0, 'Alternate must NOT be called when remaining budget < 3000ms');
      } finally {
        performance.now = originalNow;
      }
    });

    it('18 & 20. Remaining timeout budget is propagated to alternate attempt', async () => {
      const originalNow = performance.now;
      let tickCount = 0;
      performance.now = () => {
        if (tickCount++ === 0) return 1000;
        return 6000; // elapsed = 5000ms, remaining = 30000 - 5000 = 25000ms
      };

      try {
        const primaryMock = new MockProvider('gemini', async () => {
          throw new AIProviderError('503 Service Unavailable', undefined, 'SERVER_ERROR');
        });
        const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

        const service = new AIService(primaryMock, alternateMock);
        await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON, timeoutMs: 30000 });

        assert.strictEqual(primaryMock.callCount, 1);
        assert.strictEqual(alternateMock.callCount, 1);
        assert.ok(alternateMock.lastOptions);
        assert.strictEqual(alternateMock.lastOptions.timeoutMs, 25000, 'Alternate options must receive remainingTimeoutMs');
      } finally {
        performance.now = originalNow;
      }
    });
  });

  describe('Double Failure & Alternate Construction Failures (Invariants 8 & 9 & Issue 2)', () => {

    it('Issue 2: Custom fallback providerName is the canonical identity stored in AIFallbackExecutionError', async () => {
      const primaryErr = new AIProviderError('Gemini 503', undefined, 'SERVER_ERROR');
      const fallbackErr = new AIProviderError('Custom fallback 429', undefined, 'RATE_LIMIT_ERROR');

      const primaryMock = new MockProvider('gemini', async () => { throw primaryErr; });
      const customFallbackMock = new MockProvider('custom-vendor-fallback', async () => { throw fallbackErr; });

      const service = new AIService(primaryMock, customFallbackMock);

      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => {
          return (
            err instanceof AIFallbackExecutionError &&
            err.primaryProvider === 'gemini' &&
            err.fallbackProvider === 'custom-vendor-fallback' &&
            err.message.includes('fallback provider (custom-vendor-fallback)')
          );
        }
      );

      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(customFallbackMock.callCount, 1);
    });

    it('15 & 17. Double failure throws AIFallbackExecutionError preserving both error contexts', async () => {
      const primaryErr = new AIProviderError('Primary 503 Server Error', undefined, 'SERVER_ERROR');
      const fallbackErr = new AIProviderError('Fallback 429 Rate Limit', undefined, 'RATE_LIMIT_ERROR');

      const primaryMock = new MockProvider('gemini', async () => { throw primaryErr; });
      const alternateMock = new MockProvider('anthropic', async () => { throw fallbackErr; });

      const service = new AIService(primaryMock, alternateMock);

      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => {
          return (
            err instanceof AIFallbackExecutionError &&
            err.primaryError === primaryErr &&
            err.fallbackError === fallbackErr &&
            err.primaryProvider === 'gemini' &&
            err.fallbackProvider === 'anthropic' &&
            err.message.includes('AI request failed on both primary provider (gemini) and fallback provider (anthropic).')
          );
        }
      );

      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(alternateMock.callCount, 1);
    });

    it('16. Alternate provider construction failure throws AIFallbackExecutionError with AIConfigurationError', async () => {
      const primaryErr = new AIProviderError('Primary 503 Server Error', undefined, 'SERVER_ERROR');
      const primaryMock = new MockProvider('gemini', async () => { throw primaryErr; });

      const origKey = aiConfig.anthropic.apiKey;
      aiConfig.anthropic.apiKey = '';
      AIProviderFactory.clearCache();

      try {
        const service = new AIService(primaryMock);
        await assert.rejects(
          () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
          (err: unknown) => {
            return (
              err instanceof AIFallbackExecutionError &&
              err.primaryError === primaryErr &&
              err.fallbackError instanceof AIConfigurationError &&
              err.primaryProvider === 'gemini' &&
              err.fallbackProvider === 'anthropic'
            );
          }
        );
      } finally {
        aiConfig.anthropic.apiKey = origKey;
        AIProviderFactory.clearCache();
      }
    });

    it('22. Unknown primary provider with no alternate mapping fails safely and re-throws primary error', async () => {
      const primaryMock = new MockProvider('unsupported-custom-provider', async () => {
        throw new AIProviderError('503 Server Error', undefined, 'SERVER_ERROR');
      });

      const service = new AIService(primaryMock);
      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => err instanceof AIProviderError && err.failureReason === 'SERVER_ERROR'
      );
      assert.strictEqual(primaryMock.callCount, 1);
    });
  });
});
