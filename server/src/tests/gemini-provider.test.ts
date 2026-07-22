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
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.message, 'ok');
  });

  it('B: STOP response containing markdown JSON fences strips fences and succeeds', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '```json\n{"success":true}\n```' }] } }],
    }));

    const result = await provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON });
    assert.strictEqual(result.success, true);
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
    assert.strictEqual(result.success, true);
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
    assert.strictEqual(result.success, true);
  });

  // --- 2. Safety / Termination Tests ---
  it('E: promptFeedback.blockReason present throws AIProviderError without parsing', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      promptFeedback: { blockReason: 'SAFETY' },
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{malformed' }] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('prompt was blocked')
    );
  });

  it('F: Zero response candidates throws AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({ candidates: [] }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('no response candidates')
    );
  });

  it('G: finishReason SAFETY throws AIProviderError without parsing', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: '{bad' }] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('finishReason: SAFETY')
    );
  });

  it('H: finishReason RECITATION throws AIProviderError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'RECITATION' }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('finishReason: RECITATION')
    );
  });

  it('I: finishReason MAX_TOKENS throws AIProviderError with truncation semantics before JSON parsing', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"truncated_json":' }] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('max_tokens limit')
    );
  });

  it('J: Arbitrary unknown non-STOP finishReason throws AIProviderError (ONLY STOP succeeds)', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => ({
      candidates: [{ finishReason: 'FUTURE_REASON_XYZ' }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('finishReason: FUTURE_REASON_XYZ')
    );
  });

  // --- 3. Text Extraction / Parsing Tests ---
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
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{invalid json' }] } }],
    }));

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message.includes('Failed to parse JSON response')
    );
  });

  // --- 4. Timeout & Cancellation Tests ---
  it('M: Pending generateContent beyond timeoutMs triggers AbortController and throws AITimeoutError', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async (params: any) => {
      return new Promise((_, reject) => {
        params.config.abortSignal.addEventListener('abort', () => {
          reject(new Error('AbortError'));
        });
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
    assert.strictEqual(result.success, true);
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
      const err: any = new Error('Quota Exceeded');
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

  it('W: Pre-normalized AI errors are preserved as-is', async () => {
    const provider = new GeminiProvider();
    setMockGenerateContent(provider, async () => {
      throw new AIProviderError('Already normalized error');
    });

    await assert.rejects(
      () => provider.generateStructured('prompt', testSchema, { tier: AIModelTier.FAST_JSON }),
      (err: any) => err instanceof AIProviderError && err.message === 'Already normalized error'
    );
  });

  // --- 6. Request Construction & Model Tier Tests ---
  it('X: Sends correct model, contents, responseMimeType, responseSchema, and abortSignal in payload', async () => {
    const provider = new GeminiProvider();
    let capturedPayload: any = null;

    setMockGenerateContent(provider, async (params: any) => {
      capturedPayload = params;
      return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"success":true}' }] } }] };
    });

    await provider.generateStructured('Test Prompt Content', testSchema, { tier: AIModelTier.FAST_JSON });

    assert.ok(capturedPayload, 'Payload captured');
    assert.strictEqual(capturedPayload.contents, 'Test Prompt Content');
    assert.strictEqual(capturedPayload.config.responseMimeType, 'application/json');
    assert.ok(capturedPayload.config.responseSchema, 'responseSchema present');
    assert.ok(capturedPayload.config.abortSignal, 'abortSignal present');
  });

  it('Y: FAST_JSON tier resolves aiConfig.gemini.models.fastJson model identifier', async () => {
    const provider = new GeminiProvider();
    let capturedModel: string = '';

    setMockGenerateContent(provider, async (params: any) => {
      capturedModel = params.model;
      return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"success":true}' }] } }] };
    });

    await provider.generateStructured('Prompt', testSchema, { tier: AIModelTier.FAST_JSON });
    assert.strictEqual(capturedModel, aiConfig.gemini.models.fastJson);
  });

  it('Z: DEEP_CONTEXT tier resolves aiConfig.gemini.models.deepContext model identifier', async () => {
    const provider = new GeminiProvider();
    let capturedModel: string = '';

    setMockGenerateContent(provider, async (params: any) => {
      capturedModel = params.model;
      return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"success":true}' }] } }] };
    });

    await provider.generateStructured('Prompt', testSchema, { tier: AIModelTier.DEEP_CONTEXT });
    assert.strictEqual(capturedModel, aiConfig.gemini.models.deepContext);
  });

  // --- 7. Factory Registration & Credential Isolation Tests ---
  it('AA: AIProviderFactory.getProvider("gemini") resolves GeminiProvider instance', () => {
    const provider = AIProviderFactory.getProvider('gemini');
    assert.strictEqual(provider.constructor.name, 'GeminiProvider');
  });

  it('BB: Anthropic provider resolution does NOT require GEMINI_API_KEY', () => {
    delete process.env.GEMINI_API_KEY;
    aiConfig.gemini.apiKey = '';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    aiConfig.anthropic.apiKey = 'test-anthropic-key';

    const provider = AIProviderFactory.getProvider('anthropic');
    assert.strictEqual(provider.constructor.name, 'AnthropicProvider');
  });

  it('CC: Gemini provider resolution throws AIConfigurationError when GEMINI_API_KEY is missing', () => {
    delete process.env.GEMINI_API_KEY;
    aiConfig.gemini.apiKey = '';

    assert.throws(
      () => AIProviderFactory.getProvider('gemini'),
      (err: any) => err instanceof AIConfigurationError && err.message.includes('Gemini API key is missing')
    );
  });
});
