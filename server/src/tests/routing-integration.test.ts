import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { AIService } from '../ai/ai.service.js';
import { AIProvider } from '../ai/providers/base.provider.js';
import { AIProviderFactory } from '../ai/providers/provider.factory.js';
import {
  AIProviderError,
  AIConfigurationError,
  AIFallbackExecutionError,
} from '../ai/errors/ai.errors.js';
import { AIModelTier, AIRequestOptions, AIProviderResponse } from '../ai/types/index.js';
import { aiConfig } from '../ai/config/ai.config.js';

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

describe('Phase 23 WP-02: AIService Binding & Routing Integration Tests', () => {
  const dummyTemplate: any = {
    metadata: { name: 'test-routing-prompt', version: '1.0.0' },
    sections: [
      { identifier: 'system', content: 'System prompt' },
      { identifier: 'intent', content: 'User intent' },
    ],
  };
  const testSchema = z.object({ success: z.boolean(), provider: z.string().optional() });

  let origConfig: {
    provider: string;
    anthropicKey: string;
    geminiKey: string;
  };

  beforeEach(() => {
    origConfig = {
      provider: aiConfig.provider,
      anthropicKey: aiConfig.anthropic.apiKey,
      geminiKey: aiConfig.gemini.apiKey,
    };
    AIProviderFactory.clearCache();
  });

  afterEach(() => {
    aiConfig.provider = origConfig.provider;
    aiConfig.anthropic.apiKey = origConfig.anthropicKey;
    aiConfig.gemini.apiKey = origConfig.geminiKey;
    AIProviderFactory.clearCache();
  });

  it('1. FAST_JSON routes to Gemini when both configured', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { success: true, provider: 'anthropic' },
      metadata: { model: 'claude-3-haiku' },
    }));
    const geminiMock = new MockProvider('gemini', async () => ({
      data: { success: true, provider: 'gemini' },
      metadata: { model: 'gemini-flash' },
    }));

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(result.data.provider, 'gemini');
    assert.strictEqual(geminiMock.callCount, 1);
    assert.strictEqual(anthropicMock.callCount, 0);
  });

  it('2. DEEP_CONTEXT uses configured Anthropic primary', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { success: true, provider: 'anthropic' },
      metadata: { model: 'claude-3-sonnet' },
    }));
    const geminiMock = new MockProvider('gemini', async () => ({
      data: { success: true, provider: 'gemini' },
      metadata: { model: 'gemini-pro' },
    }));

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(result.data.provider, 'anthropic');
    assert.strictEqual(anthropicMock.callCount, 1);
    assert.strictEqual(geminiMock.callCount, 0);
  });

  it('3. DEEP_CONTEXT uses configured Gemini primary', async () => {
    aiConfig.provider = 'gemini';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { success: true, provider: 'anthropic' },
      metadata: { model: 'claude-3-sonnet' },
    }));
    const geminiMock = new MockProvider('gemini', async () => ({
      data: { success: true, provider: 'gemini' },
      metadata: { model: 'gemini-pro' },
    }));

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(result.data.provider, 'gemini');
    assert.strictEqual(geminiMock.callCount, 1);
    assert.strictEqual(anthropicMock.callCount, 0);
  });

  it('4. Anthropic-only FAST_JSON', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = '';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { success: true, provider: 'anthropic' },
      metadata: { model: 'claude-3-haiku' },
    }));

    registerMockProvider('anthropic', anthropicMock);

    const service = new AIService();
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(result.data.provider, 'anthropic');
    assert.strictEqual(anthropicMock.callCount, 1);
  });

  it('5. Gemini-only DEEP_CONTEXT', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = '';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const geminiMock = new MockProvider('gemini', async () => ({
      data: { success: true, provider: 'gemini' },
      metadata: { model: 'gemini-flash' },
    }));

    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(result.data.provider, 'gemini');
    assert.strictEqual(geminiMock.callCount, 1);
  });

  it('6. Zero configured providers', async () => {
    aiConfig.anthropic.apiKey = '';
    aiConfig.gemini.apiKey = '';

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: Error) => err instanceof AIConfigurationError && err.message.includes('No configured AI providers available')
    );
  });

  it('7. Invalid runtime tier', async () => {
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: 'INVALID_TIER' as unknown as AIModelTier }),
      (err: Error) => err instanceof AIConfigurationError && err.message.includes('Unsupported or invalid AI model tier')
    );
  });

  it('8. FAST_JSON routed Gemini -> fallback Anthropic (CRITICAL)', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const executionSequence: string[] = [];

    const geminiMock = new MockProvider('gemini', async () => {
      executionSequence.push('gemini');
      throw new AIProviderError('Gemini 500 Server Error', undefined, 'SERVER_ERROR');
    });

    const anthropicMock = new MockProvider('anthropic', async () => {
      executionSequence.push('anthropic');
      return {
        data: { success: true, provider: 'anthropic-fallback' },
        metadata: { model: 'claude-3-haiku' },
      };
    });

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(result.data.provider, 'anthropic-fallback');
    assert.deepStrictEqual(executionSequence, ['gemini', 'anthropic']);
    assert.strictEqual(geminiMock.callCount, 1);
    assert.strictEqual(anthropicMock.callCount, 1);
  });

  it('9. FAST_JSON routed Gemini non-eligible failure', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const geminiMock = new MockProvider('gemini', async () => {
      throw new AIProviderError('Safety block', undefined, 'SAFETY_REFUSAL');
    });
    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { success: true, provider: 'anthropic' },
      metadata: { model: 'claude' },
    }));

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.failureReason === 'SAFETY_REFUSAL'
    );

    assert.strictEqual(geminiMock.callCount, 1);
    assert.strictEqual(anthropicMock.callCount, 0);
  });

  it('10. DEEP_CONTEXT Anthropic -> Gemini fallback', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const executionSequence: string[] = [];

    const anthropicMock = new MockProvider('anthropic', async () => {
      executionSequence.push('anthropic');
      throw new AIProviderError('Anthropic 503 Overloaded', undefined, 'SERVER_ERROR');
    });

    const geminiMock = new MockProvider('gemini', async () => {
      executionSequence.push('gemini');
      return {
        data: { success: true, provider: 'gemini-fallback' },
        metadata: { model: 'gemini-pro' },
      };
    });

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(result.data.provider, 'gemini-fallback');
    assert.deepStrictEqual(executionSequence, ['anthropic', 'gemini']);
    assert.strictEqual(anthropicMock.callCount, 1);
    assert.strictEqual(geminiMock.callCount, 1);
  });

  it('11. Maximum attempts remain 2', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const anthropicMock = new MockProvider('anthropic', async () => {
      throw new AIProviderError('Anthropic Network Fail', undefined, 'NETWORK_ERROR');
    });
    const geminiMock = new MockProvider('gemini', async () => {
      throw new AIProviderError('Gemini Network Fail', undefined, 'NETWORK_ERROR');
    });

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT }),
      (err: Error) => err instanceof AIFallbackExecutionError
    );

    assert.strictEqual(anthropicMock.callCount, 1);
    assert.strictEqual(geminiMock.callCount, 1);
  });

  it('12. Injected custom provider bypasses AIRouter provider selection', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const customPrimary = new MockProvider('custom-primary', async () => ({
      data: { success: true, provider: 'custom-primary' },
      metadata: { model: 'custom-model' },
    }));

    const service = new AIService(customPrimary);
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(result.data.provider, 'custom-primary');
    assert.strictEqual(customPrimary.callCount, 1);
  });

  it('13. Injected custom fallback semantics remain intact', async () => {
    const customPrimary = new MockProvider('custom-primary', async () => {
      throw new AIProviderError('Primary failed', undefined, 'SERVER_ERROR');
    });
    const customFallback = new MockProvider('custom-fallback', async () => ({
      data: { success: true, provider: 'custom-fallback' },
      metadata: { model: 'fallback-model' },
    }));

    const service = new AIService(customPrimary, customFallback);
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

    assert.strictEqual(result.data.provider, 'custom-fallback');
    assert.strictEqual(customPrimary.callCount, 1);
    assert.strictEqual(customFallback.callCount, 1);
  });

  it('14. Model resolution remains provider-owned', async () => {
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    let resolvedModelName = '';

    const geminiMock = new MockProvider('gemini', async () => ({
      data: { success: true, provider: 'gemini' },
      metadata: { model: 'gemini-flash' },
    }));
    geminiMock.getModelForTier = (tier: AIModelTier) => {
      resolvedModelName = `custom-gemini-tier-${tier}`;
      return resolvedModelName;
    };

    registerMockProvider('gemini', geminiMock);
    registerMockProvider('anthropic', new MockProvider('anthropic', async () => ({} as any)));

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.strictEqual(resolvedModelName, 'custom-gemini-tier-FAST_JSON');
  });

  it('15. Routing failure never enters fallback', async () => {
    aiConfig.anthropic.apiKey = '';
    aiConfig.gemini.apiKey = '';

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: Error) => {
        return err instanceof AIConfigurationError && !(err instanceof AIFallbackExecutionError);
      }
    );
  });

  it('16. Cumulative timeout budget remains bounded', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const anthropicMock = new MockProvider('anthropic', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      throw new AIProviderError('Timeout near limit', undefined, 'TIMEOUT_ERROR');
    });

    const geminiMock = new MockProvider('gemini', async () => ({
      data: { success: true, provider: 'gemini' },
      metadata: { model: 'gemini' },
    }));

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    await assert.rejects(
      async () => service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT, timeoutMs: 10 }),
      (err: any) => err instanceof AIProviderError && err.failureReason === 'TIMEOUT_ERROR'
    );

    assert.strictEqual(anthropicMock.callCount, 1);
    assert.strictEqual(geminiMock.callCount, 0);
  });

  it('17. Domain-facing return contract unchanged', async () => {
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = '';

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { success: true, provider: 'anthropic' },
      metadata: { model: 'claude-3-haiku' },
    }));
    registerMockProvider('anthropic', anthropicMock);

    const service = new AIService();
    const result = await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.ok('data' in result);
    assert.ok('metadata' in result);
    assert.strictEqual(typeof result.metadata.executionId, 'string');
    assert.strictEqual(typeof result.metadata.durationMs, 'number');
  });

  it('18. AIRouter remains deterministic', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const callOrder: string[] = [];

    const geminiMock = new MockProvider('gemini', async () => {
      callOrder.push('gemini');
      return { data: { success: true }, metadata: { model: 'gemini-model' } };
    });
    const anthropicMock = new MockProvider('anthropic', async () => {
      callOrder.push('anthropic');
      return { data: { success: true }, metadata: { model: 'anthropic-model' } };
    });

    registerMockProvider('anthropic', anthropicMock);
    registerMockProvider('gemini', geminiMock);

    const service = new AIService();
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });
    await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.FAST_JSON });

    assert.deepStrictEqual(callOrder, ['gemini', 'gemini', 'gemini']);
  });

  it('19. Router does not construct unused alternate provider on success', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    let geminiConstructed = false;

    const anthropicMock = new MockProvider('anthropic', async () => ({
      data: { success: true, provider: 'anthropic' },
      metadata: { model: 'anthropic-model' },
    }));

    registerMockProvider('anthropic', anthropicMock);

    const origGetProvider = AIProviderFactory.getProvider;
    AIProviderFactory.getProvider = (name?: string) => {
      if (name === 'gemini') {
        geminiConstructed = true;
      }
      return origGetProvider.call(AIProviderFactory, name);
    };

    try {
      const service = new AIService();
      await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });

      assert.strictEqual(anthropicMock.callCount, 1);
      assert.strictEqual(geminiConstructed, false);
    } finally {
      AIProviderFactory.getProvider = origGetProvider;
    }
  });

  it('20. Phase 22 fallback eligibility unchanged', async () => {
    aiConfig.provider = 'anthropic';
    aiConfig.anthropic.apiKey = 'valid-anthropic-key';
    aiConfig.gemini.apiKey = 'valid-gemini-key';

    const testCases: { reason: string; shouldFallback: boolean }[] = [
      { reason: 'SERVER_ERROR', shouldFallback: true },
      { reason: 'RATE_LIMIT_ERROR', shouldFallback: true },
      { reason: 'NETWORK_ERROR', shouldFallback: true },
      { reason: 'SAFETY_REFUSAL', shouldFallback: false },
      { reason: 'MAX_TOKENS_TRUNCATION', shouldFallback: false },
    ];

    for (const tc of testCases) {
      let fallbackExecuted = false;

      const anthropicMock = new MockProvider('anthropic', async () => {
        throw new AIProviderError(`Anthropic error ${tc.reason}`, undefined, tc.reason as any);
      });
      const geminiMock = new MockProvider('gemini', async () => {
        fallbackExecuted = true;
        return { data: { success: true }, metadata: { model: 'gemini-model' } };
      });

      AIProviderFactory.clearCache();
      registerMockProvider('anthropic', anthropicMock);
      registerMockProvider('gemini', geminiMock);

      const service = new AIService();

      try {
        await service.generateStructuredData(dummyTemplate, testSchema, { tier: AIModelTier.DEEP_CONTEXT });
      } catch {
        // Expected
      }

      assert.strictEqual(
        fallbackExecuted,
        tc.shouldFallback,
        `Expected fallback execution for ${tc.reason} to be ${tc.shouldFallback}`
      );
    }
  });
});
