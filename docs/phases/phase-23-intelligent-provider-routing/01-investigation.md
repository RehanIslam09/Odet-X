# Phase 23 — Investigation Report: AI Provider Selection & Routing Architecture (Reconciled)

## 1. Executive Summary

This investigation documents the current AI provider selection, model resolution, tier handling, credential management, timeout budgeting, and telemetry pipelines in the repository as of the merged Phase 22 baseline (`feat/phase-23-intelligent-provider-routing`), updated with reconciled Blockade 2 evidence findings.

---

## 2. Current Selection & Execution Pipeline

```
Domain AI Service (e.g. project-ai.service.ts)
    │
    ▼
Prompt Registry & Template Builder
    │
    ▼
AIService.generateStructuredData(template, schema, options)
    │
    ├──> 1. Clock Start (performance.now())
    │
    ├──> 2. Custom Provider Check:
    │      ├── IF this.customProvider: Bypass AIRouter, execute injected provider directly
    │      └── ELSE: Invoke AIRouter.selectInitialProvider({ tier: options.tier })
    │
    ├──> 3. Execute Attempt 1: executeSingleAttempt(selectedProvider, ...)
    │      ├── provider.getModelForTier(options.tier) [Provider-owned model resolution]
    │      ├── provider.generateStructured(prompt, schema, options)
    │      └── aiLogger.logExecution(...) [Includes routingStrategy, routingReasonCode, candidateProviders]
    │
    └──> 4. If Attempt 1 Fails (Fallback-Eligible):
           ├── Evaluate isFallbackEligible(primaryError)
           ├── Resolve Alternate Name: AIProviderFactory.resolveAlternateProviderName(primaryProviderName)
           ├── Check Remaining Timeout: totalTimeoutMs - elapsedMs >= 3000ms
           ├── Construct Alternate Provider: AIProviderFactory.getProvider(alternateProviderName)
           └── Execute Attempt 2: executeSingleAttempt(alternateProvider, ...)
```

---

## 3. Capability Tiers and Domain AI Feature Matrix

