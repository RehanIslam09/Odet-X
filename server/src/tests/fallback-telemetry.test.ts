import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { z, ZodSchema } from 'zod';
import { AIService } from '../ai/ai.service.js';
import { AIProvider } from '../ai/providers/base.provider.js';
import { AIProviderFactory } from '../ai/providers/provider.factory.js';
import {
  AIProviderError,
  AIFallbackExecutionError,
} from '../ai/errors/ai.errors.js';
import { AIModelTier, AIRequestOptions, AIProviderResponse, AITelemetryEvent } from '../ai/types/index.js';
import { aiConfig } from '../ai/config/ai.config.js';
import { aiLogger } from '../ai/utils/logger.js';

class MockProvider implements AIProvider {
  public callCount = 0;

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
    return this.handler(prompt, schema, options) as Promise<AIProviderResponse<T>>;
  }
}

describe('Phase 22 WP-03: Fallback Telemetry Integration & Privacy Tests', () => {
  const dummyTemplate: unknown = {
    metadata: { name: 'test-prompt', version: '1.0.0' },
    sections: [
      { identifier: 'system', content: 'System prompt' },
      { identifier: 'intent', content: 'User intent' },
    ],
  };
  const testSchema = z.object({ success: z.boolean() });

  let capturedEvents: AITelemetryEvent[] = [];
  let listener: (event: AITelemetryEvent) => void;

  beforeEach(() => {
    capturedEvents = [];
    listener = (event: AITelemetryEvent) => {
      capturedEvents.push(event);
    };
    aiLogger.onTelemetry(listener);
  });

  afterEach(() => {
    aiLogger.offTelemetry(listener);
    aiLogger.clearListeners();
  });

  describe('Primary Success Telemetry (Items 1-5, 37-40)', () => {
    it('1-5. Primary success emits exactly 1 event with attempt=1, isFallback=false, and preserved usage', async () => {
      const primaryMock = new MockProvider('gemini', async () => ({
        data: { success: true },
        metadata: {
          model: 'gemini-model',
          usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        },
      }));

      const service = new AIService(primaryMock);
      await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(capturedEvents.length, 1);
      const ev = capturedEvents[0]!;
      assert.strictEqual(ev.attempt, 1);
      assert.strictEqual(ev.isFallback, false);
      assert.strictEqual(ev.success, true);
      assert.strictEqual(ev.provider, 'gemini');
      assert.strictEqual(ev.fallbackFromProvider, undefined);
      assert.strictEqual(ev.primaryErrorCategory, undefined);
      assert.deepStrictEqual(ev.usage, { inputTokens: 100, outputTokens: 50, totalTokens: 150 });
      assert.strictEqual(typeof ev.durationMs, 'number');
      assert.ok(!isNaN(Date.parse(ev.timestamp)));
    });

    it('5. Primary success with unknown usage leaves usage as undefined (no zero fabrication)', async () => {
      const primaryMock = new MockProvider('gemini', async () => ({
        data: { success: true },
        metadata: { model: 'gemini-model' }, // No usage
      }));

      const service = new AIService(primaryMock);
      await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(capturedEvents.length, 1);
      assert.strictEqual(capturedEvents[0]!.usage, undefined);
    });

    it('40. Separate generateStructuredData calls receive distinct executionIds', async () => {
      const primaryMock = new MockProvider('gemini', async () => ({
        data: { success: true },
        metadata: { model: 'm' },
      }));

      const service = new AIService(primaryMock);
      await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });
      await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(capturedEvents.length, 2);
      assert.notStrictEqual(capturedEvents[0]!.executionId, capturedEvents[1]!.executionId);
    });
  });

  describe('Non-Eligible Primary Failure Telemetry (Items 6-8)', () => {
    it('6-8. Non-eligible primary failure emits exactly 1 event (attempt=1, isFallback=false, success=false)', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('Safety blocked', undefined, 'SAFETY_REFUSAL');
      });
      const alternateMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

      const service = new AIService(primaryMock, alternateMock);
      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => err instanceof AIProviderError && err.failureReason === 'SAFETY_REFUSAL'
      );

      assert.strictEqual(capturedEvents.length, 1);
      const ev = capturedEvents[0]!;
      assert.strictEqual(ev.attempt, 1);
      assert.strictEqual(ev.isFallback, false);
      assert.strictEqual(ev.success, false);
      assert.strictEqual(ev.provider, 'gemini');
      assert.strictEqual(ev.errorCategory, 'PROVIDER_ERROR');
    });
  });

  describe('Primary Failure -> Fallback Success Telemetry (Items 9-15)', () => {
    it('9-15. Primary failure -> Fallback success emits exactly 2 events sharing executionId', async () => {
      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('HTTP 503 Server Error', undefined, 'SERVER_ERROR');
      });
      const fallbackMock = new MockProvider('anthropic', async () => ({
        data: { success: true },
        metadata: {
          model: 'claude-model',
          usage: { inputTokens: 200, outputTokens: 80, totalTokens: 280 },
        },
      }));

      const service = new AIService(primaryMock, fallbackMock);
      const result = await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(result.data.success, true);
      assert.strictEqual(capturedEvents.length, 2);

      const e1 = capturedEvents[0]!;
      assert.strictEqual(e1.attempt, 1);
      assert.strictEqual(e1.isFallback, false);
      assert.strictEqual(e1.success, false);
      assert.strictEqual(e1.provider, 'gemini');

      const e2 = capturedEvents[1]!;
      assert.strictEqual(e2.attempt, 2);
      assert.strictEqual(e2.isFallback, true);
      assert.strictEqual(e2.success, true);
      assert.strictEqual(e2.provider, 'anthropic');
      assert.strictEqual(e2.fallbackFromProvider, 'gemini');
      assert.strictEqual(e2.primaryErrorCategory, 'PROVIDER_ERROR');
      assert.deepStrictEqual(e2.usage, { inputTokens: 200, outputTokens: 80, totalTokens: 280 });

      // Correlation test
      assert.strictEqual(e1.executionId, e2.executionId);
    });
  });

  describe('Primary Failure -> Fallback Failure Telemetry (Items 16-19)', () => {
    it('16-19. Primary failure -> Fallback failure emits exactly 2 events (both success=false) and throws AIFallbackExecutionError', async () => {
      const primaryErr = new AIProviderError('Gemini 503', undefined, 'SERVER_ERROR');
      const fallbackErr = new AIProviderError('Anthropic 429', undefined, 'RATE_LIMIT_ERROR');

      const primaryMock = new MockProvider('gemini', async () => { throw primaryErr; });
      const fallbackMock = new MockProvider('anthropic', async () => { throw fallbackErr; });

      const service = new AIService(primaryMock, fallbackMock);

      await assert.rejects(
        () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
        (err: unknown) => {
          return (
            err instanceof AIFallbackExecutionError &&
            err.primaryError === primaryErr &&
            err.fallbackError === fallbackErr
          );
        }
      );

      assert.strictEqual(capturedEvents.length, 2);
      const e1 = capturedEvents[0]!;
      assert.strictEqual(e1.attempt, 1);
      assert.strictEqual(e1.success, false);

      const e2 = capturedEvents[1]!;
      assert.strictEqual(e2.attempt, 2);
      assert.strictEqual(e2.isFallback, true);
      assert.strictEqual(e2.success, false);
      assert.strictEqual(e2.fallbackFromProvider, 'gemini');
      assert.strictEqual(e2.primaryErrorCategory, 'PROVIDER_ERROR');
      assert.strictEqual(e1.executionId, e2.executionId);
    });
  });

  describe('Budget & Construction Boundary Telemetry (Items 20-23)', () => {
    it('20-21. Insufficient budget (< 3000ms) emits exactly 1 event and alternate provider is NOT executed', async () => {
      const originalNow = performance.now;
      let tickCount = 0;
      performance.now = () => {
        if (tickCount++ === 0) return 1000;
        return 28500; // elapsed = 27500ms -> remaining = 2500ms < 3000ms
      };

      try {
        const primaryMock = new MockProvider('gemini', async () => {
          throw new AIProviderError('Primary 503', undefined, 'SERVER_ERROR');
        });
        const fallbackMock = new MockProvider('anthropic', async () => ({ data: { success: true }, metadata: { model: 'm' } }));

        const service = new AIService(primaryMock, fallbackMock);
        await assert.rejects(
          () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON, timeoutMs: 30000 }),
          (err: unknown) => err instanceof AIProviderError && err.failureReason === 'SERVER_ERROR'
        );

        assert.strictEqual(capturedEvents.length, 1);
        assert.strictEqual(capturedEvents[0]!.attempt, 1);
        assert.strictEqual(fallbackMock.callCount, 0);
      } finally {
        performance.now = originalNow;
      }
    });

    it('22-23. Fallback construction failure emits exactly 1 event for primary and does NOT fabricate attempt 2 telemetry', async () => {
      const primaryErr = new AIProviderError('Gemini 503', undefined, 'SERVER_ERROR');
      const primaryMock = new MockProvider('gemini', async () => { throw primaryErr; });

      const origKey = aiConfig.anthropic.apiKey;
      aiConfig.anthropic.apiKey = ''; // Cause getProvider('anthropic') to throw AIConfigurationError
      AIProviderFactory.clearCache();

      try {
        const service = new AIService(primaryMock);
        await assert.rejects(
          () => service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON }),
          (err: unknown) => err instanceof AIFallbackExecutionError
        );

        assert.strictEqual(capturedEvents.length, 1, 'Must NOT emit fabricated attempt 2 telemetry if fallback provider construction fails');
        assert.strictEqual(capturedEvents[0]!.attempt, 1);
      } finally {
        aiConfig.anthropic.apiKey = origKey;
        AIProviderFactory.clearCache();
      }
    });
  });

  describe('Unknown vs Explicit Zero Token Usage (Items 24-28)', () => {
    it('24-28. Explicit zero token usage is preserved as zero, but unknown usage remains undefined', async () => {
      const primaryMock = new MockProvider('gemini', async () => ({
        data: { success: true },
        metadata: {
          model: 'm',
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      }));

      const service = new AIService(primaryMock);
      await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(capturedEvents.length, 1);
      assert.deepStrictEqual(capturedEvents[0]!.usage, { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    });
  });

  describe('Telemetry Privacy Boundaries (Items 29-33)', () => {
    it('29-33. Telemetry events exclude prompt text, raw responses, API keys, and sensitive sentinels', async () => {
      const secretPrompt = 'SUPER_SECRET_PROMPT_SENTINEL_12345';
      const secretKey = 'SUPER_SECRET_API_KEY_SENTINEL_67890';
      const secretProject = 'PRIVATE_PROJECT_DESCRIPTION_SENTINEL_ABC';
      const secretResponse = 'RAW_PROVIDER_RESPONSE_SENTINEL_XYZ';

      const sensitiveTemplate: unknown = {
        metadata: { name: secretPrompt, version: '1.0.0' },
        sections: [
          { identifier: 'system', content: secretKey },
          { identifier: 'intent', content: secretProject },
        ],
      };

      const primaryMock = new MockProvider('gemini', async () => {
        const err: any = new Error(`Gemini failure with raw response: ${secretResponse}`);
        err.apiKey = secretKey;
        throw err;
      });

      const service = new AIService(primaryMock);
      await assert.rejects(
        () => service.generateStructuredData(sensitiveTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON })
      );

      assert.strictEqual(capturedEvents.length, 1);
      const jsonString = JSON.stringify(capturedEvents[0]!);

      assert.strictEqual(jsonString.includes(secretKey), false, 'API key sentinel must not be present');
      assert.strictEqual(jsonString.includes(secretProject), false, 'Project description sentinel must not be present');
      assert.strictEqual(jsonString.includes(secretResponse), false, 'Raw provider response sentinel must not be present');
      assert.strictEqual(jsonString.includes('Authorization'), false, 'Authorization headers must not be present');
      assert.strictEqual(jsonString.includes('Bearer'), false, 'JWT Tokens must not be present');
    });
  });

  describe('Telemetry Observer Isolation (Items 34-36)', () => {
    it('34-36. Throwing telemetry listener does NOT alter execution result or prevent fallback', async () => {
      aiLogger.onTelemetry(() => {
        throw new Error('Crashing observer listener');
      });

      const primaryMock = new MockProvider('gemini', async () => {
        throw new AIProviderError('Gemini 503', undefined, 'SERVER_ERROR');
      });
      const fallbackMock = new MockProvider('anthropic', async () => ({
        data: { success: true },
        metadata: { model: 'claude-model' },
      }));

      const service = new AIService(primaryMock, fallbackMock);
      const result = await service.generateStructuredData(dummyTemplate as any, testSchema, { tier: AIModelTier.FAST_JSON });

      assert.strictEqual(result.data.success, true);
      assert.strictEqual(primaryMock.callCount, 1);
      assert.strictEqual(fallbackMock.callCount, 1);
    });
  });
});
