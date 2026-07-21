import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { AIService } from '../ai.service.js';
import { PromptTemplate } from '../prompts/types.js';
import { AIConfigurationError } from '../errors/ai.errors.js';
import { AIModelTier } from '../types/index.js';

// Mocking the provider logic since we are only testing execution lifecycle
class MockProvider {
  async generateStructured(prompt: string, _schema: any, _options: any) {
    if (prompt.includes('fail-provider')) {
      throw new Error('Provider simulated failure');
    }
    if (prompt.includes('empty-response')) {
      return null;
    }
    return { status: 'ok', generated: true };
  }
}

describe('AI Execution Framework', () => {
  const mockTemplate: PromptTemplate = {
    metadata: { name: 'test-exec', version: '1.0', description: 'desc' },
    sections: [
      { identifier: 'system', content: 'You are a test' },
      { identifier: 'intent', content: 'Do test' }
    ]
  };

  const schema = z.object({ status: z.string(), generated: z.boolean() });
  const options = { tier: AIModelTier.FAST_JSON as const };

  it('should successfully execute the lifecycle and return metadata', async () => {
    const aiService = new AIService();
    
    // Inject mock provider
    (aiService as any).provider = new MockProvider();

    const result = await aiService.generateStructuredData(mockTemplate, schema, options);
    
    // Assert Business Data
    assert.strictEqual(result.data.status, 'ok');
    assert.strictEqual(result.data.generated, true);

    // Assert Metadata
    assert.ok(result.metadata.executionId, 'Should generate an executionId');
    assert.strictEqual(result.metadata.promptName, 'test-exec');
    assert.strictEqual(result.metadata.promptVersion, '1.0');
    assert.strictEqual(typeof result.metadata.durationMs, 'number');
    assert.ok(result.metadata.durationMs >= 0, 'Duration should be positive');
  });

  it('should throw an error on empty provider response', async () => {
    const aiService = new AIService();
    (aiService as any).provider = new MockProvider();

    const emptyTemplate: PromptTemplate = {
      ...mockTemplate,
      sections: [...mockTemplate.sections, { identifier: 'intent', content: 'empty-response' }]
    };

    await assert.rejects(
      () => aiService.generateStructuredData(emptyTemplate, schema, options),
      AIConfigurationError
    );
  });

  it('should propagate provider failures securely', async () => {
    const aiService = new AIService();
    (aiService as any).provider = new MockProvider();

    const failTemplate: PromptTemplate = {
      ...mockTemplate,
      sections: [...mockTemplate.sections, { identifier: 'intent', content: 'fail-provider' }]
    };

    await assert.rejects(
      () => aiService.generateStructuredData(failTemplate, schema, options),
      /Unexpected failure in AIService: Provider simulated failure/
    );
  });
});
