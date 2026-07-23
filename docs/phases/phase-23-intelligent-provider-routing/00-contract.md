# Phase 23 — Intelligent AI Provider Routing: Reconciled Phase Contract

## 1. Problem Statement

Prior to Phase 23, `AIService` always routed initial AI execution attempts to a single statically configured primary provider (`aiConfig.provider`, defaulting to `'anthropic'`). While Phase 22 introduced automated post-failure resilience (attempting an alternate provider when the primary provider fails due to a transient error), initial request target selection remained completely static regardless of capability tier requirements.

Without intelligent initial routing:
- Fast, low-latency, or budget-sensitive requests (`FAST_JSON`) execute on whatever provider is globally set as primary, missing opportunities to route to cost-optimized or faster initial targets (e.g. Gemini).
- Requests cannot dynamically choose the optimal initial provider based on capability tier and provider credential availability without hardcoding provider names into domain services.

Phase 23 solves this problem by introducing **Intelligent Initial Provider Routing**.

---

## 2. Primary Objective

Establish a deterministic, explainable, provider-neutral initial routing mechanism (`AIRouter`) that evaluates request metadata, capability tiers, provider credential availability, and routing policies to select the optimal initial execution provider (`Attempt 1`), while preserving Phase 22 fallback guarantees (`Attempt 2`) completely intact.

---

## 3. Phase Boundary & Execution Hierarchy

Phase 23 strictly governs **INITIAL TARGET SELECTION** (Attempt 1).
Phase 22 strictly governs **FAILURE RECOVERY & FALLBACK** (Attempt 2).

```
                        Domain AI Request
                               │
                               ▼
                      Phase 23 AIRouter
                   (Select Initial Target)
                               │
                               ▼
                           AIService
                               │
                               ▼
                 Attempt 1 (Selected Provider)
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
             SUCCESS                       FAILURE
            (Return)                          │
                                  Is Fallback Eligible?
                                 (Phase 22 Evaluation)
                                              │
                                   ┌──────────┴──────────┐
                                   ▼                     ▼
                                  YES                    NO
                                   │                  (Re-throw)
                         Attempt 2 (Alternate)
                        (Phase 22 Execution)
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
                 SUCCESS                       FAILURE
                (Return)              (AIFallbackExecutionError)
```

### Critical Separation Guarantees:
1. **Phase 23 Router NEVER executes requests directly.** It only returns a routing decision `AIRoutingDecision`.
2. **Phase 23 Router NEVER handles post-failure recovery.** If Attempt 1 fails, control transfers exclusively to Phase 22 fallback logic.
3. **Phase 22 Fallback mechanism remains unchanged.** The alternate provider name is resolved dynamically relative to the router's selected initial provider (`AIProviderFactory.resolveAlternateProviderName(selectedProvider)`).

---

## 4. Relationship to Previous Phases

- **Phase 20 (Structured Outputs & Prompt Management):** Established prompt templates, Zod schema validation, and domain service encapsulation.
- **Phase 21 (AI Observability & Usage Telemetry):** Established structured JSON logging, execution IDs, performance timing, and `AITelemetryEvent` observation.
- **Phase 22 (Provider Fallback & Resilience):** Established two-attempt maximum bounds, explicit failure allowlist (`isFallbackEligible`), lazy alternate provider resolution, latency budget preservation, and per-attempt fallback telemetry. **Phase 22 is an immutable baseline for Phase 23.**
- **Phase 23 (Intelligent Provider Routing):** Adds pre-execution target selection, selecting Attempt 1 target dynamically based on deterministic policy and availability.

---

## 5. Governance Budget & Clock Policy

- Maximum application execution attempts: **2** (1 initial routed attempt + 1 Phase 22 fallback attempt).
- Maximum total execution budget: `options.timeoutMs || aiConfig.timeouts.standard` (default 30,000ms).
- Request clock start: Monotonic request timer starts at `generateStructuredData()` entry **BEFORE** invoking `AIRouter`, naturally including router execution in caller budget.
- Minimum remaining budget required for Phase 22 fallback attempt: **3,000ms**.
- Router Performance Architectural Guarantee: `AIRouter` performs synchronous, deterministic, in-memory policy evaluation with zero network I/O. Router execution time is naturally included in total request latency budget because the clock starts before `AIRouter` is invoked.

---

## 6. Phase 23 Safety Invariants

