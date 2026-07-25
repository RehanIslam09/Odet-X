# Phase 28 — Manual Test Defect 01 Investigation & Resolution Report
## Live Gemini Structured-Output Schema Compatibility Failure

> **Phase**: Phase 28 — Controlled AI Actions  
> **Defect Identifier**: MANUAL TEST DEFECT 01 — Gemini Schema Compatibility  
> **Severity**: BLOCKING (HTTP 500 on live Copilot queries)  
> **Status**: AUTOMATED FIX VERIFIED — LIVE GEMINI RETEST PENDING  
> **Author**: Senior Staff Software Architect & AI Platform Architect  
> **Date**: 2026-07-25  

---

## 1. Symptom & Observed Error

During manual browser testing of Phase 28 Controlled AI Actions, querying the Project Copilot (`POST /api/v1/projects/:projectId/copilot`) with an informational question (e.g., *"What are the biggest risks or blockers in this project right now?"*) failed with HTTP 500.

The server logs revealed the underlying root failure:

```text
AIProviderError: Gemini API request validation error (status 400)
Invalid JSON payload received. Unknown name "const" at 'generation_config.response_schema.properties[2].value.one_of[0].properties[0].value'
```

- **Provider**: Google Gemini
- **Model**: `gemini-3.6-flash`
- **Prompt / Version**: `project-copilot` (v2.0.0)
- **Call Location**: `GeminiProvider.generateStructured()` via `getGeminiResponseSchema()`

---

## 2. Root Cause & Architectural Analysis

### Why This Happened
In Phase 28, `ProjectCopilotResponseSchema` was extended to include `proposedAction`, which uses Zod discriminated unions (`z.discriminatedUnion("action", [...])`) and literal discriminators (`z.literal("CREATE_TASK")`, `z.literal("UPDATE_TASK_STATUS")`, etc.).

When converted via native `z.toJSONSchema()`, `z.literal("CREATE_TASK")` produces JSON Schema property definitions containing:
```json
"action": {
  "type": "string",
  "const": "CREATE_TASK"
}
```

Google Gemini's OpenAPI Schema API (`generation_config.response_schema`) supports OpenAPI 3.0 / JSON Schema, but **does NOT support the `const` keyword** in its protobuf Schema definition. Additionally, keywords like `pattern` (from `z.string().datetime()`) and `default` are unsupported by Gemini's protobuf schema parser.

When Gemini received a request containing `"const": "CREATE_TASK"`, its API rejected the request payload before LLM inference even began, returning HTTP 400 (`Unknown name "const"`).

### Why Automated Tests Failed to Catch It
The automated unit test suites mock LLM provider calls offline for speed and determinism. Offline tests mock `geminiProvider.generateStructured` or `aiService.generateStructuredData`, so the raw `GenerateContentConfig.responseSchema` JSON object was never sent to Google's live API endpoints during unit tests.

---

## 3. Canonical Application Schema vs. Provider Wire Schema

To resolve this defect cleanly without compromising security or design principles:

1. **Canonical Application Schema (`ProjectCopilotResponseSchema` & `ProposedActionSchema`)**:
   - MUST remain strict and unchanged.
   - Server-side response validation continues to use Zod `z.discriminatedUnion` and `z.literal`.
   - Forbidden / blacklisted actions (`DELETE_TASK`, `DELETE_PROJECT`, `BULK_DELETE`) remain 100% rejected at the Zod boundary.

2. **Provider Wire Schema Adapter (`gemini-schema.adapter.ts`)**:
   - Translates `const: "VALUE"` into Gemini-supported `enum: ["VALUE"]`.
   - Strips unsupported Gemini OpenAPI keywords (`$schema`, `minLength`, `maxLength`, `minItems`, `maxItems`, `additionalProperties`, `pattern`, `default`).
   - Generates a valid Gemini-compliant `responseSchema` for transport only.

---

## 4. Implementation Details

In `server/src/ai/providers/gemini-schema.adapter.ts`:

1. **Unsupported Keyword Filtering**:
   Added `pattern` and `default` to `UNSUPPORTED_KEYWORDS`.

2. **`const` to `enum` Transformation**:
   When processing schema keys, any `const: value` property is converted to `enum: [value]`, and `const` is removed:
   ```typescript
   if (key === 'const') {
     if (!('enum' in schema) && !result.enum) {
       result.enum = [value];
     }
     if (!('type' in schema) && !result.type) {
       if (value === null) {
         result.type = 'null';
       } else if (typeof value === 'string') {
         result.type = 'string';
       }
     }
     continue;
   }
   ```

3. **Immutability**:
   `sanitizeSchemaForGemini()` returns a new copy without mutating the original Zod schema or raw `z.toJSONSchema()` objects.

---

## 5. Security Analysis

- **Zero Safety Degradation**: Server-side validation still executes `ProjectCopilotResponseSchema.parse(response)` against the returned JSON payload.
- **Strict Authority**: The AI model is strictly proposal-only. No execution authority is granted.
- **Symbolic Target Grounding**: Hallucinated target references continue to be nullified to `proposedAction: null`.

---

## 6. Regression Test Suite Added

Created `server/src/tests/gemini-schema-defect-fix.test.ts` covering 11 critical invariants:

1. Gemini provider wire schema contains no unsupported `const`, `pattern`, `default`, or `$schema` keywords.
2. All 5 action discriminator literals remain semantically constrained to their exact single-element `enum` value.
3. Canonical `ProposedActionSchema` remains strict.
4. Forbidden action names (`DELETE_TASK`) remain rejected.
5. `proposedAction: null` remains valid for informational queries.
6. Valid `CREATE_TASK` proposal survives canonical Zod validation.
7. Valid `UPDATE_TASK_STATUS` proposal survives canonical Zod validation.
8. Invalid action types are rejected by canonical validation.
9. Existing Phase 27 structured Copilot responses remain valid.
10. Provider compatibility transformation does NOT mutate canonical schema objects.
11. Anthropic provider behavior is completely un-impacted (fix is isolated to Gemini adapter).

---

## 7. Automated Verification Results

- **Server Typecheck**: `npm run typecheck` passed (0 errors).
- **Server ESLint**: Passed (0 errors).
- **Gemini Schema Defect Test**: `gemini-schema-defect-fix.test.ts` passed (11/11 tests).
- **Gemini Schema Adapter Test**: `gemini-schema.adapter.test.ts` passed (6/6 tests).
- **Phase 28 Action Tests**: 49 / 49 server test files passing.
- **Client Typecheck & Vitest**: 56 / 56 client tests passing.
- **`git diff --check`**: Clean (0 issues).
- **Live LLM Calls**: 0 (all automated tests offline).

---

============================================================
PHASE 28 MANUAL TEST DEFECT 01:
AUTOMATED FIX VERIFIED — LIVE GEMINI RETEST PENDING
============================================================
