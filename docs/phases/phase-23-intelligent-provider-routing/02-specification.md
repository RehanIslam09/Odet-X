# Phase 23 — Candidate Architecture Specification: Intelligent Provider Routing (Reconciled)

## 1. Routing Component Architecture & Boundaries

The Phase 23 routing system introduces a dedicated, provider-agnostic router (`AIRouter`) located at `server/src/ai/routing/ai.router.ts`.

### Component Diagram:

```
                  ┌──────────────────────────────┐
                  │    Domain AI Consumers       │
                  │ (project-ai, task-ai, etc.)  │
                  └──────────────┬───────────────┘
                                 │ generateStructuredData(template, schema, options)
                                 ▼
                  ┌──────────────────────────────┐
                  │          AIService           │
                  └──────────────┬───────────────┘
                                 │
                     1. selectInitialProvider({ tier: options.tier })
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │          AIRouter            │
                  │  - Candidate Eligibility     │
                  │  - Static Tier Policy Match  │
                  │  - Tie-Breaking Rules        │
                  └──────────────┬───────────────┘
                                 │ returns AIRoutingDecision
                                 ▼
                  ┌──────────────────────────────┐
                  │          AIService           │
                  │  - Executes Attempt 1        │
                  │  - Triggers Phase 22 if fail │
                  └──────────────────────────────┘
```

---

## 2. Type & Interface Specifications

### 2.1 Routing Input (`AIRoutingContext`)

```typescript
export interface AIRoutingContext {
  tier: AIModelTier;
}
```

### 2.2 Routing Decision & Enums (`AIRoutingDecision`)

```typescript
export type AIRoutingStrategy =
  | 'STATIC_TIER_POLICY'
  | 'SINGLE_CONFIGURED_PROVIDER'
  | 'INJECTED_PROVIDER_OVERRIDE';

export type AIRoutingReasonCode =
  | 'FAST_TIER_OPTIMAL_TARGET'
  | 'DEEP_TIER_PRIMARY_TARGET'
  | 'SINGLE_PROVIDER_AVAILABLE'
  | 'INJECTED_PROVIDER_OVERRIDE';

export interface AIRoutingDecision {
  selectedProvider: string;
  routingStrategy: AIRoutingStrategy;
  routingReasonCode: AIRoutingReasonCode;
  candidateProviders: string[];
}
```

---

## 3. Deterministic Routing Truth Table & Policy Matrix

| Anthropic Key | Gemini Key | Tier | Configured Primary | Attempt 1 Target | Strategy | Reason Code |
|---------------|------------|------|--------------------|------------------|----------|-------------|
| NO | NO | ANY | ANY | **THROW `AIConfigurationError`** | N/A | N/A |
| YES | NO | `FAST_JSON` | anthropic | `'anthropic'` | `SINGLE_CONFIGURED_PROVIDER` | `SINGLE_PROVIDER_AVAILABLE` |
| YES | NO | `DEEP_CONTEXT` | anthropic | `'anthropic'` | `SINGLE_CONFIGURED_PROVIDER` | `SINGLE_PROVIDER_AVAILABLE` |
| NO | YES | `FAST_JSON` | anthropic | `'gemini'` | `SINGLE_CONFIGURED_PROVIDER` | `SINGLE_PROVIDER_AVAILABLE` |
| NO | YES | `DEEP_CONTEXT` | anthropic | `'gemini'` | `SINGLE_CONFIGURED_PROVIDER` | `SINGLE_PROVIDER_AVAILABLE` |
| YES | YES | `FAST_JSON` | anthropic | `'gemini'` | `STATIC_TIER_POLICY` | `FAST_TIER_OPTIMAL_TARGET` |
| YES | YES | `FAST_JSON` | gemini | `'gemini'` | `STATIC_TIER_POLICY` | `FAST_TIER_OPTIMAL_TARGET` |
| YES | YES | `DEEP_CONTEXT` | anthropic | `'anthropic'` | `STATIC_TIER_POLICY` | `DEEP_TIER_PRIMARY_TARGET` |
| YES | YES | `DEEP_CONTEXT` | gemini | `'gemini'` | `STATIC_TIER_POLICY` | `DEEP_TIER_PRIMARY_TARGET` |

### Credential Eligibility Rule & Whitespace Semantics:
A provider is eligible if and only if its API key is configured with a non-empty, trimmed value:
- `'anthropic'` is eligible if `Boolean(config.anthropic.apiKey && config.anthropic.apiKey.trim().length > 0)` is `true`.
- `'gemini'` is eligible if `Boolean(config.gemini.apiKey && config.gemini.apiKey.trim().length > 0)` is `true`.
- Whitespace-only credentials (e.g., `'   '`, `'\t'`, `'\n'`) are considered UNCONFIGURED by `AIRouter`. Phase 23 defines this stricter routing-validity rule than legacy provider constructor falsiness checks.

### Policy Rules:
1. **Unsupported Tier Fail-Fast:** If `context.tier` is not a valid `AIModelTier` (`FAST_JSON` or `DEEP_CONTEXT`), throw `AIConfigurationError` before Attempt 1 starts without executing SDKs or triggering Phase 22 fallback.
2. **Zero Candidate Fail-Fast:** If `candidateProviders.length === 0`, throw `AIConfigurationError` before Attempt 1 starts without executing SDKs or triggering Phase 22 fallback.
3. **Single Candidate:** If `candidateProviders.length === 1`, route to that candidate with strategy `'SINGLE_CONFIGURED_PROVIDER'` and reason code `'SINGLE_PROVIDER_AVAILABLE'`.
4. **Both Candidates - `FAST_JSON`:** Route to `'gemini'` with strategy `'STATIC_TIER_POLICY'` and reason code `'FAST_TIER_OPTIMAL_TARGET'`.
5. **Both Candidates - `DEEP_CONTEXT`:** Route to `config.provider` (configured primary, if available in candidate set) with strategy `'STATIC_TIER_POLICY'` and reason code `'DEEP_TIER_PRIMARY_TARGET'`.

