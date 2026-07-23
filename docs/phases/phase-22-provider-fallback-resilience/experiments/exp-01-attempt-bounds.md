# Experiment 01 — Strict Attempt Bounds & SDK Retries Analysis

## 1. Executive Summary

Experiment 01 investigated the proposed attempt bounds for Phase 22 provider fallback. It analyzed application-level execution policies, recursion safety, and concrete SDK-internal retry behaviors of `@anthropic-ai/sdk` and `@google/genai`.

---

## 2. Application-Level Execution Bounds

**Policy:**
Maximum application-level attempts per AI request = **2** (Primary Provider $\rightarrow$ Alternate Provider).

```
Attempt 1 (Primary) ─── SUCCESS ──► Return result
     │
   FAILURE (Fallback-Eligible)
     │
     ▼
Attempt 2 (Alternate) ──► SUCCESS or FAILURE ──► Terminate
```

### Recursion & Looping Analysis
- Providers (`AnthropicProvider`, `GeminiProvider`) maintain zero references to other providers or `AIService`.
- `AIService` tracks attempts via an internal counter (`attempt: 1`, `attempt: 2`) and resolves the alternate provider exactly once via `resolveAlternateProviderName(primaryProviderName)`.
- Loop termination after Attempt 2 is mathematically guaranteed. Recursive looping (`Anthropic -> Gemini -> Anthropic`) is impossible.

---

## 3. SDK-Internal Retry Inspection

Empirical inspection of the installed SDK versions in `server/node_modules/` revealed:

1. **Anthropic SDK (`@anthropic-ai/sdk`):**
   - Default `maxRetries`: **2**.
   - For transient HTTP errors (429 Rate Limit, 5xx Server Error, connection drops), the Anthropic SDK automatically retries internally up to 2 times before throwing an exception to `AnthropicProvider`.
   - Result: A single primary attempt using Anthropic could execute up to **3 HTTP requests** under transient failure conditions if `maxRetries` is left at default.

2. **Google Gemini SDK (`@google/genai`):**
   - Default SDK retries: **0**.
   - The Gemini SDK does not execute internal retries by default unless explicitly configured.

---

## 4. Terminology Refinement Requirement

The Gate 1 statement *"maximum 2 attempts"* was ambiguous because it mixed application-level provider fallback with SDK-level HTTP retries.

### Refined Terminology Contract:

- **Application-Level Provider Attempts:** Hard-capped at 2 (Attempt 1 Primary $\rightarrow$ Attempt 2 Alternate).
- **SDK-Internal HTTP Retries:** Configured explicitly in provider constructors.
- **Engineering Decision:** To prevent total latency amplification and retry storms, provider constructors MUST explicitly configure SDK retries:
  - `AnthropicProvider` constructor: Explicitly set `maxRetries: 1` (or `maxRetries: 0`) in options to ensure bounded, predictable SDK behavior.
  - `GeminiProvider` constructor: Preserve explicit 0-retry default.

---

## 5. Conclusion & Evidence Status

- **Application Attempt Bound:** 2 (CONFIRMED).
- **SDK Retry Behavior:** `@anthropic-ai/sdk` defaults to 2 retries; `@google/genai` defaults to 0 (CONFIRMED & EMPIRICALLY VERIFIED).
- **Terminology Refinement:** Adopted (REFINED).
