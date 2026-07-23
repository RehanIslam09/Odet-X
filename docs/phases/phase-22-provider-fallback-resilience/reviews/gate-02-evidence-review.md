# Gate 2 Evidence Review — Phase 22 Provider Fallback & Resilience

## 1. Overview & Gate Details

- **Phase:** Phase 22 — Provider Fallback & Resilience
- **Gate:** Gate 2 — Evidence Approval
- **Status:** APPROVED — READY FOR IMPLEMENTATION
- **Branch:** `feat/phase-22-provider-fallback-resilience`
- **Base Commit:** `faabb77` (main)

This document provides the formal engineering review of Blockade 2 evidence and reconciled Phase 22 documentation (`00-contract.md`, `01-investigation.md`, `02-specification.md`, `03-implementation-plan.md`, and `exp-01` through `exp-06`).

---

## 2. Independent Gate 2 Engineering Evaluation (21 Questions)

### 1. Is application-level execution strictly bounded?
**YES.** Application-level provider attempts are hard-capped at 2 (Attempt 1 Primary $\rightarrow$ Attempt 2 Alternate). Recursion is mathematically impossible (`exp-01-attempt-bounds.md`).

### 2. Are SDK-level retries understood/accounted for?
**YES.** Empirical inspection revealed `@anthropic-ai/sdk` defaults to `maxRetries: 2` and `@google/genai` defaults to `0`. `AnthropicProvider` constructor will explicitly configure `maxRetries: 1` in WP-01 to prevent retry storms.

### 3. Can recursive fallback occur?
**NO.** Providers have zero references to other providers or `AIService`. `AIService` tracks attempts via an internal counter and terminates execution after Attempt 2.

### 4. Is the timeout budget mathematically bounded?
**YES.** Cumulative request timeout is tracked using monotonic time (`performance.now()`). Remaining latency budget $t_{\text{remaining}} = \text{totalBudget} - d_1$ controls the fallback attempt (`exp-02-timeout-budget.md`).

### 5. Is the minimum fallback threshold justified?
**YES.** If $t_{\text{remaining}} < 3000\text{ms}$, launching a secondary LLM request will almost certainly result in immediate timeout, wasting network resources. Fallback is aborted and primary timeout re-thrown.

### 6. Is alternate provider construction genuinely lazy?
**YES.** `AIProviderFactory` instantiates alternate provider instances only when fallback is actually requested (`exp-03-lazy-provider-construction.md`).

### 7. Can missing alternate credentials break primary success?
**NO.** If the primary provider succeeds, the alternate provider is never instantiated, so missing alternate keys have zero impact.

### 8. Is fallback eligibility explicit rather than broad?
**YES.** Gate 1's broad catch was REJECTED. Blockade 2 adopted an **Explicit Allowlist Architecture** (`NETWORK_ERROR`, `TIMEOUT_ERROR`, `RATE_LIMIT_ERROR`, `SERVER_ERROR`, `STRUCTURED_PARSE_ERROR`) (`exp-04-error-eligibility.md`).

### 9. Can unknown provider errors trigger fallback accidentally?
**NO.** Any error not on the explicit allowlist defaults to non-eligible and fails fast.

### 10. Can safety refusals trigger fallback?
**NO.** Safety refusals (`finishReason === 'SAFETY'` or `blockReason`) fail fast to prevent moderation bypass (Invariant 5).

### 11. Can MAX_TOKENS trigger fallback?
**NO.** Output token truncation is non-eligible and fails fast.

### 12. Can Zod validation failures trigger fallback?
**NO.** `AIValidationError` indicates provider output arrived; it fails fast to prevent schema mismatches from being misclassified as provider outages (Invariant 4).

### 13. Is structured parse fallback policy justified?
**YES.** Raw JSON parse failure is fallback-eligible ONLY IF $t_{\text{remaining}} \ge 3000\text{ms}$. Primary token usage is preserved in telemetry.

### 14. Is double-failure behavior deterministic?
**YES.** Instantiates `AIFallbackExecutionError` wrapping both primary and fallback attempt errors (`exp-06-double-failure-semantics.md`).

### 15. Is primary failure context preserved appropriately?
**YES.** Primary error is preserved in `.primaryError` property of `AIFallbackExecutionError` and logged in primary failure telemetry.

### 16. Is telemetry truthful for both attempts?
**YES.** Per-attempt telemetry events log Attempt 1 failure and Attempt 2 fallback status separately (`exp-05-telemetry-attempt-model.md`).

### 17. Is UNKNOWN != ZERO preserved?
**YES.** Primary token usage is logged if received; `usage = undefined` when unknown. Zero usage is never fabricated (Invariant 10).

### 18. Can fallback duplicate persistence?
**NO.** Reinspection of domain AI services verified that database persistence occurs strictly AFTER `AIService` returns. Fallback inside `AIService` produces zero duplicate DB side effects (Invariant 8).

### 19. Can fallback leak credentials?
**NO.** Telemetry logs and error classes strictly exclude process env variables, raw API keys, and authorization headers.

### 20. Has Phase 23 routing logic leaked into Phase 22?
**NO.** The design handles resilience (post-failure fallback) only. Cost-based routing, adaptive scoring, and dynamic model selection remain reserved for Phase 23.

### 21. Are the implementation work packages now precise enough to authorize?
**YES.** WPs 01, 02, and 03 in `03-implementation-plan.md` have been updated with exact failureReason allowlists, aggregate error structures, and unit test requirements.

---

## 3. Gate 2 Approval Requirements Checklist

- [x] Exact fallback eligibility classification (Explicit allowlist)
- [x] Explicit unknown-error fail-fast policy
- [x] Maximum application-level attempts (2)
- [x] SDK retry implications understood & bounded (`maxRetries: 1`)
- [x] Bounded latency policy (`performance.now()`, 3000ms threshold)
- [x] Lazy credential construction & credential isolation
- [x] Deterministic double-failure semantics (`AIFallbackExecutionError`)
- [x] Safety refusal non-fallback guarantee
- [x] Zod validation non-fallback guarantee
- [x] Structured parse failure policy ($t_{\text{remaining}} \ge 3000\text{ms}$)
- [x] Telemetry attempt contract (`attempt: 1`, `attempt: 2`)
- [x] UNKNOWN != ZERO preservation
- [x] Duplicate persistence proof
- [x] Credential privacy proof
- [x] Zero Phase 23 scope leakage

---

## 4. Gate 2 Verdict

```
GATE 2 VERDICT: GATE 2: APPROVED — READY FOR IMPLEMENTATION
```

**Next Authorized Step:**
Implementation of WP-01, WP-02, and WP-03 is now **AUTHORIZED**.