| # | Safety Invariant | Description |
|---|------------------|-------------|
| **INV-23-01** | **Deterministic Routing** | Given an identical routing context (`AIRoutingContext`) and an identical configuration snapshot, `AIRouter` MUST output the exact same routing decision (`AIRoutingDecision`) every time. |
| **INV-23-02** | **Phase 22 Compatibility** | Phase 23 MUST NOT replace, duplicate, bypass, or alter Phase 22 fallback rules, allowlists, or attempt limits. Maximum application attempts remains 2. |
| **INV-23-03** | **Domain-Service Neutrality** | Domain AI services (`project-ai.service`, `task-ai.service`, `project-summary-ai.service`) MUST remain 100% provider-agnostic and consume only `AIModelTier`. |
| **INV-23-04** | **Provider Abstraction** | The `AIProvider` base interface MUST NOT be modified or polluted with routing/policy logic. Concrete providers retain sole ownership of model resolution via `getModelForTier(tier)`. `AIRouter` selects initial provider only. |
| **INV-23-05** | **Factory Integrity** | `AIProviderFactory` MUST remain responsible solely for constructing and caching provider instances. Routing decisions MUST NOT live inside the factory. |
| **INV-23-06** | **Credential Isolation** | Router candidate filtering MUST verify credential existence via configuration inspection (`Boolean(apiKey && apiKey.trim().length > 0)`) without instantiating SDK clients or throwing constructor exceptions. Phase 23 defines a stricter routing-validity rule than legacy provider constructor falsiness checks: whitespace-only credentials (e.g., `'   '`) are treated as unconfigured. |
| **INV-23-07** | **Zero Secret Leakage** | API keys, secret headers, and authorization tokens MUST NEVER be logged, included in telemetry, or exposed in error messages. |
| **INV-23-08** | **Privacy Protection** | Routing telemetry MUST NOT log prompt text, user IDs, business payloads, or raw LLM output. Telemetry uses bounded strategy (`routingStrategy`) and reason code (`routingReasonCode`) enums. |
| **INV-23-09** | **Timeout Preservation** | Monotonic budget tracking begins before router evaluation and spans Attempt 1 and Attempt 2. Router evaluation is synchronous and in-memory. |
| **INV-23-10** | **Offline Testability** | All routing logic, candidate selection, custom provider seams, and fallback interplay MUST be testable 100% offline without live API credentials. |
| **INV-23-11** | **Safe Fail-Fast** | If zero candidate providers have valid credentials configured, `AIRouter` MUST throw an `AIConfigurationError` immediately before Attempt 1 starts without attempting execution. Unsupported tiers also fail fast cleanly before Attempt 1 without triggering Phase 22 fallback. |
| **INV-23-12** | **No Dynamic External Pricing** | Routing MUST rely on static, internal policy rules. It MUST NOT make network calls to fetch live pricing or perform dynamic health scoring. |

---

## 7. Explicit Non-Goals

- **NO Live Pricing APIs:** Fetching pricing data from external endpoints at runtime is strictly out of scope.
- **NO Adaptive / ML Historical Routing:** Dynamic routing based on rolling historical latency/error rates is deferred to preserve complete determinism.
- **NO Hedging / Parallel Racing:** Executing requests concurrently to multiple providers and returning the fastest response is prohibited.
- **NO Modification to Phase 22 Allowlists:** `isFallbackEligible` allowlist and bounds will not be altered.
- **NO Direct SDK Invocation in Router:** Router only selects provider names; instantiation remains in `AIProviderFactory`.
- **NO `preferredProvider` Parameter:** Provider override options are not exposed to domain services.
- **NO Router Model Resolution:** `AIRouter` does NOT resolve concrete model strings (solely owned by providers).
- **NO Dynamic `costClass` / `latencyClass` Telemetry Assertions:** Speculative cost/latency metadata classes are removed.

---

## 8. Success Criteria

1. `AIRouter` created in `server/src/ai/routing/` with 100% deterministic initial target selection.
2. `AIService` updated to query `AIRouter` for Attempt 1 provider selection while retaining full Phase 22 fallback orchestration for Attempt 2.
3. Custom provider injection (`this.customProvider`) cleanly bypasses `AIRouter` for offline testing.
4. Domain services remain 100% untouched and provider-agnostic.
5. Comprehensive test coverage added for all routing scenarios: tier routing, missing credentials, whitespace credentials, tie-breaking, no-provider fail-fast, invalid tier fail-fast, Phase 22 fallback compatibility, custom provider seams, and telemetry logging.
6. All tests pass offline without external API access or real credentials.
