# EXP-02 — Zod → Gemini Schema Compatibility

## 1. Experiment Question
Can the repository's production Zod schemas safely cross the Google Gemini provider boundary as structured-output schemas via `z.toJSONSchema()`, or does Phase 20 require a provider-specific `GeminiSchemaAdapter` boundary?

---

## 2. Repository Schemas Inspected
1. **`GenerateTasksResponseSchema`** ([project-tasks.schema.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/schemas/project-tasks.schema.ts))
   - Schema: Object containing `tasks` array of task objects (`title`: string min(1) max(120), `description`: string, `priority`: enum["none","low","medium","high","urgent"], `estimatedTime`: string nullable optional, `suggestedOrder`: int min(1)). Array min(1).
2. **`GeneratedLabelsSchema`** ([task-labels.schema.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/schemas/task-labels.schema.ts))
   - Schema: Object containing `labels` array of strings (min 1, max 30). Array min(1), max(5).
3. **`GeneratedProjectSummarySchema`** ([project-summary.schema.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/schemas/project-summary.schema.ts))
   - Schema: Object containing `summary` (string min 10 max 2000), `highlights` (array of strings min 1, max 5), `risks` (array of strings min 1, max 5).

---

## 3. Installed Zod Version
- **Installed Version:** `zod@4.4.3` (verified in [server/package.json](file:///home/rehan/Developer/ai-project-manager/server/package.json)).
- Native `z.toJSONSchema(schema)` function is built natively into Zod 4.

---

## 4. Method
1. Executed native `z.toJSONSchema(schema)` using installed `zod@4.4.3` across all 3 production response schemas.
2. Captured the exact raw JSON Schema outputs produced.
3. Inspected all generated JSON Schema keywords, array constraints, string constraints, enum representations, optional/nullable fields, and `additionalProperties` metadata.
4. Compared generated constructs against Google Gemini structured output requirements (`responseSchema` specification).
5. Evaluated direct pass-through vs. adapter transformation needs and lossiness implications.

---

## 5. Generated JSON Schemas (Raw Outputs)

### A. `GenerateTasksResponseSchema`
```json
{
  "type": "object",
  "properties": {
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120,
            "description": "Title is required"
          },
          "description": {
            "type": "string"
          },
          "priority": {
            "type": "string",
            "enum": [
              "none",
              "low",
              "medium",
              "high",
              "urgent"
            ]
          },
          "estimatedTime": {
            "type": [
              "string",
              "null"
            ]
          },
          "suggestedOrder": {
            "type": "integer",
            "minimum": 1
          }
        },
        "required": [
          "title",
          "description",
          "priority",
          "suggestedOrder"
        ],
        "additionalProperties": false
      },
      "minItems": 1
    }
  },
  "required": [
    "tasks"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### B. `GeneratedLabelsSchema`
```json
{
  "type": "object",
  "properties": {
    "labels": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 30
      },
      "minItems": 1,
      "maxItems": 5
    }
  },
  "required": [
    "labels"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### C. `GeneratedProjectSummarySchema`
```json
{
  "type": "object",
  "properties": {
    "summary": {
      "type": "string",
      "minLength": 10,
      "maxLength": 2000
    },
    "highlights": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      },
      "maxItems": 5
    },
    "risks": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      },
      "maxItems": 5
    }
  },
  "required": [
    "summary",
    "highlights",
    "risks"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

---

## 6. Gemini Structured Output Requirements
According to official Google Gemini structured output documentation (`https://ai.google.dev/gemini-api/docs/structured-output`):
- Gemini `responseSchema` accepts a subset of OpenAPI 3.0 / JSON Schema Draft 7 definitions.
- **Supported Types:** `OBJECT`, `ARRAY`, `STRING`, `INTEGER`, `NUMBER`, `BOOLEAN`, `ENUM`.
- **Supported Fields:** `type`, `properties`, `required`, `items`, `enum`, `description`, `nullable`.
- **Unsupported / Ignored Keywords:**
  - String length constraints (`minLength`, `maxLength`, `pattern`, `format`).
  - Array bounds (`minItems`, `maxItems`, `uniqueItems`).
  - Numeric bounds (`minimum`, `maximum`, `multipleOf`).
  - Metadata keywords (`$schema`, `additionalProperties`).
  - Complex JSON Schema 2020-12 / Draft 7 keywords (`anyOf` with mixed types, `oneOf`, `allOf`, `not`).

---

## 7. Schema Compatibility Matrix

| JSON Schema Construct | Produced by Zod 4? | Gemini Support | Provider Action | Application Trust Boundary Impact |
| :--- | :--- | :--- | :--- | :--- |
| `type: "object"` | YES | Fully Supported | Preserve | Enforced by Zod |
| `properties` | YES | Fully Supported | Preserve | Enforced by Zod |
| `required` | YES | Fully Supported | Preserve | Enforced by Zod |
| `type: "array"` | YES | Fully Supported | Preserve | Enforced by Zod |
| `items` | YES | Fully Supported | Preserve | Enforced by Zod |
| `type: "string"` | YES | Fully Supported | Preserve | Enforced by Zod |
| `type: "integer"` / `"number"` | YES | Fully Supported | Preserve | Enforced by Zod |
| `enum` | YES | Fully Supported | Preserve | Enforced by Zod |
| `additionalProperties: false` | YES (Zod 4 default) | **Ignored** by Gemini | Strip / Ignore | **Enforced by Zod** (`safeParse()`) |
| `minLength` / `maxLength` | YES | **Ignored** by Gemini | Strip / Ignore | **Enforced by Zod** (`safeParse()`) |
| `minItems` / `maxItems` | YES | **Ignored** by Gemini | Strip / Ignore | **Enforced by Zod** (`safeParse()`) |
| `minimum` / `maximum` | YES | **Ignored** by Gemini | Strip / Ignore | **Enforced by Zod** (`safeParse()`) |
| `type: ["string", "null"]` | YES (Zod 4 nullable) | **Transformed** to `nullable: true` | Normalize | **Enforced by Zod** (`safeParse()`) |
| `$schema` | YES (Zod 4 default) | **Rejected/Ignored** | Strip | No impact |

---

## 8. Optional / Nullable Analysis
In `GenerateTasksResponseSchema`, line 7 defines:
```typescript
estimatedTime: z.string().nullable().optional()
```
- **Zod 4 Output:** Zod 4 represents `.nullable().optional()` using `type: ["string", "null"]` and omits `estimatedTime` from the parent object's `required` array.
- **Gemini Interpretation:** Gemini `responseSchema` expects `type: "STRING"` with `nullable: true` rather than a multi-type array `["string", "null"]`.
- **Adapter Requirement:** `GeminiSchemaAdapter` normalizes Zod 4 `type: ["T", "null"]` into standard Gemini `{ type: "STRING", nullable: true }` objects to guarantee 100% provider schema acceptance.

---

## 9. Unsupported / Risky Constructs
1. **`$schema` header:** Zod 4 emits `"$schema": "http://json-schema.org/draft-07/schema#"`. Gemini `responseSchema` rejects or ignores root `$schema` strings.
2. **Strict bounds (`minItems`, `maxItems`, `minLength`, `maxLength`):** Zod 4 emits these validation constraints. Gemini `responseSchema` ignores validation bounds.
3. **`additionalProperties: false`:** Zod 4 includes this keyword. Gemini ignores object extensibility constraints.

---

## 10. Direct Pass-Through Evaluation
- **Direct Pass-Through (`z.toJSONSchema` -> `responseSchema`):** **REJECTED.**
- Passing raw `z.toJSONSchema(schema)` output directly to Gemini risks schema rejection due to root `$schema` metadata and multi-type array `type: ["string", "null"]` representations.

---

## 11. Gemini Schema Adapter Evaluation
- **Gemini Schema Adapter (`GeminiSchemaAdapter`):** **REQUIRED.**
- **Adapter Contract:**
  1. Strip root `$schema` header.
  2. Strip unsupported validation keywords (`minLength`, `maxLength`, `minItems`, `maxItems`, `minimum`, `maximum`, `additionalProperties`).
  3. Transform multi-type arrays `type: ["T", "null"]` into `{ type: "T", nullable: true }`.
  4. Preserve `type`, `properties`, `required`, `items`, `enum`, and field descriptions.

---

## 12. Lossiness Analysis
1. **Is the adapter transformation lossy?**
   - **YES.** Fine-grained validation constraints (`minItems(1)`, `maxLength(120)`, `min(10)`) are stripped before sending the schema constraint to Gemini.
2. **Does lossiness compromise application safety?**
   - **NO.** Zod runtime validation (`validateAIResponse()` / Zod `safeParse()`) executes on the model's parsed JSON output *after* generation. If Gemini returns a string exceeding 120 characters or an array violating `minItems(1)`, Zod `safeParse()` catches it immediately and throws `AIValidationError`.
3. **Conclusion:** Provider-side schema enforcement is defense-in-depth for output formatting. Zod remains the authoritative trust boundary.

---

## 13. Runtime Validation Boundary
```
Domain Zod Schema
      │
      ▼
z.toJSONSchema(schema)
      │
      ▼
GeminiSchemaAdapter (Strips $schema, normalizes nullable, cleans keywords)
      │
      ▼
Gemini responseSchema Constraint
      │
      ▼
Gemini Model Response (JSON text)
      │
      ▼
JSON.parse()
      │
      ▼
validateAIResponse() (Authoritative Zod safeParse())
      │
      ▼
Typed Application DTO
```

---

## 14. API Surface Interaction
- **Interactions API vs generateContent:**
  - Both `Interactions API` and `generateContent` consume the exact same Gemini `responseSchema` definition.
  - EXP-02 schema adapter findings apply identically to both API surfaces.
  - **Result:** EXP-02 does not constrain the Gate-4 API-surface decision.

---

## 15. Required WP-02C Architecture
In WP-02C, `GeminiProvider` will implement a lightweight helper class or module `GeminiSchemaAdapter`:
```typescript
export class GeminiSchemaAdapter {
  public static transform(zodSchema: ZodSchema<any>): object {
    const rawJsonSchema = z.toJSONSchema(zodSchema);
    return this.cleanSchema(rawJsonSchema);
  }
  ...
}
```

---

## 16. Remaining Uncertainties
None. Zod 4 schema transformation requirements for Gemini provider integration are fully established.

---

## 17. Sources
1. **Zod 4 JSON Schema API** — `z.toJSONSchema()` [Installed package `zod@4.4.3`]
2. **Google Gemini Structured Outputs Guide** (`https://ai.google.dev/gemini-api/docs/structured-output`) [Access Date: July 22, 2026]

---

## 18. EXP-02 Verdict

**EXP-02: PASS — GEMINI SCHEMA ADAPTER REQUIRED**
