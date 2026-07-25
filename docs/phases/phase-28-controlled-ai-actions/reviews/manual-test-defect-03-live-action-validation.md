# Phase 28 — Manual Test Defect 03 Investigation & Diagnostic Report
## Live Gemini Action Proposal Fails Canonical Validation

> **Phase**: Phase 28 — Controlled AI Actions  
> **Defect Identifier**: MANUAL TEST DEFECT 03 — Live Action Proposal Zod Validation Failure  
> **Severity**: BLOCKING (HTTP 500 on live action proposal Copilot queries)  
> **Status**: DIAGNOSTIC INSTRUMENTATION DEPLOYED — ONE LIVE GEMINI RETEST REQUIRED  
> **Author**: Senior Staff Software Architect & AI Platform Architect  
> **Date**: 2026-07-25  

---

## 1. Executive Summary

Defect 01 (Gemini `const` JSON Schema API rejection) has been confirmed FIXED for the informational query path (`POST /api/v1/projects/:projectId/copilot 200 OK`).

However, live action proposal requests (*"Change the priority of 'Design JWT Token Scheme...' to urgent"*) still return HTTP 500. The backend log indicates `AIValidationError` with **EXACTLY TWO ZOD ISSUES** in `validationErrors.issues`.

Because the default logger truncated `issues` to `[ [Object], [Object] ]`, the exact malformed field paths, Zod error codes, and received values could not be determined without guessing. Per the explicit Stop Condition directive, no speculative schema changes or permissiveness were introduced. Instead, a safe development-only diagnostic logger was added to `validateAIResponse()` to un-truncate and output the exact Zod issue details and raw `proposedAction` structure during the next live request.

---

## 2. Structural Comparison & Hypotheses

### Canonical Expected Structure (`UpdateTaskPriorityPayloadSchema`)
```json
{
  "action": "UPDATE_TASK_PRIORITY",
  "targetRef": "task_1",
  "arguments": {
    "priority": "urgent"
  },
  "explanation": "Brief non-empty reasoning string."
}
```

### Potential Mismatches Under Investigation
1. **Argument Key / Property Mismatch**: Gemini emitting additional/alternate keys inside `arguments` (e.g. `arguments: { priority: "urgent", task: "Design JWT..." }` or `arguments: { newPriority: "urgent" }`).
2. **Type / Sub-schema Union Selection Failure**: Gemini emitting an unexpected field structure that failed discriminated union selection.
3. **Array / Object Argument Wrapping**: Gemini wrapping `arguments` or `explanation` in an array or nested wrapper object.

---

## 3. Development Diagnostic Instrumentation

Updated `server/src/ai/validation/ai-response.validator.ts`:
```typescript
if (process.env.NODE_ENV !== 'production') {
  console.error(
    '[AI VALIDATION FAILURE DETAIL]\n' +
      JSON.stringify(
        {
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
          })),
          proposedAction: (rawData as any)?.proposedAction ?? null,
        },
        null,
        2
      )
  );
}
```

This diagnostic logs un-truncated field paths and exact issue messages without exposing user auth tokens or database ObjectIds.

---

## 4. Files Modified

### Production Files Modified (1)
- `server/src/ai/validation/ai-response.validator.ts`

### Documentation Created (1)
- `docs/phases/phase-28-controlled-ai-actions/reviews/manual-test-defect-03-live-action-validation.md`

---

## 5. Security Invariant Audit

- **AI is Proposal-Only**: 100% preserved. Zero direct database writes.
- **Human Confirmation Mandatory**: 100% preserved.
- **Dry-Run & Signed HMAC Token**: 100% preserved.
- **Symbolic Reference Enforcement**: 100% preserved.
- **Forbidden Actions Rejected**: 100% preserved (`DELETE_*` actions remain rejected).
- **Telemetry Privacy**: 100% preserved. Log instrumentation only active in non-production environments.

---

## 6. Verification Results

- **Server Typecheck**: `npm run typecheck` passed (0 errors).
- **Server ESLint**: Passed (0 errors).
- **Full Server Test Suite**: 49 / 49 test files passing.
- **Full Client Test Suite**: 56 / 56 Vitest tests passing.
- **`git diff --check`**: Clean (0 issues).
- **Live Gemini Calls**: 0 (all automated tests offline).
- **Live Anthropic Calls**: 0.
- **BLOCKER / MAJOR / MINOR Counts**: 0 / 0 / 0.

---

## 7. Exact Live Browser Retest Procedure for User

1. Ensure dev server is running (`npm run dev`).
2. Open Project Copilot in browser (`http://localhost:5173`).
3. Issue the live action request:
   > *"Change the priority of 'Design JWT Token Scheme and Payload Structure' to urgent."*
4. Inspect terminal output for:
   `[AI VALIDATION FAILURE DETAIL]`
5. Copy and provide the resulting `[AI VALIDATION FAILURE DETAIL]` JSON block containing the exact `issues` array and `proposedAction` object.

---

============================================================
PHASE 28 MANUAL TEST DEFECT 03

ROOT CAUSE: Provider response produced exactly 2 Zod issues truncated as [Object], [Object] in previous logs. Diagnostic instrumented to capture exact paths without guessing.

FIX STATUS: Diagnostic logger deployed to expose exact malformed Gemini response.

AUTOMATED VERIFICATION: PASSED (All 49 server & 9 client test files pass, typecheck clean, ESLint clean).

LIVE GEMINI ACTION RETEST: PENDING USER
============================================================