| Domain AI Feature | File Location | Requested Tier | Rationale | Current Resolved Model (Anthropic) | Current Resolved Model (Gemini) |
|-------------------|---------------|----------------|-----------|-------------------------------------|---------------------------------|
| **Generate Project Tasks** | [project-ai.service.ts](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/server/src/services/project-ai.service.ts#L89) | `DEEP_CONTEXT` | Complex planning, multi-step task breakdown | `claude-3-sonnet-20240229` | `gemini-3.6-flash` |
| **Auto-Label Task** | [task-ai.service.ts](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/server/src/services/task-ai.service.ts#L87) | `DEEP_CONTEXT` | Requires deep context of project description & existing task titles | `claude-3-sonnet-20240229` | `gemini-3.6-flash` |
| **Generate Project Summary** | [project-summary-ai.service.ts](file:///wsl$/Ubuntu/home/rehan/Developer/ai-project-manager/server/src/services/project-summary-ai.service.ts#L94) | `DEEP_CONTEXT` | Multi-task aggregation, risk synthesis | `claude-3-sonnet-20240229` | `gemini-3.6-flash` |

Domain services remain 100% provider-agnostic.

---

## 4. Provider Credential Management & Lazy Construction Findings

### Current Behavior & Reconciled Routing Rule:
- `AnthropicProvider` constructor checks `aiConfig.anthropic.apiKey`. If missing (`!apiKey`), throws `AIConfigurationError`.
- `GeminiProvider` constructor checks `aiConfig.gemini.apiKey`. If missing (`!apiKey`), throws `AIConfigurationError`.
- `AIProviderFactory` constructs providers **lazily** on `getProvider(name)` and caches them in a `Map<string, AIProvider>`.

### Phase 23 Credential Rule:
- Inspecting provider availability for initial routing MUST NOT trigger premature instantiation of unconfigured providers (which would throw `AIConfigurationError` during candidate discovery).
- Credential presence is checked inspectively via `aiConfig` parameters (`Boolean(apiKey && apiKey.trim().length > 0)`).
- **Note on Credential Semantics:** Phase 23 defines a stricter routing-validity rule than legacy provider constructor falsiness checks. Whitespace-only credentials (e.g. `'   '`) are treated as unconfigured by `AIRouter`.

---

## 5. Interaction with Phase 22 Fallback Architecture

Phase 22 baseline invariants remain 100% immutable.
If Phase 23 routes Attempt 1 to `'gemini'`, `resolveAlternateProviderName('gemini')` returns `'anthropic'`.
If Phase 23 routes Attempt 1 to `'anthropic'`, `resolveAlternateProviderName('anthropic')` returns `'gemini'`.
Thus, Phase 23 dynamic initial provider selection works **seamlessly and symmetrically** with Phase 22 post-failure fallback logic without altering Phase 22 code!

---

## 6. Timeout Budgeting Findings

- Request total timeout timer starts at `AIService.generateStructuredData()` entry **BEFORE** calling `AIRouter`.
- Synchronous in-memory routing via `AIRouter` takes zero I/O and has minimal overhead (< 1ms).
- Overall timeout budget spans Attempt 1 and Attempt 2 monotonically (`totalTimeoutMs - elapsedMs >= 3000ms`).

---

## 7. Candidate Routing Signals Audit

| Signal Name | Accepted for Phase 23? | Final Status |
|-------------|------------------------|--------------|
| `AIModelTier` (`FAST_JSON` / `DEEP_CONTEXT`) | **ACCEPTED** | Canonical routing context input (`AIRoutingContext`). |
| Provider Key Configuration Availability | **ACCEPTED** | Candidate discovery filter (`Boolean(apiKey && apiKey.trim().length > 0)`). |
| Global Primary Preference (`AI_PROVIDER`) | **ACCEPTED** | Static default / tie-breaker. |
| `preferredProvider` | **REJECTED** | Removed to prevent domain service coupling. |
| Prompt Name / Version | **SUPERSEDED** | Passed to telemetry, but omitted from `AIRoutingContext`. |
| Request Timeout (`timeoutMs`) | **SUPERSEDED** | Passed to execution options, but omitted from `AIRoutingContext`. |
| Concrete Model Name | **REJECTED** | Model resolution owned solely by `AIProvider.getModelForTier(tier)`. |
| `costClass` / `latencyClass` | **REJECTED / REMOVED** | Speculative metadata removed from `AIRoutingDecision` to avoid inventing unsupported assertions. |
| Rolling Historical Latency / Error Rates | **DEFERRED** | Deferred to preserve pure determinism. |

---

## 8. Reconciled Answers to Phase 23 Architectural Questions

1. **Where should the routing decision live?** Dedicated `AIRouter` class in `server/src/ai/routing/ai.router.ts`.
2. **Should routing be inside AIService, AIRouter, or AIProviderFactory?** Dedicated `AIRouter`.
3. **Should AIProviderFactory remain purely responsible for construction/caching?** YES.
4. **Should AIProvider interface change?** NO.
5. **Should AIRequestOptions change?** NO.
6. **What exact inputs may the router consume?** `AIRoutingContext`: `{ tier: AIModelTier }` (plus optional `configOverride` for test isolation).
7. **What exact outputs should the router produce?** `AIRoutingDecision`: `{ selectedProvider, routingStrategy, routingReasonCode, candidateProviders }`.
8. **Should the router select provider or provider+model?** Selects **PROVIDER TARGET ONLY**. Concrete model resolution is owned solely by `AIProvider.getModelForTier(tier)`.
9. **Should capability tier remain main semantic input?** YES (`AIModelTier`).
10. **How should missing provider credentials affect routing?** Unconfigured providers (`Boolean(apiKey && apiKey.trim().length > 0) === false`) are excluded from candidate set. If zero candidates, throw `AIConfigurationError`.
11. **How does Phase 22 determine alternate after dynamic routing?** `AIProviderFactory.resolveAlternateProviderName(selectedProvider)`.
12. **How to guarantee determinism?** Pure function: `(context, configSnapshot) => AIRoutingDecision`. No random numbers or dynamic state.
13. **Cost & Latency Class disposition?** **REMOVED** from `AIRoutingDecision` and telemetry to avoid speculative assertions.
14. **Historical telemetry routing decision?** Deferred.
15. **Tie-breaking policy?** System configured primary provider (`aiConfig.provider`) wins ties.
16. **Zero usable providers?** Throws `AIConfigurationError` immediately before Attempt 1 without executing SDKs or triggering fallback.
17. **Unsupported tier?** Throws `AIConfigurationError` immediately before Attempt 1 without triggering fallback.
18. **Telemetry metadata?** `routingStrategy`, `routingReasonCode`, `candidateProviders`. Bounded enums, zero PII.
19. **Timeout budget impact?** Monotonic clock starts before `AIRouter` call in `generateStructuredData()`. Router evaluation is synchronous and in-memory.
20. **Functionality remaining outside Phase 23?** Hedging, live pricing APIs, adaptive ML historical scoring, Phase 22 allowlist modifications, model resolution duplication, domain service modifications.
