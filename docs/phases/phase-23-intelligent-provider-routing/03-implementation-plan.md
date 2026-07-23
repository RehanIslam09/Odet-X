# Phase 23 — Implementation Plan: Intelligent AI Provider Routing (Reconciled)

## Work Package Overview

| Package ID | Package Name | Target Area | Key Responsibility |
|------------|--------------|-------------|-------------------|
| **WP-01** | AIRouter Core Engine | `server/src/ai/routing/` | Implement deterministic candidate filtering, tier policy matching, and `AIRoutingDecision` resolution. |
| **WP-02** | AIService Orchestration Binding | `server/src/ai/ai.service.ts` | Bind `AIRouter` to `AIService` Attempt 1 target selection while preserving Phase 22 Attempt 2 fallback resolution. |
| **WP-03** | Telemetry & Observability Integration | `server/src/ai/types/index.ts`, `logger.ts` | Enrich `AITelemetryEvent` with privacy-safe routing decision metadata. |
| **WP-04** | Comprehensive Testing Suite | `server/src/tests/` | Implement unit and integration tests verifying all routing scenarios and safety invariants offline. |

---

## Work Package Details

### WP-01: AIRouter Core Engine

- **Purpose:** Create a standalone, deterministic routing engine (`AIRouter`) that evaluates capability tiers and provider credential availability to select the initial execution target for Attempt 1.
- **Target Files:**
  - `server/src/ai/routing/ai.router.ts` [NEW]
  - `server/src/ai/routing/types.ts` [NEW]
- **Expected Inputs:**
  - `AIRoutingContext`: `{ tier: AIModelTier }`
  - Optional `configOverride?: typeof aiConfig` (for unit testing)
- **Expected Outputs:**
  - `AIRoutingDecision`: `{ selectedProvider: string; routingStrategy: AIRoutingStrategy; routingReasonCode: AIRoutingReasonCode; candidateProviders: string[]; }`
- **Expected Behavior:**
  - Inspects `config` for candidate credential availability (`Boolean(apiKey && apiKey.trim().length > 0)`) without instantiating SDK clients or calling `AIProviderFactory.getProvider()`.
  - Treats whitespace-only credentials (e.g. `'   '`) as unconfigured.
  - Matches requested `AIModelTier` (`FAST_JSON` vs `DEEP_CONTEXT`) against static routing policies.
  - If `FAST_JSON`: selects `'gemini'` if available, else `'anthropic'`.
  - If `DEEP_CONTEXT`: selects `config.provider` (configured primary) if available, else available candidate.
  - Returns structured `AIRoutingDecision`.
  - Throws `AIConfigurationError` if zero candidates are usable or if an unsupported/invalid tier is provided.
- **Required Unit Tests:**
  - Valid `FAST_JSON` routing (selects Gemini when available).
  - Valid `DEEP_CONTEXT` routing (selects configured primary when available).
  - Anthropic-only credentials configured.
  - Gemini-only credentials configured.
  - Both credentials configured.
  - Neither credential configured (throws `AIConfigurationError`).
  - Whitespace-only credentials `'   '` (treated as unconfigured, throws `AIConfigurationError`).
  - Configured-primary tie-breaking.
  - Deterministic repeated execution (identical context + identical config = identical decision).
  - Unsupported/invalid tier fail-fast (throws `AIConfigurationError`).
  - Verification that zero provider construction occurs during candidate discovery.
- **Invariants Protected:** INV-23-01 (Determinism), INV-23-04 (Provider Abstraction), INV-23-05 (Factory Integrity), INV-23-06 (Credential Isolation), INV-23-11 (Safe Fail-Fast), INV-23-12 (No External Pricing).
- **Explicit Out of Scope:** `preferredProvider` handling, `selectedModel` resolution in router, `costClass`/`latencyClass` metadata, SDK client instantiation, network calls, Phase 22 post-failure handling.

---

### WP-02: AIService Orchestration Binding

- **Purpose:** Update `AIService.generateStructuredData()` to use `AIRouter` for dynamic Attempt 1 target selection while preserving custom provider test seams and Phase 22 fallback logic.
- **Target Files:**
  - `server/src/ai/ai.service.ts` [MODIFY]
