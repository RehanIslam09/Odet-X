import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { AIService } from '../ai/ai.service.js';
import { AIProvider } from '../ai/providers/base.provider.js';
import { AnthropicProvider } from '../ai/providers/anthropic.provider.js';
import { GeminiProvider } from '../ai/providers/gemini.provider.js';
import { PromptTemplate } from '../ai/prompts/types.js';
import { aiLogger } from '../ai/utils/logger.js';
import {
  AIModelTier,
  AITelemetryEvent,
  AIProviderResponse,
} from '../ai/types/index.js';
import {
  AIProviderError,
  AITimeoutError,
  AIConfigurationError,
  AIValidationError,
} from '../ai/errors/ai.errors.js';
import { aiConfig } from '../ai/config/ai.config.js';

class MockTelemetryProvider implements AIProvider {
  public readonly providerName: string;
  private fastModel: string;
  private deepModel: string;
  private responseHandler?: ((prompt: string) => Promise<AIProviderResponse<any>>) | undefined;

  constructor(
    providerName = 'mock-telemetry-provider',
    fastModel = 'mock-fast-v1',
    deepModel = 'mock-deep-v1',
    responseHandler?: ((prompt: string) => Promise<AIProviderResponse<any>>) | undefined
  ) {
    this.providerName = providerName;
    this.fastModel = fastModel;
    this.deepModel = deepModel;
    this.responseHandler = responseHandler;
  }

  public getModelForTier(tier: AIModelTier): string {
    return tier === AIModelTier.DEEP_CONTEXT ? this.deepModel : this.fastModel;
  }

  public async generateStructured<T>(
    prompt: string,
    _schema: any,
    _options: any
  ): Promise<AIProviderResponse<T>> {
    if (this.responseHandler) {
      return this.responseHandler(prompt);
    }

    return {
      data: { status: 'ok', generated: true } as T,
      metadata: {
        model: this.getModelForTier(_options.tier),
        usage: {
          inputTokens: 15,
          outputTokens: 10,
          totalTokens: 25,
        },
      },
    };
  }
}

