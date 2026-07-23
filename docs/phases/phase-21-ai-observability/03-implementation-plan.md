# Phase 21 Implementation Plan — AI Observability & Usage Intelligence

## 1. Overview

Phase 21 is broken into 3 compact Work Packages (WP-01 to WP-03).

---

## 2. Work Package Breakdown

### WP-01 — Telemetry Contracts & Observer Boundary
- **Files to Modify:**
  - `server/src/ai/types/index.ts`
  - `server/src/ai/providers/base.provider.ts`
  - `server/src/ai/utils/logger.ts`
- **Changes:**
  - Add `AIProviderUsage`, `AIProviderMetadata`, `AIProviderResponse<T>`, `AIErrorCategory`, `AITelemetryEvent`, `AITelemetryListener`.
  - Add `readonly providerName: string` and `getModelForTier(tier: AIModelTier): string` to `AIProvider` interface contract.
  - Update `AIProvider.generateStructured<T>` contract to return `Promise<AIProviderResponse<T>>`.
  - Extend `aiLogger` to support listener registration (`onTelemetry`, `offTelemetry`, `clearListeners`), wrap each listener invocation in `try/catch` isolation, and emit formatted `AITelemetryEvent` objects.
- **Invariants:** Zero changes to domain services; zero prompt/content field exposure in telemetry interfaces; `usage` is optional (`usage?: AIProviderUsage`) to distinguish unknown token usage from zero tokens.

### WP-02 — Provider & AIService Instrumentation
- **Files to Modify:**
  - `server/src/ai/providers/anthropic.provider.ts`
  - `server/src/ai/providers/gemini.provider.ts`
  - `server/src/ai/ai.service.ts`
- **Changes:**
  - In `AnthropicProvider`: Expose `readonly providerName = 'anthropic'` and public `getModelForTier(tier)`, extract `response.usage` (`input_tokens`, `output_tokens`) strictly without `?? 0` fallbacks, and wrap returned parsed data in `AIProviderResponse<T>`.
  - In `GeminiProvider`: Expose `readonly providerName = 'gemini'` and public `getModelForTier(tier)`, extract `response.usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`) strictly without `?? 0` fallbacks, and wrap returned parsed data in `AIProviderResponse<T>`.
  - In `AIService`: Compute latency via `Date.now()`, resolve concrete model via `this.provider.getModelForTier(options.tier)` on success and failure paths, use `provider.providerName` for provider identity, aggregate provider usage + model + tier + prompt name + error category, sanitize `errorMessage` (removing raw output snippets), and emit `AITelemetryEvent` on success and failure paths.
- **Invariants:** Preserve `validateAIResponse` Zod validation boundary; preserve `ONLY STOP succeeds` finishReason semantics; preserve `timedOut === true` timeout semantics.

### WP-03 — Tests, Telemetry Verification & CI Alignment
- **Files to Modify / Create:**
  - `server/src/ai/tests/execution.test.ts` (update MockProvider to include `providerName`, `getModelForTier`, and return `AIProviderResponse<T>`)
  - `server/src/tests/gemini-provider.test.ts` (update tests for `AIProviderResponse<T>`)
  - [NEW] `server/src/tests/telemetry.test.ts`
- **Changes:**
  - Implement comprehensive offline test suite in `telemetry.test.ts`:
    1. Successful execution emits complete `AITelemetryEvent` with valid token counts, concrete model name (resolved via `getModelForTier`), and `providerName`.
    2. Anthropic & Gemini token extraction verification using mock responses.
    3. Failure execution (Timeout, Provider Error, Validation Error) emits correct `errorCategory`, resolved `model`, and `success: false`.
    4. Unknown-vs-Zero token semantics: verify timeout failure leaves `usage` as `undefined` while validation failure retains provider token counts. Zero is never fabricated when missing.
    5. Privacy invariant check: verify stringified event contains zero prompt or domain user content and zero raw LLM output snippets in `errorMessage`.
    6. Telemetry listener isolation check: verify a throwing telemetry listener does NOT alter AI execution outcome, mask original errors, or prevent subsequent listeners from running.
    7. Observer cleanup check: verify `aiLogger.clearListeners()` prevents test bleed across test runs.
- **Verification Commands:**
  - `npm run typecheck --prefix server`
  - `npm test --prefix server`
  - `npm run verify`

---

## 3. Implementation Authorization Status

> **STATUS: UNAUTHORIZED**
>
> Implementation work remains **UNAUTHORIZED** until explicit human authorization is granted.
