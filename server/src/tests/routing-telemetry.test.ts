import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { AIService } from '../ai/ai.service.js';
import { AIProvider } from '../ai/providers/base.provider.js';
import { AIProviderFactory } from '../ai/providers/provider.factory.js';
import {
  AIProviderError,
  AIValidationError,
  AIConfigurationError,
  AIFallbackExecutionError,
} from '../ai/errors/ai.errors.js';
import { AIModelTier, AIRequestOptions, AIProviderResponse, AITelemetryEvent } from '../ai/types/index.js';
import { aiConfig } from '../ai/config/ai.config.js';
import { aiLogger } from '../ai/utils/logger.js';

class MockProvider implements AIProvider {
  public callCount = 0;
  public lastOptions?: AIRequestOptions;

  constructor(
    public readonly providerName: string,
    private readonly handler: (prompt: string, schema: unknown, options: AIRequestOptions) => Promise<AIProviderResponse<unknown>>
  ) {}

  getModelForTier(tier: AIModelTier): string {
    return `mock-${this.providerName}-${tier.toLowerCase()}-model`;
  }

  async generateStructured<T>(
    prompt: string,
    schema: unknown,
    options: AIRequestOptions
  ): Promise<AIProviderResponse<T>> {
    this.callCount++;
    this.lastOptions = options;
    return this.handler(prompt, schema, options) as Promise<AIProviderResponse<T>>;
  }
}

function registerMockProvider(name: string, provider: AIProvider) {
  (AIProviderFactory as any).cache.set(name.toLowerCase().trim(), provider);
}