describe('Phase 21 AI Observability & Usage Intelligence Tests', () => {
  const sampleTemplate: PromptTemplate = {
    metadata: { name: 'test-capability', version: '1.2.3', description: 'Test prompt description' },
    sections: [
      { identifier: 'system', content: 'System instruction context' },
      { identifier: 'intent', content: 'User intent content' },
    ],
  };

  const sampleSchema = z.object({ status: z.string(), generated: z.boolean() });
  const standardOptions = { tier: AIModelTier.FAST_JSON as const };

  beforeEach(() => {
    aiLogger.clearListeners();
  });

  afterEach(() => {
    aiLogger.clearListeners();
  });

  // --- 1. Success Telemetry Emission Test ---
  it('Success Path: Emits exactly one complete AITelemetryEvent with valid metadata & token counts', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const provider = new MockTelemetryProvider();
    const service = new AIService(provider);

    const result = await service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions);

    assert.strictEqual(result.data.status, 'ok');
    assert.strictEqual(events.length, 1, 'Should emit exactly one telemetry event');

    const event = events[0]!;
    assert.ok(event.executionId, 'executionId must be present');
    assert.strictEqual(typeof event.executionId, 'string');
    assert.ok(event.timestamp, 'timestamp must be present');
    assert.strictEqual(event.provider, 'mock-telemetry-provider');
    assert.strictEqual(event.tier, AIModelTier.FAST_JSON);
    assert.strictEqual(event.model, 'mock-fast-v1');
    assert.strictEqual(event.promptName, 'test-capability');
    assert.strictEqual(event.promptVersion, '1.2.3');
    assert.strictEqual(typeof event.durationMs, 'number');
    assert.ok(event.durationMs >= 0);
    assert.strictEqual(event.success, true);
    assert.deepStrictEqual(event.usage, { inputTokens: 15, outputTokens: 10, totalTokens: 25 });
    assert.strictEqual(event.errorType, undefined);
    assert.strictEqual(event.errorCategory, undefined);
    assert.strictEqual(event.errorMessage, undefined);
  });

  // --- 2. Execution ID Uniqueness Test ---
  it('Correlation Identity: Consecutive executions generate unique executionId values', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const service = new AIService(new MockTelemetryProvider());

    await service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions);
    await service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions);

    assert.strictEqual(events.length, 2);
    assert.notStrictEqual(events[0]!.executionId, events[1]!.executionId);
  });

  // --- 3. Provider Identity Test ---
  it('Provider Identity: Telemetry provider matches executing provider instance providerName regardless of global config', async () => {
    const originalConfigProvider = aiConfig.provider;
    aiConfig.provider = 'anthropic'; // Set global config to something different

    try {
      const events: AITelemetryEvent[] = [];
      aiLogger.onTelemetry((e) => events.push(e));

      const customProvider = new MockTelemetryProvider('custom-test-provider');
      const service = new AIService(customProvider);

      await service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions);

      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0]!.provider, 'custom-test-provider');
    } finally {
      aiConfig.provider = originalConfigProvider;
    }
  });

  // --- 4. Failure Path Model Resolution Test ---
  it('Failure Model Resolution: Model is resolved via getModelForTier even when provider throws before returning envelope', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const provider = new MockTelemetryProvider('failing-provider', 'fast-model-v99', 'deep-model-v99', async () => {
      throw new AIProviderError('Provider connection failed');
    });

    const service = new AIService(provider);

    await assert.rejects(
      () => service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions),
      AIProviderError
    );

    assert.strictEqual(events.length, 1);
    const event = events[0]!;
    assert.strictEqual(event.success, false);
    assert.strictEqual(event.provider, 'failing-provider');
    assert.strictEqual(event.model, 'fast-model-v99');
    assert.strictEqual(event.errorCategory, 'PROVIDER_ERROR');
    assert.strictEqual(event.usage, undefined, 'Usage must be undefined on provider failure');
  });

  // --- 5. Zod Validation Failure Usage Retention Test ---
  it('Zod Validation Failure: Retains provider-reported token usage when schema validation fails', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const provider = new MockTelemetryProvider('validation-provider', 'fast-v1', 'deep-v1', async () => ({
      data: { invalidField: 123 }, // Fails sampleSchema validation
      metadata: {
        model: 'fast-v1',
        usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
      },
    }));

    const service = new AIService(provider);

    await assert.rejects(
      () => service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions),
      AIValidationError
    );

    assert.strictEqual(events.length, 1);
    const event = events[0]!;
    assert.strictEqual(event.success, false);
    assert.strictEqual(event.errorCategory, 'VALIDATION_ERROR');
    assert.strictEqual(event.errorMessage, 'AI response failed validation');
    assert.deepStrictEqual(event.usage, { inputTokens: 100, outputTokens: 20, totalTokens: 120 });
  });

  // --- 6. Timeout Failure Telemetry Test ---
  it('Timeout Failure: Emits TIMEOUT_ERROR, usage undefined, and preserves original AITimeoutError instance', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const expectedError = new AITimeoutError('Configured timeout exceeded');
    const provider = new MockTelemetryProvider('timeout-provider', 'fast-v1', 'deep-v1', async () => {
      throw expectedError;
    });

    const service = new AIService(provider);

    await assert.rejects(
      () => service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions),
      (err: any) => err === expectedError
    );

    assert.strictEqual(events.length, 1);
    const event = events[0]!;
    assert.strictEqual(event.success, false);
    assert.strictEqual(event.errorCategory, 'TIMEOUT_ERROR');
    assert.strictEqual(event.errorMessage, 'AI request timed out');
    assert.strictEqual(event.usage, undefined);
  });

  // --- 7. Configuration Failure Telemetry Test ---
  it('Configuration Failure: Emits CONFIGURATION_ERROR with usage undefined', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const provider = new MockTelemetryProvider('config-provider', 'fast-v1', 'deep-v1', async () => {
      throw new AIConfigurationError('Missing API key');
    });

    const service = new AIService(provider);

    await assert.rejects(
      () => service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions),
      AIConfigurationError
    );

    assert.strictEqual(events.length, 1);
    const event = events[0]!;
    assert.strictEqual(event.success, false);
    assert.strictEqual(event.errorCategory, 'CONFIGURATION_ERROR');
    assert.strictEqual(event.errorMessage, 'AI provider configuration error');
    assert.strictEqual(event.usage, undefined);
  });

  // --- 8. Unknown Error Privacy & Telemetry Test ---
  it('Unknown Error Privacy: Emits UNKNOWN_ERROR and sanitizes raw sensitive error messages', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const provider = new MockTelemetryProvider('unknown-provider', 'fast-v1', 'deep-v1', async () => {
      throw new Error('HIGHLY_SENSITIVE_TEST_SENTINEL_12345');
    });

    const service = new AIService(provider);

    await assert.rejects(
      () => service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions),
      /Unexpected failure in AIService: HIGHLY_SENSITIVE_TEST_SENTINEL_12345/
    );

    assert.strictEqual(events.length, 1);
    const event = events[0]!;
    assert.strictEqual(event.success, false);
    assert.strictEqual(event.errorCategory, 'UNKNOWN_ERROR');
    assert.strictEqual(event.errorMessage, 'Unknown AI execution error');

    const serialized = JSON.stringify(event);
    assert.strictEqual(
      serialized.includes('HIGHLY_SENSITIVE_TEST_SENTINEL_12345'),
      false,
      'Sensitive sentinel must not leak into telemetry JSON'
    );
  });

  // --- 9. Comprehensive Error Message Privacy Test ---
  it('Privacy Boundary: Telemetry event excludes raw provider output, API keys, and secret sentinels', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const provider = new MockTelemetryProvider('privacy-provider', 'fast-v1', 'deep-v1', async () => {
      throw new AIProviderError(
        'RAW_MODEL_OUTPUT_SECRET_123 PROJECT_DESCRIPTION_SECRET_456 API_KEY_SECRET_789'
      );
    });

    const service = new AIService(provider);

    await assert.rejects(
      () => service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions),
      AIProviderError
    );

    assert.strictEqual(events.length, 1);
    const event = events[0]!;
    const serialized = JSON.stringify(event);

    assert.strictEqual(serialized.includes('RAW_MODEL_OUTPUT_SECRET_123'), false);
    assert.strictEqual(serialized.includes('PROJECT_DESCRIPTION_SECRET_456'), false);
    assert.strictEqual(serialized.includes('API_KEY_SECRET_789'), false);
    assert.strictEqual(event.errorMessage, 'AI provider execution error');
  });

  // --- 10. Prompt Content Privacy Test ---
  it('Privacy Boundary: Telemetry event excludes prompt text and dynamic context sentinels', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const sensitiveTemplate: PromptTemplate = {
      metadata: { name: 'sensitive-template', version: '2.0.0', description: 'desc' },
      sections: [
        { identifier: 'system', content: 'System instruction context' },
        { identifier: 'context', content: 'PROMPT_SECRET_123456' },
        { identifier: 'intent', content: 'PROJECT_SECRET_654321' },
      ],
    };

    const service = new AIService(new MockTelemetryProvider());
    await service.generateStructuredData(sensitiveTemplate, sampleSchema, standardOptions);

    assert.strictEqual(events.length, 1);
    const event = events[0]!;
    const serialized = JSON.stringify(event);

    assert.strictEqual(serialized.includes('PROMPT_SECRET_123456'), false);
    assert.strictEqual(serialized.includes('PROJECT_SECRET_654321'), false);
    assert.strictEqual(event.promptName, 'sensitive-template');
    assert.strictEqual(event.promptVersion, '2.0.0');
  });

  // --- 11. Generated Response Payload Privacy Test ---
  it('Privacy Boundary: Telemetry event excludes generated domain response payload data', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));

    const provider = new MockTelemetryProvider('payload-provider', 'fast-v1', 'deep-v1', async () => ({
      data: { status: 'ok', generated: true, secretContent: 'GENERATED_SECRET_ABC' },
      metadata: { model: 'fast-v1', usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 } },
    }));

    const dynamicSchema = z.object({ status: z.string(), generated: z.boolean(), secretContent: z.string() });
    const service = new AIService(provider);

    const result = await service.generateStructuredData(sampleTemplate, dynamicSchema, standardOptions);
    assert.strictEqual(result.data.secretContent, 'GENERATED_SECRET_ABC');

    assert.strictEqual(events.length, 1);
    const event = events[0]!;
    const serialized = JSON.stringify(event);
    assert.strictEqual(serialized.includes('GENERATED_SECRET_ABC'), false);
  });

  // --- 12. Listener Failure Isolation Test ---
  it('Observer Isolation: Throwing telemetry listener does NOT alter AI execution result or block other listeners', async () => {
    const receivedEvents: AITelemetryEvent[] = [];

    // Listener A throws an error
    aiLogger.onTelemetry(() => {
      throw new Error('Broken listener failure');
    });

    // Listener B records events normally
    aiLogger.onTelemetry((e) => {
      receivedEvents.push(e);
    });

    const originalConsoleError = console.error;
    let consoleErrorCalled = false;
    console.error = (..._args: any[]) => {
      consoleErrorCalled = true;
    };

    try {
      const service = new AIService(new MockTelemetryProvider());
      const result = await service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions);

      assert.strictEqual(result.data.status, 'ok');
      assert.strictEqual(receivedEvents.length, 1, 'Listener B should receive event despite Listener A throwing');
      assert.strictEqual(consoleErrorCalled, true, 'Listener failure should be logged to console.error');
    } finally {
      console.error = originalConsoleError;
    }
  });

  // --- 13. Listener Removal Test ---
  it('Observer Lifecycle: offTelemetry successfully unregisters a listener', async () => {
    const events: AITelemetryEvent[] = [];
    const listener = (e: AITelemetryEvent) => events.push(e);

    aiLogger.onTelemetry(listener);
    aiLogger.offTelemetry(listener);

    const service = new AIService(new MockTelemetryProvider());
    await service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions);

    assert.strictEqual(events.length, 0);
  });

  // --- 14. Clear Listeners Test ---
  it('Observer Lifecycle: clearListeners removes all registered telemetry observers', async () => {
    const events: AITelemetryEvent[] = [];
    aiLogger.onTelemetry((e) => events.push(e));
    aiLogger.onTelemetry((e) => events.push(e));

    aiLogger.clearListeners();

    const service = new AIService(new MockTelemetryProvider());
    await service.generateStructuredData(sampleTemplate, sampleSchema, standardOptions);

    assert.strictEqual(events.length, 0);
  });

  // --- 15. Anthropic Provider Token Usage Unit Tests ---
  it('Anthropic Token Extraction: Extracts valid token usage without fabrication', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    aiConfig.anthropic.apiKey = 'test-key';

    try {
      const provider = new AnthropicProvider();

      // Mock messages.create
      (provider as any).client.messages.create = async () => ({
        content: [{ type: 'text', text: '{"status":"ok","generated":true}' }],
        usage: { input_tokens: 42, output_tokens: 18 },
      });

      const response = await provider.generateStructured('prompt', sampleSchema, standardOptions);

      assert.strictEqual(response.data.status, 'ok');
      assert.deepStrictEqual(response.metadata.usage, {
        inputTokens: 42,
        outputTokens: 18,
        totalTokens: 60,
      });

      // Test explicit zero
      (provider as any).client.messages.create = async () => ({
        content: [{ type: 'text', text: '{"status":"ok","generated":true}' }],
        usage: { input_tokens: 0, output_tokens: 0 },
      });

      const responseZero = await provider.generateStructured('prompt', sampleSchema, standardOptions);
      assert.deepStrictEqual(responseZero.metadata.usage, {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });

      // Test missing usage yields undefined (UNKNOWN != ZERO)
      (provider as any).client.messages.create = async () => ({
        content: [{ type: 'text', text: '{"status":"ok","generated":true}' }],
        usage: undefined,
      });

      const responseMissing = await provider.generateStructured('prompt', sampleSchema, standardOptions);
      assert.strictEqual(responseMissing.metadata.usage, undefined);
    } finally {
      if (originalKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalKey;
        aiConfig.anthropic.apiKey = originalKey;
      }
    }
  });

  // --- 16. Gemini Provider Token Usage Unit Tests ---
  it('Gemini Token Extraction: Extracts valid usageMetadata and handles derived totalTokenCount without fabrication', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key';
    aiConfig.gemini.apiKey = 'test-key';

    try {
      const provider = new GeminiProvider();

      // Test 1: Full usageMetadata provided
      (provider as any).client.models.generateContent = async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"status":"ok","generated":true}' }] } }],
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 25, totalTokenCount: 75 },
      });

      const res1 = await provider.generateStructured('prompt', sampleSchema, standardOptions);
      assert.deepStrictEqual(res1.metadata.usage, {
        inputTokens: 50,
        outputTokens: 25,
        totalTokens: 75,
      });

      // Test 2: Missing totalTokenCount mathematically derived from promptTokenCount + candidatesTokenCount
      (provider as any).client.models.generateContent = async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"status":"ok","generated":true}' }] } }],
        usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 10 },
      });

      const res2 = await provider.generateStructured('prompt', sampleSchema, standardOptions);
      assert.deepStrictEqual(res2.metadata.usage, {
        inputTokens: 30,
        outputTokens: 10,
        totalTokens: 40,
      });

      // Test 3: Explicit zero usage metadata
      (provider as any).client.models.generateContent = async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"status":"ok","generated":true}' }] } }],
        usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
      });

      const res3 = await provider.generateStructured('prompt', sampleSchema, standardOptions);
      assert.deepStrictEqual(res3.metadata.usage, {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });

      // Test 4: Incomplete usageMetadata (e.g. promptTokenCount missing) yields undefined (UNKNOWN != ZERO)
      (provider as any).client.models.generateContent = async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"status":"ok","generated":true}' }] } }],
        usageMetadata: { candidatesTokenCount: 15 },
      });

      const res4 = await provider.generateStructured('prompt', sampleSchema, standardOptions);
      assert.strictEqual(res4.metadata.usage, undefined);

      // Test 5: Missing usageMetadata yields undefined
      (provider as any).client.models.generateContent = async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"status":"ok","generated":true}' }] } }],
      });

      const res5 = await provider.generateStructured('prompt', sampleSchema, standardOptions);
      assert.strictEqual(res5.metadata.usage, undefined);
    } finally {
      if (originalKey !== undefined) {
        process.env.GEMINI_API_KEY = originalKey;
        aiConfig.gemini.apiKey = originalKey;
      }
    }
  });
});
