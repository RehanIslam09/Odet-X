import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PromptTemplate } from '../prompts/types.js';
import { buildPrompt } from '../prompts/builder/prompt.builder.js';
import { validatePromptTemplate, PromptValidationError } from '../prompts/validation/prompt.validator.js';
import { promptRegistry } from '../prompts/registry/prompt.registry.js';

describe('Prompt Builder', () => {
  it('should deterministically assemble sections and wrap with XML delimiters', () => {
    const template: PromptTemplate = {
      metadata: { name: 'test', version: '1.0', description: 'test' },
      sections: [
        { identifier: 'system', content: 'You are a bot.' },
        { identifier: 'intent', content: 'Say hello.' }
      ]
    };

    const result = buildPrompt(template);
    const expected = '<system>\nYou are a bot.\n</system>\n\n<intent>\nSay hello.\n</intent>';
    
    assert.strictEqual(result, expected);
  });

  it('should ignore empty sections', () => {
    const template: PromptTemplate = {
      metadata: { name: 'test', version: '1.0', description: 'test' },
      sections: [
        { identifier: 'system', content: 'System content.' },
        { identifier: 'context', content: '   ' }, // empty after trim
        { identifier: 'intent', content: 'Intent content.' }
      ]
    };

    const result = buildPrompt(template);
    const expected = '<system>\nSystem content.\n</system>\n\n<intent>\nIntent content.\n</intent>';
    
    assert.strictEqual(result, expected);
  });
});

describe('Prompt Validator', () => {
  it('should throw if required metadata is missing', () => {
    const invalidTemplate = {
      metadata: { name: '', version: '', description: '' },
      sections: [{ identifier: 'system', content: 'valid' }, { identifier: 'intent', content: 'valid' }]
    } as any;

    assert.throws(() => validatePromptTemplate(invalidTemplate), PromptValidationError);
  });

  it('should throw if missing system or intent sections', () => {
    const invalidTemplate: PromptTemplate = {
      metadata: { name: 'test', version: '1.0', description: 'test' },
      sections: [{ identifier: 'system', content: 'valid' }] // missing intent
    };

    assert.throws(() => validatePromptTemplate(invalidTemplate), PromptValidationError);
  });

  it('should throw on duplicate identifiers', () => {
    const invalidTemplate: PromptTemplate = {
      metadata: { name: 'test', version: '1.0', description: 'test' },
      sections: [
        { identifier: 'system', content: 'valid' },
        { identifier: 'intent', content: 'valid' },
        { identifier: 'intent', content: 'duplicate' }
      ]
    };

    assert.throws(() => validatePromptTemplate(invalidTemplate), PromptValidationError);
  });
});

describe('Prompt Registry', () => {
  it('should register and retrieve templates', () => {
    promptRegistry.clear();
    
    const template: PromptTemplate = {
      metadata: { name: 'valid-test', version: '1.0', description: 'test' },
      sections: [
        { identifier: 'system', content: 'test' },
        { identifier: 'intent', content: 'test' }
      ]
    };

    promptRegistry.register(template);
    
    const retrieved = promptRegistry.get('valid-test');
    assert.strictEqual(retrieved.metadata.name, 'valid-test');
    
    const list = promptRegistry.list();
    assert.strictEqual(list.length, 1);
  });

  it('should prevent duplicate registration', () => {
    promptRegistry.clear();
    
    const template: PromptTemplate = {
      metadata: { name: 'dup-test', version: '1.0', description: 'test' },
      sections: [
        { identifier: 'system', content: 'test' },
        { identifier: 'intent', content: 'test' }
      ]
    };

    promptRegistry.register(template);
    assert.throws(() => promptRegistry.register(template), PromptValidationError);
  });
});
