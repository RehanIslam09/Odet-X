# Experiment 05 — Telemetry Attempt Model & Privacy Verification

## 1. Executive Summary

Experiment 05 established the telemetry emission contract for multi-attempt fallback executions, ensuring operational transparency while preserving Phase 21 privacy constraints and `UNKNOWN != ZERO` usage guarantees.

---

## 2. Telemetry Emission Sequences Across Scenarios

Each provider attempt (Primary and Fallback) emits a distinct `AITelemetryEvent` to `aiLogger.logExecution()`.

### Scenario A: Primary Provider Succeeds
- **Emitted Events:** 1 Event
- **Telemetry Record:**
  - `attempt: 1`
  - `isFallback: false`
  - `success: true`
  - `provider: 'gemini'`
  - `durationMs: 1420`
  - `usage: { inputTokens: 450, outputTokens: 120, totalTokens: 570 }`

### Scenario B: Primary Eligible Failure $\rightarrow$ Alternate Provider Succeeds
- **Emitted Events:** 2 Events

**Event 1 (Primary Attempt Failure):**
- `attempt: 1`
- `isFallback: false`
- `success: false`
- `provider: 'gemini'`
- `errorCategory: 'PROVIDER_ERROR'`
- `errorMessage: 'AI provider execution error'`
- `durationMs: 850`
- `usage: undefined` (or primary usage if received prior to parse failure)

**Event 2 (Fallback Attempt Success):**
- `attempt: 2`
- `isFallback: true`
- `fallbackFromProvider: 'gemini'`
- `primaryErrorCategory: 'PROVIDER_ERROR'`
- `provider: 'anthropic'`
- `success: true`
- `durationMs: 1980`
- `usage: { inputTokens: 480, outputTokens: 135, totalTokens: 615 }`

### Scenario C: Primary Non-Eligible Failure (e.g. Safety Refusal / Zod Failure)
- **Emitted Events:** 1 Event
- **Telemetry Record:** `attempt: 1`, `isFallback: false`, `success: false`, `errorCategory: 'VALIDATION_ERROR'` (or `'PROVIDER_ERROR'`). Zero secondary event emitted.

---

## 3. Preservation of `UNKNOWN != ZERO` (Invariant 10)

1. If primary fails prior to response header delivery (e.g. 503 or network drop), `usage = undefined`.
2. If primary fails on raw JSON parse after token headers were delivered, `usage` from the primary response envelope is recorded in Event 1 telemetry.
3. Tokens are NEVER fabricated (`inputTokens: 0` is forbidden when usage is unknown).

---

## 4. Privacy & Data Minimization Audit

Inspection of telemetry data structure confirms:
- **SAFE FIELDS INCLUDED:** `executionId`, `timestamp`, `provider`, `tier`, `model`, `promptName`, `promptVersion`, `durationMs`, `success`, `attempt`, `isFallback`, `fallbackFromProvider`, `primaryErrorCategory`, `usage`, `errorType`, `errorCategory`, `errorMessage`.
- **FORBIDDEN FIELDS EXCLUDED:** Prompt text, full system prompt, raw response text, parsed JSON payload, API keys, authorization headers, user IDs, project names.

100% privacy compliance maintained.

---

## 5. Conclusion & Evidence Status

- **Per-Attempt Telemetry Model:** Verified and adopted (CONFIRMED).
- **`UNKNOWN != ZERO` Preservation:** Verified (CONFIRMED).
- **Data Privacy Audit:** 100% compliant (CONFIRMED).
