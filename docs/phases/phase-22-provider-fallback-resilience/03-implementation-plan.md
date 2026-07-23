# Phase 22 Implementation Plan — Provider Fallback & Resilience

## 1. Overview

This document outlines the systematic work packages (WPs) required to implement Phase 22 Provider Fallback & Resilience once authorized following Gate 2 approval.

Implementation is broken into 3 focused, non-overlapping Work Packages:
- **WP-01:** Error Taxonomy Enhancement & Explicit Allowlist Classification
- **WP-02:** Fallback Orchestration, Latency Budget & Double Failure Handling
- **WP-03:** Telemetry Integration & Offline Regression Suite

---

## 2. Work Package Breakdown

### WP-01 — Error Taxonomy Enhancement & Explicit Allowlist Classification

**Target Files:**
- `server/src/ai/errors/ai.errors.ts`
- `server/src/ai/providers/anthropic.provider.ts`
- `server/src/ai/providers/gemini.provider.ts`
- `server/src/ai/utils/fallback-policy.ts` (New module)

**Behavior Introduced:**
- Add `failureReason` field to `AIProviderError` (`NETWORK_ERROR`, `TIMEOUT_ERROR`, `RATE_LIMIT_ERROR`, `SERVER_ERROR`, `STRUCTURED_PARSE_ERROR`, `SAFETY_REFUSAL`, `MAX_TOKENS_TRUNCATION`, `AUTHENTICATION_ERROR`).
- Update `AnthropicProvider` constructor options to explicitly set `maxRetries: 1` to prevent SDK retry storms.
- Map SDK errors to set `failureReason` accurately in `AnthropicProvider` and `GeminiProvider`.
- Implement `isFallbackEligible(error: unknown): boolean` using explicit allowlist.
- Export `AIFallbackExecutionError` aggregate error class.

**Required Unit Tests:**
- Unit tests verifying `isFallbackEligible` returns `true` ONLY for allowlisted failure reasons.
- Unit tests verifying `isFallbackEligible` returns `false` for safety refusals, max tokens, validation errors, auth errors, and unknown errors.

**Invariants Preserved:**
- Invariant 3 (No fallback for every error)
- Invariant 4 (Zod validation failure != infrastructure failure)
- Invariant 5 (Safety refusal semantics remain intentional)

---

### WP-02 — Fallback Orchestration, Latency Budget & Double Failure Handling

**Target Files:**
- `server/src/ai/ai.service.ts`
- `server/src/ai/providers/provider.factory.ts`

**Behavior Introduced:**
- Implement `resolveAlternateProviderName(primaryProviderName)` helper.
- Update `AIService.generateStructuredData` with fallback orchestration loop.
- Enforce monotonic clock (`performance.now()`) latency budget calculation ($t_{\text{remaining}} \ge 3000\text{ms}$).
- Instantiate `AIFallbackExecutionError` when both primary and fallback attempts fail.
- Enforce strict maximum 2 application-level attempts bound.

**Required Unit Tests:**
- Unit tests verifying `AIService` invokes alternate provider when primary fails with allowlisted error.
- Unit tests verifying `AIService` re-throws original error immediately when primary fails with non-allowlisted error.
- Unit tests verifying `AIService` re-throws primary timeout if remaining latency budget $< 3000\text{ms}$.
- Unit tests verifying lazy provider construction & missing alternate credential error handling.
- Unit tests verifying double failure throws `AIFallbackExecutionError`.

**Invariants Preserved:**
- Invariant 1 (No uncontrolled retry loops)
- Invariant 2 (No recursive fallback)
- Invariant 6 (Configuration failures fail fast)
- Invariant 7 (Timeout behavior bounded)
- Invariant 8 (No duplicate persistence)
- Invariants 11 & 12 (Provider abstraction intact, domain services untouched)

---

### WP-03 — Telemetry Integration & Offline Regression Suite

**Target Files:**
- `server/src/ai/types/index.ts`
- `server/src/ai/utils/logger.ts`
- `server/src/ai/tests/fallback.test.ts` (New test suite)

**Behavior Introduced:**
- Update `AITelemetryEvent` with `attempt`, `isFallback`, `fallbackFromProvider`, `primaryErrorCategory`.
- Emit telemetry for each attempt in `AIService`.
- Create comprehensive 100% offline unit test suite for all primary/fallback paths.

**Required Unit Tests:**
- Unit tests asserting primary failure emits `attempt: 1, success: false`.
- Unit tests asserting fallback success emits `attempt: 2, isFallback: true, success: true`.
- Unit tests asserting double failure emits two telemetry events before throwing `AIFallbackExecutionError`.
- Unit tests asserting privacy compliance (zero prompt/response leakage).
- Full suite verification via `npm test`.

**Invariants Preserved:**
- Invariant 9 (Preserve Phase 21 telemetry guarantees)
- Invariant 10 (UNKNOWN != ZERO usage preservation)

---

## 3. Verification Plan

### Automated Offline Verification Command
```bash
wsl --exec bash -lc '
  export PATH="/home/rehan/.nvm/versions/node/v20.20.2/bin:$PATH"
  cd /home/rehan/Developer/ai-project-manager
  npm run verify
'
```
Must pass 100% offline with zero external network or AI API calls.
