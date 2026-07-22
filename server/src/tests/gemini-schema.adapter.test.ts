import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { getGeminiResponseSchema, sanitizeSchemaForGemini } from '../ai/providers/gemini-schema.adapter.js';
import { GenerateTasksResponseSchema } from '../ai/schemas/project-tasks.schema.js';
import { GeneratedLabelsSchema } from '../ai/schemas/task-labels.schema.js';
import { GeneratedProjectSummarySchema } from '../ai/schemas/project-summary.schema.js';

describe('Gemini Schema Adapter (EXP-02 & WP-02C Invariants)', () => {
  it('should convert domain Zod schemas via z.toJSONSchema and sanitize them', () => {
    const tasksSchema = getGeminiResponseSchema(GenerateTasksResponseSchema);
    const labelsSchema = getGeminiResponseSchema(GeneratedLabelsSchema);
    const summarySchema = getGeminiResponseSchema(GeneratedProjectSummarySchema);

    assert.strictEqual(typeof tasksSchema, 'object');
    assert.strictEqual(typeof labelsSchema, 'object');
    assert.strictEqual(typeof summarySchema, 'object');

    assert.strictEqual('$schema' in tasksSchema, false, 'Root $schema header must be removed');
    assert.strictEqual('$schema' in labelsSchema, false, 'Root $schema header must be removed');
    assert.strictEqual('$schema' in summarySchema, false, 'Root $schema header must be removed');
  });

  it('should strip unsupported OpenAPI keywords ($schema, minLength, maxLength, minItems, maxItems, additionalProperties)', () => {
    const complexZod = z.object({
      title: z.string().min(5).max(100),
      tags: z.array(z.string()).min(1).max(5),
    });

    const rawSchema = z.toJSONSchema(complexZod) as Record<string, any>;
    assert.strictEqual('$schema' in rawSchema, true, 'Raw z.toJSONSchema output contains $schema');

    const sanitized = sanitizeSchemaForGemini(rawSchema);

    assert.strictEqual('$schema' in sanitized, false);

    const titleProp = sanitized.properties?.title;
    assert.ok(titleProp, 'title property exists');
    assert.strictEqual('minLength' in titleProp, false, 'minLength stripped');
    assert.strictEqual('maxLength' in titleProp, false, 'maxLength stripped');

    const tagsProp = sanitized.properties?.tags;
    assert.ok(tagsProp, 'tags property exists');
    assert.strictEqual('minItems' in tagsProp, false, 'minItems stripped');
    assert.strictEqual('maxItems' in tagsProp, false, 'maxItems stripped');
  });

  it('should handle nullable union representations and preserve valid OpenAPI schema structures', () => {
    const nullableZod = z.object({
      description: z.string().nullable(),
    });

    const rawSchema = z.toJSONSchema(nullableZod) as Record<string, any>;
    const sanitized = sanitizeSchemaForGemini(rawSchema);

    const descProp = sanitized.properties?.description;
    assert.ok(descProp, 'description property exists');
    assert.ok(descProp.anyOf || descProp.nullable || descProp.type === 'string', 'Nullable schema representation preserved');
  });

  it('should recursively sanitize nested objects and array items', () => {
    const nestedZod = z.object({
      metadata: z.object({
        comment: z.string().min(10),
      }),
      list: z.array(
        z.object({
          itemTitle: z.string().max(50),
        })
      ),
    });

    const rawSchema = z.toJSONSchema(nestedZod) as Record<string, any>;
    const sanitized = sanitizeSchemaForGemini(rawSchema);

    const commentProp = sanitized.properties?.metadata?.properties?.comment;
    assert.ok(commentProp);
    assert.strictEqual('minLength' in commentProp, false);

    const itemTitleProp = sanitized.properties?.list?.items?.properties?.itemTitle;
    assert.ok(itemTitleProp);
    assert.strictEqual('maxLength' in itemTitleProp, false);
  });

  it('should not mutate original Zod schema or raw z.toJSONSchema return object', () => {
    const targetZod = z.object({ name: z.string().min(3) });
    const rawSchema = z.toJSONSchema(targetZod) as Record<string, any>;

    const sanitized = sanitizeSchemaForGemini(rawSchema);

    assert.strictEqual('$schema' in rawSchema, true, 'Original raw schema retains $schema');
    assert.strictEqual('$schema' in sanitized, false, 'Sanitized copy has no $schema');
  });

  it('should reuse cached conversion result for the same Zod schema instance', () => {
    const targetZod = z.object({ key: z.string() });

    const firstCall = getGeminiResponseSchema(targetZod);
    const secondCall = getGeminiResponseSchema(targetZod);

    assert.strictEqual(firstCall, secondCall, 'WeakMap cache must return identical object reference');
  });
});
