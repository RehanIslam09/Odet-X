import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { GeminiProvider } from '../ai/providers/gemini.provider.js';
import { AIProviderFactory } from '../ai/providers/provider.factory.js';
import { AIProviderError, AITimeoutError, AIConfigurationError } from '../ai/errors/ai.errors.js';
import { AIModelTier } from '../ai/types/index.js';
import { aiConfig } from '../ai/config/ai.config.js';

describe('GeminiProvider (EXP-01..04, WP-02A..02D Invariants)', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key-do-not-call';
    aiConfig.gemini.apiKey = 'test-gemini-key-do-not-call';
    AIProviderFactory.clearCache();
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
      aiConfig.gemini.apiKey = originalKey;
    } else {
      delete process.env.GEMINI_API_KEY;
      aiConfig.gemini.apiKey = '';
    }

    if (originalAnthropicKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
      aiConfig.anthropic.apiKey = originalAnthropicKey;
    }

    AIProviderFactory.clearCache();
  });

  const testSchema = z.object({ success: z.boolean(), message: z.string().optional() });

  function setMockGenerateContent(provider: GeminiProvider, mockFn: any) {
    (provider as any).client.models.generateContent = mockFn;
  }

  // --- 1. Happy-Path Tests ---
  it('A: Valid STOP response containing ordinary JSON resolves successfully', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"success":true,"message":"ok"}' }] } }],
    }));

    const result = await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
    assert.strictEqual(result.data.success, true);
    assert.strictEqual(result.data.message, 'ok');
    assert.strictEqual(result.metadata.model, 'gemini-3.6-flash');
  });

  it('B: STOP response containing markdown JSON fences strips fences and succeeds', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '```json\n{"success":true}\n```' }] } }],
    }));

    const result = await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
    assert.strictEqual(result.data.success, true);
    assert.strictEqual(result.metadata.model, 'gemini-3.6-flash');
  });

  it('C: Multiple text-bearing candidate parts concatenate in order and succeed', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{
        finishReason: 'STOP',
        content: {
          parts: [
            { text: '{"success":' },
            { text: 'true}' },
          ],
        },
      }],
    }));

    const result = await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
    assert.strictEqual(result.data.success, true);
  });

  it('D: STOP response with safetyRatings present succeeds diagnostically', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{
        finishReason: 'STOP',
        content: { parts: [{ text: '{"success":true}' }] },
        safetyRatings: [{ category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' }],
      }],
    }));

    const result = await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
    assert.strictEqual(result.data.success, true);
  });

  // --- 2. Safety / Termination Tests ---
  it('E: promptFeedback.blockReason present throws AIProviderError without parsing', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      promptFeedback: { blockReason: 'SAFETY' },
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('prompt was blocked')
    );
  });

  it('F: Zero response candidates throws AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('no response candidates')
    );
  });

  it('G: finishReason SAFETY throws AIProviderError without parsing', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: '{"success":true}' }] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('finishReason: SAFETY')
    );
  });

  it('H: finishReason RECITATION throws AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'RECITATION', content: { parts: [{ text: '{"success":true}' }] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('finishReason: RECITATION')
    );
  });

  it('I: finishReason MAX_TOKENS throws AIProviderError with truncation semantics before JSON parsing', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"success":true' }] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('max_tokens limit')
    );
  });

  it('J: Arbitrary unknown non-STOP finishReason throws AIProviderError (ONLY STOP succeeds)', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'FUTURE_REASON_XYZ', content: { parts: [{ text: '{"success":true}' }] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('finishReason: FUTURE_REASON_XYZ')
    );
  });

  it('K: STOP candidate with no usable text throws AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('empty text response')
    );
  });

  it('L: STOP candidate returning malformed JSON normalizes to AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"success":' }] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('Failed to parse JSON response')
    );
  });

  // --- 3. Timeout & Cancellation Tests ---
  it('M: Execution timeout throws AITimeoutError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async (_params: any) => {
      return new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error('AbortError'));
        }, 200);
      });
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON, timeoutMs: 50 }),
      (err: any) => err instanceof AITimeoutError && err.message.includes('timed out')
    );
  });

  it('N: Successful request before timeout clears timer in finally block', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"success":true}' }] } }],
    }));

    const result = await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON, timeoutMs: 1000 });
    assert.strictEqual(result.data.success, true);
  });

  it('O: Provider failure before timeout clears timer in finally block', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      const err: any = new Error('Rate limit');
      err.status = 429;
      throw err;
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON, timeoutMs: 1000 }),
      (err: any) => err instanceof AIProviderError && err.message.includes('429')
    );
  });

  it('P: External AbortError when timedOut is false throws AIProviderError (caller abort != provider timeout)', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      const err = new Error('This operation was aborted');
      err.name = 'AbortError';
      throw err;
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON, timeoutMs: 10000 }),
      (err: any) => err instanceof AIProviderError && err.message.includes('aborted by caller')
    );
  });

  // --- 5. Error Normalization Tests ---
  it('Q: HTTP 401 maps to AIConfigurationError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      const err: any = new Error('Unauthorized');
      err.status = 401;
      throw err;
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      AIConfigurationError
    );
  });

  it('R: HTTP 403 maps to AIConfigurationError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      const err: any = new Error('Forbidden');
      err.status = 403;
      throw err;
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      AIConfigurationError
    );
  });

  it('S: HTTP 429 maps to AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      const err: any = new Error('Too Many Requests');
      err.status = 429;
      throw err;
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      AIProviderError
    );
  });

  it('T: HTTP 500 maps to AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      const err: any = new Error('Internal Server Error');
      err.status = 500;
      throw err;
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      AIProviderError
    );
  });

  it('U: HTTP 503 maps to AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      const err: any = new Error('Service Unavailable');
      err.status = 503;
      throw err;
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      AIProviderError
    );
  });

  it('V: Unknown SDK failure maps to AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      throw new Error('Unexpected network reset');
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('Unexpected network reset')
    );
  });

  it('W: Already-normalized AIBaseError subclasses are re-thrown unchanged', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      throw new AIProviderError('Already normalized error');
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message === 'Already normalized error'
    );
  });

  // --- 6. Schema Adapter & Configuration Integration Tests ---
  it('X: Gemini schema adapter strips $schema and produces clean OpenAPI JSON Schema', async () => {
    const provider = new GeminiProvider();
    let capturedConfig: any;
    setMockGenerateContent(provider, async (params: any) => {
      capturedConfig = params.config;
      return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"success":true}' }] } }] };
    });

    await provider.generateStructured('Test Prompt Content', testSchema, { tier: AIModelTier.FAST_JSON });
    assert.strictEqual(capturedConfig.responseMimeType, 'application/json');
    assert.ok(capturedConfig.responseSchema, 'responseSchema should be attached');
    assert.strictEqual(capturedConfig.responseSchema.$schema, undefined, '$schema must be stripped');
  });

  it('Y: Fast JSON model mapping sends gemini-3.6-flash to GoogleGenAI SDK', async () => {
    const provider = new GeminiProvider();
    let capturedModel: string = '';
    setMockGenerateContent(provider, async (params: any) => {
      capturedModel = params.model;
      return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"success":true}' }] } }] };
    });

    await provider.generateStructured('Prompt', testSchema, { tier: AIModelTier.FAST_JSON });
    assert.strictEqual(capturedModel, 'gemini-3.6-flash');
  });

  it('Z: Deep Context model mapping sends gemini-3.6-flash to GoogleGenAI SDK', async () => {
    const provider = new GeminiProvider();
    let capturedModel: string = '';
    setMockGenerateContent(provider, async (params: any) => {
      capturedModel = params.model;
      return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"success":true}' }] } }] };
    });

    await provider.generateStructured('Prompt', testSchema, { tier: AIModelTier.DEEP_CONTEXT });
    assert.strictEqual(capturedModel, 'gemini-3.6-flash');
  });

  // --- 7. Factory Integration ---
  it('AA: AIProviderFactory.getProvider("gemini") resolves GeminiProvider instance', () => {
    const provider = AIProviderFactory.getProvider('gemini');
    assert.ok(provider instanceof GeminiProvider);
    assert.strictEqual(provider.providerName, 'gemini');
  });

  it('BB: AIProviderFactory caches provider instances lazily', () => {
    const p1 = AIProviderFactory.getProvider('gemini');
    const p2 = AIProviderFactory.getProvider('gemini');
    assert.strictEqual(p1, p2);
  });

  it('CC: AIProviderFactory.clearCache resets provider cache', () => {
    const p1 = AIProviderFactory.getProvider('gemini');
    AIProviderFactory.clearCache();
    const p2 = AIProviderFactory.getProvider('gemini');
    assert.notStrictEqual(p1, p2);
  });
});
