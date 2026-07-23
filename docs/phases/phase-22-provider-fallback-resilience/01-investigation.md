# Phase 22 Investigation — Failure Classification & Provider Fallback Architecture

## 1. Executive Summary

This document presents the findings of the Phase 22 repository investigation. The investigation analyzed the current multi-provider execution pipeline (`AIService`, `AIProviderFactory`, `AnthropicProvider`, `GeminiProvider`), error taxonomy (`ai.errors.ts`), telemetry subsystem (`aiLogger.ts`), and domain AI services (`project-ai.service.ts`, `task-ai.service.ts`, `project-summary-ai.service.ts`).

Blockade 2 reconciled Blockade 1 / Gate 1 assumptions against empirical SDK inspections and deterministic analysis.

---

## 2. Reconciled Architectural Findings

### 2.1 Provider Selection & Factory Mechanics

Currently, `AIService` resolves its active provider instance lazily via a private getter:

```typescript
private get provider(): AIProvider {
  if (this.customProvider) {
    return this.customProvider;
  }
  return AIProviderFactory.getProvider();
}
```

When `AIProviderFactory.getProvider(name?: string)` is called:
1. If `name` is omitted, it defaults to `aiConfig.provider` (`anthropic` or `gemini`).
2. It checks an internal static cache (`Map<string, AIProvider>`).
3. If cached, it returns the cached instance.
4. If not cached, it instantiates the requested provider (`new AnthropicProvider()` or `new GeminiProvider()`) and caches it.

### 2.2 SDK-Internal Retry Discovery (Blockade 2 Finding)

- **`AnthropicProvider`:** Inspecting `@anthropic-ai/sdk` revealed default `maxRetries: 2`. For transient HTTP errors (429/5xx), Anthropic SDK executes up to 2 internal HTTP retries. `AnthropicProvider` constructor must explicitly set `maxRetries: 1` (or `0`) to enforce deterministic, bounded execution.
- **`GeminiProvider`:** Inspecting `@google/genai` confirmed default 0 internal HTTP retries.

### 2.3 Credential Construction & Lazy Instantiation

Both `AnthropicProvider` and `GeminiProvider` evaluate credentials in their constructors.
Lazy construction guarantees that if primary provider succeeds, alternate provider is never instantiated and missing alternate credentials have ZERO impact on execution.

If fallback triggers and alternate credentials are missing, constructor throws `AIConfigurationError`. This error is captured and wrapped into `AIFallbackExecutionError`.

### 2.4 Domain Persistence Boundary Verification

Tracing all domain AI services (`ProjectAIService`, `TaskAIService`, `ProjectSummaryAIService`):
Database persistence occurs strictly AFTER `AIService.generateStructuredData()` returns a valid result. Fallback inside `AIService` completes entirely before domain validation or database writes begin, guaranteeing ZERO duplicate persistence or database side effects (Invariant 8 verified).

---

## 3. Failure Classification & Explicit Allowlist Matrix

Blockade 2 rejected broad error catching (`error instanceof AIProviderError`) in favor of an **Explicit Allowlist Architecture**:

| Failure Category | Reason Code | Provider Response Received? | Usage Possibly Available? | Fallback Policy | Detailed Rationale & Governance Rule |
|---|---|:---:|:---:|:---:|---|
| **Network Failure** | `NETWORK_ERROR` | NO | NO | **FALLBACK ELIGIBLE** | Socket drop or connection failure. Trigger alternate provider. |
| **Timeout** | `TIMEOUT_ERROR` | NO | NO | **FALLBACK ELIGIBLE** | Exceeded request duration. Trigger alternate if $t_{\text{remaining}} \ge 3000\text{ms}$. |
| **Rate Limit (429)** | `RATE_LIMIT_ERROR` | NO | NO | **FALLBACK ELIGIBLE** | Primary quota exhausted. Alternate provider bypasses rate limits. |
| **Provider 5xx** | `SERVER_ERROR` | NO | NO | **FALLBACK ELIGIBLE** | Server error. Alternate provider runs on independent infrastructure. |
| **Structured Parse Failure** | `STRUCTURED_PARSE_ERROR` | YES | YES | **FALLBACK ELIGIBLE** | Primary returned unparseable text. Alternate attempt authorized if $t_{\text{remaining}} \ge 3000\text{ms}$. Usage preserved. |
| **Missing Credentials** | `CONFIGURATION_ERROR` | NO | NO | **NOT ELIGIBLE** | Misconfiguration must fail fast. |
| **Invalid Auth (401/403)** | `AUTHENTICATION_ERROR` | NO | NO | **NOT ELIGIBLE** | Invalid API key requires fix. Fail fast. |
| **Zod Validation Failure** | `VALIDATION_ERROR` | YES | YES | **NOT ELIGIBLE** | Output arrived but violated domain Zod rules. Prompt/schema guidance issue (Invariant 4). |
| **Safety Refusal** | `SAFETY_REFUSAL` | NO | MAYBE | **NOT ELIGIBLE** | Content moderation refusal. Hopping providers to bypass safety is prohibited (Invariant 5). |
| **MAX_TOKENS Truncation** | `MAX_TOKENS_TRUNCATION` | PARTIAL | YES | **NOT ELIGIBLE** | Output token budget reached. Shorten prompt instead. |
| **Unknown Error** | `UNKNOWN_ERROR` | NO | NO | **NOT ELIGIBLE** | Unmapped exception. Fail fast with original error. |

---

## 4. Reconciled Policy Summary

- **Attempt Bounds:** Maximum 2 Application-Level Attempts. SDK retries bounded via explicit constructor configuration.
- **Latency Budget:** Monotonic clock (`performance.now()`) budget allocation. Minimum fallback threshold = 3000ms.
- **Double Failure:** Aggregate error `AIFallbackExecutionError` introduced to wrap both attempt errors without context loss.
- **Telemetry:** Per-attempt `AITelemetryEvent` emission. `UNKNOWN != ZERO` usage preserved. 100% privacy-safe.