describe('Phase 23 WP-03: Routing Telemetry & Observability Tests', () => {
  const SECRET_SENTINEL = 'SECRET_API_KEY_SENTINEL_DO_NOT_LEAK';
  const PROMPT_SENTINEL = 'SENSITIVE_PROMPT_CONTENT_SENTINEL';
  const USER_SENTINEL = 'USER_IDENTIFIER_SENTINEL_12345';
  const PROJECT_SENTINEL = 'PROJECT_NAME_SENTINEL_CONFIDENTIAL';

  const dummyTemplate: any = {
    metadata: { name: 'test-telemetry-prompt', version: '1.2.3' },
    sections: [
      { identifier: 'system', content: `System prompt with ${PROMPT_SENTINEL}` },
      { identifier: 'intent', content: `User intent with ${USER_SENTINEL} and ${PROJECT_SENTINEL}` },
    ],
  };
  const testSchema = z.object({ result: z.string(), status: z.boolean().optional() });

  let origConfig: {
    provider: string;
    anthropicKey: string;
    geminiKey: string;
  };
  let capturedEvents: AITelemetryEvent[] = [];
  const telemetryListener = (event: AITelemetryEvent) => {
    capturedEvents.push(event);
  };

  beforeEach(() => {
    origConfig = {
      provider: aiConfig.provider,
      anthropicKey: aiConfig.anthropic.apiKey,
      geminiKey: aiConfig.gemini.apiKey,
    };
    capturedEvents = [];
    aiLogger.clearListeners();
    aiLogger.onTelemetry(telemetryListener);
    AIProviderFactory.clearCache();
  });

  afterEach(() => {
    aiConfig.provider = origConfig.provider;
    aiConfig.anthropic.apiKey = origConfig.anthropicKey;
    aiConfig.gemini.apiKey = origConfig.geminiKey;
    aiLogger.offTelemetry(telemetryListener);
    aiLogger.clearListeners();
    AIProviderFactory.clearCache();
  });

  it('1. FAST_JSON routed primary telemetry', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    const geminiMock = new MockProvider('gemini', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'gemini-flash-v1' },
    }));
    registerMockProvider('gemini', geminiMock);
    registerMockProvider('anthropic', new MockProvider('anthropic', async () => ({} as any)));

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(capturedEvents.length, 1);
    const ev = capturedEvents[0]!;
    assert.strictEqual(ev.attempt, 1);
    assert.strictEqual(ev.isFallback, false);
    assert.strictEqual(ev.provider, 'gemini');
    assert.strictEqual(ev.tier, AIModelTier.FAST_JSON);
    assert.strictEqual(ev.model, 'gemini-flash-v1');
    assert.strictEqual(ev.routingStrategy, 'STATIC_TIER_POLICY');
    assert.strictEqual(ev.routingReasonCode, 'FAST_TIER_OPTIMAL_TARGET');
    assert.deepStrictEqual(ev.candidateProviders, ['anthropic', 'gemini']);
    assert.strictEqual(ev.success, true);
  });

  it('2. DEEP_CONTEXT Anthropic primary telemetry', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'claude-3-sonnet' },
    }));
    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', new MockProvider('gemini', async () => ({} as any)));

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(capturedEvents.length, 1);
    const ev = capturedEvents[0]!;
    assert.strictEqual(ev.provider, 'anthropic');
    assert.strictEqual(ev.routingStrategy, 'STATIC_TIER_POLICY');
    assert.strictEqual(ev.routingReasonCode, 'DEEP_TIER_PRIMARY_TARGET');
  });

  it('3. DEEP_CONTEXT Gemini primary telemetry', async () => {
    aiConfig.provider = 'gemini';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    const geminiMock = new MockProvider('gemini', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'gemini-pro' },
    }));
    registerMockProvider('gemini', geminiMock);
    registerMockProvider('anthropic', new MockProvider('anthropic', async () => ({} as any)));

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(capturedEvents.length, 1);
    const ev = capturedEvents[0]!;
    assert.strictEqual(ev.provider, 'gemini');
    assert.strictEqual(ev.routingStrategy, 'STATIC_TIER_POLICY');
    assert.strictEqual(ev.routingReasonCode, 'DEEP_TIER_PRIMARY_TARGET');
  });

  it('4. Anthropic-only routing telemetry', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = '';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'claude-haiku' },
    }));
    registerMockProvider('anthropic', anthropicMock);

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(capturedEvents.length, 1);
    const ev = capturedEvents[0]!;
    assert.strictEqual(ev.provider, 'anthropic');
    assert.strictEqual(ev.routingStrategy, 'SINGLE_CONFIGURED_PROVIDER');
    assert.strictEqual(ev.routingReasonCode, 'SINGLE_PROVIDER_AVAILABLE');
    assert.deepStrictEqual(ev.candidateProviders, ['anthropic']);
  });

  it('5. Gemini-only routing telemetry', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = '';
    aiConfig.gemini.apiKey = 'valid-gemini';

    const geminiMock = new MockProvider('gemini', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'gemini-flash' },
    }));
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(capturedEvents.length, 1);
    const ev = capturedEvents[0]!;
    assert.strictEqual(ev.provider, 'gemini');
    assert.strictEqual(ev.routingStrategy, 'SINGLE_CONFIGURED_PROVIDER');
    assert.strictEqual(ev.routingReasonCode, 'SINGLE_PROVIDER_AVAILABLE');
    assert.deepStrictEqual(ev.candidateProviders, ['gemini']);
  });

  it('6. Routing metadata comes from AIRouter', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    registerMockProvider('gemini', new MockProvider('gemini', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'gemini-model' },
    })));

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    const ev = capturedEvents[0]!;
    assert.strictEqual(ev.routingReasonCode, 'FAST_TIER_OPTIMAL_TARGET');
  });

  it('7. FAST_JSON fallback event sequence', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    const geminiMock = new MockProvider('gemini', async () => {
      throw new AIProviderError('Gemini 500 error', undefined, 'SERVER_ERROR');
    });
    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { result: 'fallback ok' },
      metadata: { model: 'claude-haiku' },
    }));

    registerMockProvider('gemini', geminiMock);
    registerMockProvider('anthropic', anthropicMock);

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(capturedEvents.length, 2);

    const ev1 = capturedEvents[0]!;
    assert.strictEqual(ev1.provider, 'gemini');
    assert.strictEqual(ev1.attempt, 1);
    assert.strictEqual(ev1.isFallback, false);
    assert.strictEqual(ev1.success, false);
    assert.strictEqual(ev1.routingStrategy, 'STATIC_TIER_POLICY');
    assert.strictEqual(ev1.routingReasonCode, 'FAST_TIER_OPTIMAL_TARGET');

    const ev2 = capturedEvents[1]!;
    assert.strictEqual(ev2.provider, 'anthropic');
    assert.strictEqual(ev2.attempt, 2);
    assert.strictEqual(ev2.isFallback, true);
    assert.strictEqual(ev2.fallbackFromProvider, 'gemini');
    assert.strictEqual(ev2.success, true);
    // Ensure Event 2 does NOT claim AIRouter selected Anthropic as initial provider
    assert.strictEqual(ev2.routingStrategy, undefined);
    assert.strictEqual(ev2.routingReasonCode, undefined);
  });

  it('8. DEEP_CONTEXT fallback event sequence', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    const anthropicMock = new MockProvider('anthropic', async () => {
      throw new AIProviderError('Anthropic timeout', undefined, 'TIMEOUT_ERROR');
    });
    const geminiMock = new MockProvider('gemini', async () => ({
      data: { result: 'fallback ok' },
      metadata: { model: 'gemini-pro' },
    }));

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(capturedEvents.length, 2);

    const ev1 = capturedEvents[0]!;
    assert.strictEqual(ev1.provider, 'anthropic');
    assert.strictEqual(ev1.attempt, 1);
    assert.strictEqual(ev1.isFallback, false);

    const ev2 = capturedEvents[1]!;
    assert.strictEqual(ev2.provider, 'gemini');
    assert.strictEqual(ev2.attempt, 2);
    assert.strictEqual(ev2.isFallback, true);
    assert.strictEqual(ev2.fallbackFromProvider, 'anthropic');
  });

  it('9. Double failure telemetry', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    registerMockProvider('anthropic', new MockProvider('anthropic', async () => {
      throw new AIProviderError('Anthropic 503', undefined, 'SERVER_ERROR');
    }));
    registerMockProvider('gemini', new MockProvider('gemini', async () => {
      throw new AIProviderError('Gemini 503', undefined, 'SERVER_ERROR');
    }));

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT }),
      AIFallbackExecutionError
    );

    assert.strictEqual(capturedEvents.length, 2);
    assert.strictEqual(capturedEvents[0]!.attempt, 1);
    assert.strictEqual(capturedEvents[1]!.attempt, 2);
  });

  it('10. Non-fallback failure', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    registerMockProvider('gemini', new MockProvider('gemini', async () => {
      throw new AIProviderError('Safety block', undefined, 'SAFETY_REFUSAL');
    }));

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON }),
      AIProviderError
    );

    assert.strictEqual(capturedEvents.length, 1);
    assert.strictEqual(capturedEvents[0]!.attempt, 1);
    assert.strictEqual(capturedEvents[0]!.success, false);
  });

  it('11. Validation failure', async () => {
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = '';

    registerMockProvider('anthropic', new MockProvider('anthropic', async () => ({
      data: { invalidField: 'missing result field' },
      metadata: { model: 'claude' },
    })));

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON }),
      AIValidationError
    );

    assert.strictEqual(capturedEvents.length, 1);
    assert.strictEqual(capturedEvents[0]!.attempt, 1);
    assert.strictEqual(capturedEvents[0]!.errorCategory, 'VALIDATION_ERROR');
  });

  it('12. Routing failure before Attempt 1', async () => {
    aiConfig.anthropic.apiKey = '';
    aiConfig.gemini.apiKey = '';

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON }),
      AIConfigurationError
    );

    assert.strictEqual(capturedEvents.length, 0);
  });

  it('13. Invalid tier before Attempt 1', async () => {
    aiConfig.anthropic.apiKey = 'valid-anthropic';

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: 'INVALID_TIER' as unknown as AIModelTier }),
      AIConfigurationError
    );

    assert.strictEqual(capturedEvents.length, 0);
  });

  it('14. Custom provider injection', async () => {
    const customPrimary = new MockProvider('custom-primary', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'custom-model' },
    }));

    const service = new AIService(customPrimary);
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(capturedEvents.length, 1);
    const ev = capturedEvents[0]!;
    assert.strictEqual(ev.provider, 'custom-primary');
    assert.strictEqual(ev.routingStrategy, undefined);
    assert.strictEqual(ev.routingReasonCode, undefined);
    assert.strictEqual(ev.candidateProviders, undefined);
  });

  it('15. Custom fallback provider', async () => {
    const customPrimary = new MockProvider('custom-primary', async () => {
      throw new AIProviderError('Primary error', undefined, 'SERVER_ERROR');
    });
    const customFallback = new MockProvider('custom-fallback', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'fallback-model' },
    }));

    const service = new AIService(customPrimary, customFallback);
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(capturedEvents.length, 2);
    assert.strictEqual(capturedEvents[0]!.provider, 'custom-primary');
    assert.strictEqual(capturedEvents[1]!.provider, 'custom-fallback');
    assert.strictEqual(capturedEvents[1]!.isFallback, true);
  });

  it('16. Privacy regression', async () => {
    aiConfig.anthropic.apiKey = SECRET_SENTINEL;
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const geminiMock = new MockProvider('gemini', async () => ({
      data: { result: `output containing ${PROMPT_SENTINEL}` },
      metadata: { model: 'gemini-model' },
    }));
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(capturedEvents.length, 1);
    const serialized = JSON.stringify(capturedEvents[0]);

    assert.strictEqual(serialized.includes(SECRET_SENTINEL), false);
    assert.strictEqual(serialized.includes(PROMPT_SENTINEL), false);
    assert.strictEqual(serialized.includes(USER_SENTINEL), false);
    assert.strictEqual(serialized.includes(PROJECT_SENTINEL), false);
  });

  it('17. UNKNOWN != ZERO', async () => {
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = '';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'claude-haiku' }, // no usage metadata
    }));
    registerMockProvider('anthropic', anthropicMock);

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(capturedEvents.length, 1);
    assert.strictEqual(capturedEvents[0]!.usage, undefined);
  });

  it('18. Known usage preserved', async () => {
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = '';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { result: 'ok' },
      metadata: {
        model: 'claude-haiku',
        usage: { inputTokens: 42, outputTokens: 18, totalTokens: 60 },
      },
    }));
    registerMockProvider('anthropic', anthropicMock);

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(capturedEvents.length, 1);
    assert.deepStrictEqual(capturedEvents[0]!.usage, { inputTokens: 42, outputTokens: 18, totalTokens: 60 });
  });

  it('19. Concrete model remains provider-owned', async () => {
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = '';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'concrete-provider-model-v99' },
    }));
    registerMockProvider('anthropic', anthropicMock);

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(capturedEvents.length, 1);
    assert.strictEqual(capturedEvents[0]!.model, 'concrete-provider-model-v99');
  });

  it('20. AIExecutionResult compatibility', async () => {
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = '';

    registerMockProvider('anthropic', new MockProvider('anthropic', async () => ({
      data: { result: 'valid-domain-result' },
      metadata: { model: 'claude-haiku' },
    })));

    const service = new AIService();
    const res = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.deepStrictEqual(res.data, { result: 'valid-domain-result' });
    assert.ok(res.metadata.executionId);
    assert.ok(typeof res.metadata.durationMs === 'number');
    // Ensure routing telemetry fields are NOT added to domain AIExecutionResult metadata
    assert.strictEqual((res.metadata as any).routingStrategy, undefined);
    assert.strictEqual((res.metadata as any).routingReasonCode, undefined);
  });

  it('21. Deterministic repeated routing', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    registerMockProvider('gemini', new MockProvider('gemini', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'gemini' },
    })));

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(capturedEvents.length, 2);
    assert.strictEqual(capturedEvents[0]!.routingReasonCode, capturedEvents[1]!.routingReasonCode);
    assert.strictEqual(capturedEvents[0]!.routingStrategy, capturedEvents[1]!.routingStrategy);
  });

  it('22. Maximum attempt bound regression', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    registerMockProvider('anthropic', new MockProvider('anthropic', async () => {
      throw new AIProviderError('Fail 1', undefined, 'SERVER_ERROR');
    }));
    registerMockProvider('gemini', new MockProvider('gemini', async () => {
      throw new AIProviderError('Fail 2', undefined, 'SERVER_ERROR');
    }));

    const service = new AIService();
    try {
      await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });
    } catch {
      // Expected
    }

    for (const ev of capturedEvents) {
      assert.ok(ev.attempt! <= 2, `Expected attempt <= 2, got ${ev.attempt}`);
    }
  });

  it('23. Phase 22 timeout threshold regression', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    const anthropicMock = new MockProvider('anthropic', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      throw new AIProviderError('Timeout', undefined, 'TIMEOUT_ERROR');
    });
    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', new MockProvider('gemini', async () => ({} as any)));

    const service = new AIService();
    try {
      await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT, timeoutMs: 10 });
    } catch {
      // Expected
    }

    assert.strictEqual(capturedEvents.length, 1);
    assert.strictEqual(capturedEvents[0]!.attempt, 1);
  });

  it('24. Alternate provider lazy construction', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic';
    aiConfig.gemini.apiKey = 'valid-gemini';

    let geminiConstructed = false;
    const origGetProvider = AIProviderFactory.getProvider;
    AIProviderFactory.getProvider = (name?: string) => {
      if (name === 'gemini') {
        geminiConstructed = true;
      }
      return origGetProvider.call(AIProviderFactory, name);
    };

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { result: 'ok' },
      metadata: { model: 'claude' },
    }));
    registerMockProvider('anthropic', anthropicMock);

    try {
      const service = new AIService();
      await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

      assert.strictEqual(capturedEvents.length, 1);
      assert.strictEqual(geminiConstructed, false);
    } finally {
      AIProviderFactory.getProvider = origGetProvider;
    }
  });
});
