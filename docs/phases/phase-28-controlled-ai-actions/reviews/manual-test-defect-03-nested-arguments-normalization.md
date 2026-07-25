# Phase 28 — Manual Test Defect 03 Investigation & Resolution Report
## Live Gemini Nested Structured-Output Arguments Normalization

> **Phase**: Phase 28 — Controlled AI Actions  
> **Defect Identifier**: MANUAL TEST DEFECT 03 — Nested Arguments String Serialization  
> **Severity**: BLOCKING (HTTP 500 on live action proposal Copilot queries)  
> **Status**: AUTOMATED FIX VERIFIED — LIVE GEMINI ACTION RETEST PENDING  
> **Author**: Senior Staff Software Architect & AI Platform Architect  
> **Date**: 2026-07-25  

---

## 1. Executive Summary & Observed Live Malformed Payload

During live manual browser testing of Phase 28 Controlled AI Actions, Gemini generated a structured response for an action query (*"Change the priority of 'Design JWT Token Scheme...' to urgent"*).

While the provider understood the action intent correctly, it serialized the nested `arguments` object as a JSON string and prepended an anomalous leading colon:

```json
{
  "action": "UPDATE_TASK_PRIORITY",
  "targetRef": "task_1",
  "arguments": ":{\"priority\":\"urgent\"}",
  "explanation": "Updating the priority of task 'Design JWT Token Scheme and Payload Structure' to urgent per user request."
}
```

Because canonical Zod validation expects `arguments` to be an object (`z.object(...)`), strict Zod validation rejected the string representation with `"Invalid input: expected object, received string"`.

---

## 2. Root Cause & Architectural Decision

### Root Cause
Google Gemini's OpenAPI `generation_config.response_schema` protobuf parser sometimes serializes nested sub-objects (`arguments`) into JSON strings or prepends a colon (`:`) when returning complex nested objects under structured output generation.

### Selected Normalization Boundary
Implemented `normalizeAIResponsePayload()` inside `server/src/ai/validation/ai-response.validator.ts` directly before canonical Zod validation (`schema.safeParse()`).

This boundary selection keeps provider-specific transport quirks at the provider/AI validation boundary and prevents domain action Zod schemas from being contaminated with permissive types.

---

## 3. Why Canonical Schemas Were NOT Weakened

1. `ProposedActionSchema` and individual action schemas (`UpdateTaskPriorityPayloadSchema`, etc.) remain 100% strict `z.object({...})`.
2. `normalizeAIResponsePayload()` inspects `proposedAction.arguments`. If it is a string:
   - Trims whitespace.
   - Strips an optional leading colon (`:`).
   - Attempts `JSON.parse()`.
   - Accepts the replacement **ONLY** if the parsed result is a non-null, non-array object.
   - If parsing fails or yields a primitive/array, the string is left intact so canonical Zod validation strictly rejects it.
3. Immutability: If `arguments` is already an object, the original payload reference is returned unmodified.

---

## 4. Before & After Payload Comparison

### Before Normalization (Raw Provider Output)
```json
{
  "action": "UPDATE_TASK_PRIORITY",
  "targetRef": "task_1",
  "arguments": ":{\"priority\":\"urgent\"}",
  "explanation": "Updating task priority."
}
```

### After Normalization (Fed into Zod `ProjectCopilotResponseSchema.safeParse()`)
```json
{
  "action": "UPDATE_TASK_PRIORITY",
  "targetRef": "task_1",
  "arguments": {
    "priority": "urgent"
  },
  "explanation": "Updating task priority."
}
```

---

## 5. Regression Test Suite Added

Created `server/src/tests/gemini-schema-defect-03-fix.test.ts` covering all 14 mandatory scenarios:

- **Test A**: Live defect `arguments = ':{"priority":"urgent"}'` → normalized and validated.
- **Test B**: Ordinary JSON string `arguments = '{"priority":"urgent"}'` → normalized and validated.
- **Test C**: Already-correct object `arguments = { priority: "urgent" }` → reference unchanged, validated.
- **Test D**: Malformed JSON string `arguments = ':{invalid-json'` → rejected by canonical Zod.
- **Test E**: JSON primitive string `arguments = '"urgent"'` → rejected by canonical Zod.
- **Test F**: JSON array string `arguments = '["urgent"]'` → rejected by canonical Zod.
- **Test G**: Parsed object with invalid enum `arguments = ':{"priority":"nuclear"}'` → rejected by canonical Zod.
- **Test H**: Forbidden `DELETE_TASK` action → rejected by canonical Zod.
- **Test I**: `UPDATE_TASK_STATUS` string arguments → normalized and validated.
- **Test J**: `UPDATE_TASK_DUE_DATE` string arguments → normalized and validated.
- **Test K**: `ADD_TASK_LABEL` string arguments → normalized and validated.
- **Test L**: `CREATE_TASK` string arguments → normalized and validated.
- **Test M**: `proposedAction: null` → unaffected.
- **Test N**: Phase 27 informational response → unaffected.

---

## 6. Security Invariant Audit

- **AI Proposal-Only**: 100% preserved (zero direct database writes).
- **Human Confirmation Mandatory**: 100% preserved.
- **Dry-Run & Signed HMAC Token**: 100% preserved.
- **Symbolic Target Enforcement**: 100% preserved.
- **Forbidden Actions Rejected**: 100% preserved (`DELETE_*` actions remain rejected).

---

## 7. Files Changed

### Modified Production Files (1)
- `server/src/ai/validation/ai-response.validator.ts`

### Created Test Files (1)
- `server/src/tests/gemini-schema-defect-03-fix.test.ts`

### Created Review Artifact (1)
- `docs/phases/phase-28-controlled-ai-actions/reviews/manual-test-defect-03-nested-arguments-normalization.md`

---

## 8. Verification Results

- **Server Typecheck**: `npm run typecheck` passed (0 errors).
- **Server ESLint**: Passed (0 errors).
- **Defect 03 Test Suite**: `gemini-schema-defect-03-fix.test.ts` passed (14/14 tests).
- **Defect 02 Test Suite**: `gemini-schema-defect-02-fix.test.ts` passed (8/8 tests).
- **Defect 01 Test Suite**: `gemini-schema-defect-fix.test.ts` passed (11/11 tests).
- **Full Server Test Suite**: 49 / 49 test files passing.
- **Full Client Test Suite**: 56 / 56 Vitest tests passing (9 / 9 test files).
- **`git diff --check`**: Clean (0 issues).
- **Live LLM Calls Performed**: 0.

---

## 9. Browser Retest Procedure for User

1. Run `npm run dev`.
2. Open Project Copilot in browser (`http://localhost:5173`).
3. Issue the live action query:
   > *"Change the priority of 'Design JWT Token Scheme and Payload Structure' to urgent."*
4. Verify response:
   - Returns `HTTP 200 OK`.
   - Copilot prose answer renders with entity references.
   - **Action Proposal Card** appears rendering `Change task priority`, `Auth Middleware`, `Priority: URGENT`, and `Review Change` button.
5. Click **Review Change**:
   - Verify `POST /copilot/actions/dry-run` returns `200 OK`.
   - State diff modal displays Before vs After task priority.
6. Click **Confirm Change**:
   - Verify `POST /copilot/actions/confirm` returns `200 OK`.
   - Card transitions to green **Applied** status.
   - UI updates task priority immediately without page refresh.

---

============================================================
PHASE 28 MANUAL TEST DEFECT 03:
AUTOMATED FIX VERIFIED — LIVE GEMINI ACTION RETEST PENDING
============================================================
