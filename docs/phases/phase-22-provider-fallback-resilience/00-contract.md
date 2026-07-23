# Phase 22 Contract — Provider Fallback & Resilience

## 1. Problem Statement

Phase 20 established the multi-provider AI architecture for Odet-X, integrating Google Gemini alongside Anthropic. Phase 21 added comprehensive operational observability, structured telemetry logging, and privacy-safe token usage tracking.

However, the AI subsystem currently relies on single-provider execution per request. If the configured primary AI provider experiences a transient infrastructure outage, HTTP 5xx server error, network drop, rate limit (429), or timeout, the user request immediately fails, even if an alternate healthy provider (such as Anthropic or Gemini) is configured and available.

Without controlled fallback, operational resilience remains single-point-of-failure dependent on the primary provider's real-time uptime.

---

## 2. Primary Objective

Introduce controlled provider fallback within the `AIService` orchestration boundary so that an AI request can automatically fail over to an alternate configured provider when, and only when, the primary provider fails in a specifically classified, fallback-eligible manner.

---

## 3. Governance Budget

Phase 22 is classified as **HIGH RISK**.

**Maximum Governance Budget:**
- **Investigation / Evidence Blockades:** 2
  - **Blockade 1:** Failure Classification, Investigation, Contract & Design (Current)
  - **Blockade 2:** Retry/Fallback Safety Evidence (Pre-Implementation Verification)
- **Review Gates:** 4
  - **Gate 1:** Design Approval (Current)
  - **Gate 2:** Evidence Approval (Post-Blockade 2)
  - **Gate 3:** Implementation Review
  - **Gate 4:** Final Verification
- **Total Checkpoints:** 6 Checkpoints maximum.

Phase 20 remains the historical maximum-governance baseline phase. No additional sub-gates or layers will be added unless concrete engineering uncertainty requires it.

---

## 4. Phase 22 Lifecycle Flow

```
Blockade 1 — Failure Classification
        ↓
G1 — Design Approval
        ↓
Blockade 2 — Retry/Fallback Safety Evidence
        ↓
G2 — Evidence Approval
        ↓
Implementation (WP-01, WP-02, WP-03)
        ↓
G3 — Implementation Review
        ↓
G4 — Final Verification
        ↓
PHASE 22 COMPLETE
```

---

## 5. Critical Phase 22 Safety Invariants

The Phase 22 design strictly enforces the following 12 safety invariants:

1. **No Uncontrolled Retry Loops:** Bounded execution policy. Total execution budget is strictly capped at 2 provider attempts (1 primary + 1 alternate maximum). No recursive or looping attempts (`Anthropic -> Gemini -> Anthropic`).
2. **No Recursive Fallback:** Providers (`AnthropicProvider`, `GeminiProvider`) must remain decoupled and unaware of fallback. Fallback orchestration belongs exclusively to `AIService`.
3. **No Fallback for Every Error:** Only specifically classified infrastructure/transient failures are fallback-eligible. Domain errors, safety refusals, configuration errors, and validation errors are non-eligible.
4. **Validation Failure Must Not Mean Infrastructure Failure:** Zod validation failure (`AIValidationError`) indicates the provider responded successfully. Fallback on schema validation failure is disabled by default to prevent prompt/schema issues from being misclassified as provider outages.
5. **Safety / Refusal Semantics Must Remain Intentional:** Safety filter refusals (e.g. Gemini prompt/candidate blocks) must NEVER trigger provider fallback to bypass safety policies. Refusals must be re-thrown.
6. **Configuration Failures Require Explicit Policy:** Missing or invalid API keys (`AIConfigurationError`) on the primary or alternate provider fail fast and do not trigger fallback retry loops.
7. **Timeout Behavior Must Remain Bounded:** Primary attempt timeout plus alternate attempt timeout must fit within the caller's total latency budget.
8. **No Duplicate Persistence:** Fallback occurs entirely within `AIService` prior to returning data to domain services (`ProjectAIService`, `TaskAIService`, `ProjectSummaryAIService`). Database persistence runs once on the final valid result.
9. **Preserve Phase 21 Telemetry Guarantees:** Telemetry logs each attempt (`attempt: 1`, `attempt: 2`) with privacy-safe metadata, token usage, duration, provider name, concrete model, and error category without leaking prompt or output payload.
10. **UNKNOWN != ZERO:** Token usage from failed primary attempts (if available, e.g. on response parse errors) is preserved and reported alongside alternate usage. Zero usage is never fabricated.
11. **Provider Abstraction Remains Intact:** `AIProvider` interface remains unchanged. Domain services call `aiService.generateStructuredData()` without awareness of fallback mechanics.
12. **No Provider-Specific Leakage into Domain Services:** Domain services request AI capability tiers (`FAST_JSON`, `DEEP_CONTEXT`) without inspecting provider credentials, fallback ordering, or SDK-specific error codes.

---

## 6. Inherited Platform Guarantees

Phase 22 inherits and preserves all guarantees from Phase 20 and Phase 21:
- Multi-provider abstraction (`AIProvider` interface, `AIProviderFactory`).
- Lazy provider instantiation and process-wide caching.
- Credential isolation per provider (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`).
- `FAST_JSON` and `DEEP_CONTEXT` semantic capability tiers.
- Gemini safety refusal rules and `ONLY STOP` finishReason policy.
- Zod schema validation boundary via `validateAIResponse`.
- Standardized error hierarchy (`AIBaseError`, `AIProviderError`, `AIValidationError`, `AIConfigurationError`, `AITimeoutError`).
- Decoupled structured telemetry observer (`aiLogger.logExecution`).
- Zero-live-call policy for CI and automated test verification.

---

## 7. Phase Boundaries (Phase 22 vs Phase 23)

- **Phase 22 Scope (Resilience Only):** Answers: *"The selected provider failed with a fallback-eligible error. May we safely attempt an alternate configured provider?"*
- **Phase 23 Scope (Intelligent Routing):** Answers: *"Which provider and model should be selected initially for this request based on cost, latency, task complexity, or historical performance?"*

Phase 22 MUST NOT introduce cost-based routing, adaptive provider selection, model scoring, or dynamic primary selection logic.

---

## 8. Success Criteria

1. Fallback-eligible primary failures (5xx, rate limit 429, timeout, network failure, raw structured parse failure) automatically trigger a single alternate provider attempt.
2. Non-fallback errors (safety refusal, missing config, invalid credentials, Zod validation failure, max tokens) immediately re-throw the original error without attempting alternate providers.
3. Telemetry accurately emits per-attempt events tracking primary failure and fallback execution while remaining 100% privacy-safe.
4. Domain services receive identical `AIExecutionResult<T>` data structures without code changes or duplicate side effects.
5. All automated unit tests pass offline with zero external network or AI API calls.