- **Expected Behavior:**
  - Starts request timer (`requestStartMonotonic = performance.now()`) at `generateStructuredData()` entry **BEFORE** invoking `AIRouter`.
  - Evaluates `this.customProvider`: if set, bypasses `AIRouter` and executes `this.customProvider` as Attempt 1 with `routingStrategy: 'INJECTED_PROVIDER_OVERRIDE'` and `routingReasonCode: 'INJECTED_PROVIDER_OVERRIDE'`.
  - Otherwise, invokes `AIRouter.selectInitialProvider({ tier: options.tier })` and retrieves target provider instance from `AIProviderFactory.getProvider(selectedProvider)`.
  - Executes Attempt 1 against routed provider target.
  - If Attempt 1 fails with an eligible error (`isFallbackEligible(primaryError)`), resolves alternate provider relative to routed provider (`resolveAlternateProviderName(routedProvider)`).
  - Executes Attempt 2 against alternate provider if latency budget (`totalTimeoutMs - elapsedMs >= 3000ms`) permits.
- **Required Tests:**
  - Verification that Attempt 1 executes against routed target.
  - Verification that Attempt 2 fallback resolves dynamically (e.g. `gemini -> anthropic` or `anthropic -> gemini`).
  - Verification that `this.customProvider` dependency injection bypasses `AIRouter` cleanly without requiring environment API keys.
- **Invariants Protected:** INV-23-02 (Phase 22 Compatibility), INV-23-03 (Domain-Service Neutrality), INV-23-09 (Timeout Preservation), INV-23-10 (Offline Testability).
- **Explicit Out of Scope:** Modifying domain services, modifying `AIProvider` base interface, modifying `AIProviderFactory`.

---

### WP-03: Telemetry & Observability Integration

- **Purpose:** Extend `AITelemetryEvent` and update `aiLogger` to record routing decision metadata (`routingStrategy`, `routingReasonCode`, `candidateProviders`) securely.
- **Target Files:**
  - `server/src/ai/types/index.ts` [MODIFY]
  - `server/src/ai/utils/logger.ts` [MODIFY]
  - `server/src/ai/ai.service.ts` [MODIFY]
- **Expected Behavior:**
  - Pass `routingDecision` metadata from `executeSingleAttempt` into `aiLogger.logExecution()`.
  - Include `routingStrategy`, `routingReasonCode`, and `candidateProviders` in telemetry logs.
  - Enforce privacy sanitization (zero PII, zero prompt content, zero API keys, zero free-form reason strings).
- **Required Tests:**
  - Telemetry observer tests asserting routing metadata fields (`routingStrategy`, `routingReasonCode`, `candidateProviders`) are populated on success and failure.
  - Privacy audit tests confirming no prompts, API keys, or dynamic user text are leaked in telemetry logs.
- **Invariants Protected:** INV-23-07 (Zero Secret Leakage), INV-23-08 (Privacy Protection).
- **Explicit Out of Scope:** Modifying external log aggregation sinks.

---

### WP-04: Comprehensive Testing Suite

- **Purpose:** Add dedicated offline unit and integration tests verifying end-to-end initial provider routing, tie-breaking, credential isolation, custom provider test seams, and Phase 22 fallback interplay.
- **Target Files:**
  - `server/src/tests/routing.test.ts` [NEW]
  - `server/src/tests/routing-fallback.test.ts` [NEW]
- **Expected Behavior:**
  - Test `FAST_JSON` routes to Gemini when available.
  - Test `DEEP_CONTEXT` routes to Anthropic/configured primary.
  - Test single-provider environment configuration (only Anthropic or only Gemini configured).
  - Test whitespace credential environment (`'   '`) treated as unconfigured.
  - Test zero-provider fail-fast behavior (`AIConfigurationError`).
  - Test invalid/unsupported tier fail-fast behavior (`AIConfigurationError`).
  - Test custom provider dependency injection bypass (`this.customProvider`).
  - Test end-to-end fallback when initial routed provider fails (`gemini -> anthropic` and `anthropic -> gemini`).
  - Verify domain services operate unchanged and all tests pass 100% offline.
- **Required Tests:**
  - Full suite execution via `npm test`.
- **Invariants Protected:** INV-23-10 (Offline Testability).
- **Explicit Out of Scope:** Live external API network requests.