---

## 4. Algorithmic Pseudocode

```typescript
export class AIRouter {
  public static selectInitialProvider(
    context: AIRoutingContext,
    configOverride?: typeof aiConfig
  ): AIRoutingDecision {
    const config = configOverride || aiConfig;

    // 1. Validate Tier Semantic Input
    if (!context || !Object.values(AIModelTier).includes(context.tier)) {
      throw new AIConfigurationError(`Unsupported or invalid AI model tier: '${context?.tier}'`);
    }

    // 2. Discover Candidate Providers (Trimmed Credential Inspection)
    const candidates: string[] = [];
    if (Boolean(config.anthropic.apiKey && config.anthropic.apiKey.trim().length > 0)) {
      candidates.push('anthropic');
    }
    if (Boolean(config.gemini.apiKey && config.gemini.apiKey.trim().length > 0)) {
      candidates.push('gemini');
    }

    // 3. Fail Fast if No Providers Available
    if (candidates.length === 0) {
      throw new AIConfigurationError('No configured AI providers available for routing. Please check API key environment variables.');
    }

    // 4. Handle Single Candidate Case
    if (candidates.length === 1) {
      return {
        selectedProvider: candidates[0],
        routingStrategy: 'SINGLE_CONFIGURED_PROVIDER',
        routingReasonCode: 'SINGLE_PROVIDER_AVAILABLE',
        candidateProviders: candidates,
      };
    }

    // 5. Tier Policy Evaluation (Both Available)
    let selectedProvider = config.provider;
    let reasonCode: AIRoutingReasonCode = 'DEEP_TIER_PRIMARY_TARGET';

    if (context.tier === AIModelTier.FAST_JSON && candidates.includes('gemini')) {
      selectedProvider = 'gemini';
      reasonCode = 'FAST_TIER_OPTIMAL_TARGET';
    } else {
      selectedProvider = candidates.includes(config.provider) ? config.provider : candidates[0];
      reasonCode = 'DEEP_TIER_PRIMARY_TARGET';
    }

    return {
      selectedProvider,
      routingStrategy: 'STATIC_TIER_POLICY',
      routingReasonCode: reasonCode,
      candidateProviders: candidates,
    };
  }
}
```

---

## 5. AIService Orchestration & Custom Provider Seam Integration

In `AIService.generateStructuredData`:

```typescript
// 1. Monotonic Request Timer Start (All orchestration overhead included in budget)
const requestStartMonotonic = performance.now();
const totalTimeoutMs = options.timeoutMs || aiConfig.timeouts.standard;
const executionId = crypto.randomUUID();

// 2. Custom Provider Test Seam Check
let primaryProvider: AIProvider;
let routingDecision: AIRoutingDecision;

if (this.customProvider) {
  // Test seam: Bypass AIRouter credential checks completely
  primaryProvider = this.customProvider;
  routingDecision = {
    selectedProvider: this.customProvider.providerName,
    routingStrategy: 'INJECTED_PROVIDER_OVERRIDE',
    routingReasonCode: 'INJECTED_PROVIDER_OVERRIDE',
    candidateProviders: [this.customProvider.providerName],
  };
} else {
  // 3. Initial Provider Target Selection (Phase 23)
  routingDecision = AIRouter.selectInitialProvider({ tier: options.tier });
  primaryProvider = AIProviderFactory.getProvider(routingDecision.selectedProvider);
}

// 4. Attempt 1 Execution (Primary Target)
try {
  return await this.executeSingleAttempt(
    primaryProvider,
    template,
    schema,
    { ...options, timeoutMs: totalTimeoutMs },
    executionId,
    { attempt: 1, isFallback: false, routingDecision }
  );
} catch (primaryError: any) {
  // 5. Fallback Authorization & Attempt 2 Execution (Phase 22 Unchanged)
  // ...
}
```

---

## 6. Telemetry Integration Specification

`AITelemetryEvent` in `server/src/ai/types/index.ts` is extended with routing fields:

```typescript
export interface AITelemetryEvent {
  // ... Existing Phase 21 & Phase 22 fields ...
  routingStrategy?: AIRoutingStrategy;
  routingReasonCode?: AIRoutingReasonCode;
  candidateProviders?: string[];
}
```

### Telemetry Privacy Rules:
- `routingStrategy`: Enumerable strategy string (e.g. `'STATIC_TIER_POLICY'`).
- `routingReasonCode`: Enumerable reason code (e.g. `'FAST_TIER_OPTIMAL_TARGET'`).
- `candidateProviders`: Array of provider name strings (e.g. `['anthropic', 'gemini']`).
- **PROHIBITED:** Prompts, user IDs, business payloads, API keys, arbitrary free-form reason strings.

---

## 7. Component Responsibility Matrix

| Component | Owns | Explicitly Does NOT Own |
|-----------|------|-------------------------|
| **Domain AI Services** | Capability tier request (`AIModelTier`) | Provider selection, fallback logic, model selection |
| **AIRouter** | Initial provider target selection (`Attempt 1`) | Execution, model resolution, fallback |
| **AIService** | Central orchestration & clock budgeting | Provider SDK logic |
| **AIProviderFactory** | Provider construction & instance caching | Routing policy |
| **Concrete Provider** | SDK execution & model resolution (`getModelForTier`) | Cross-provider routing |
| **Phase 22 Fallback** | Post-failure fallback authorization (`Attempt 2`) | Initial provider routing |
