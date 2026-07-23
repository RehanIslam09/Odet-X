# Experiment 02: Model Resolution Ownership & Authority

## 1. Question / Hypothesis
Who owns concrete model resolution for a capability tier? Should `AIRoutingDecision` return `selectedModel`, or does `AIProvider.getModelForTier(tier)` retain sole authority?

## 2. Repository Evidence Inspected
- `server/src/ai/providers/base.provider.ts`
- `server/src/ai/providers/anthropic.provider.ts`
- `server/src/ai/providers/gemini.provider.ts`
- `server/src/ai/ai.service.ts`

### Findings:
1. `AIProvider` base interface defines `getModelForTier(tier: AIModelTier): string`.
2. `AnthropicProvider.getModelForTier(tier)` resolves model via `aiConfig.models.fastJson` or `aiConfig.models.deepContext`.
3. `GeminiProvider.getModelForTier(tier)` resolves model via `aiConfig.gemini.models.fastJson` or `aiConfig.gemini.models.deepContext`.
4. `AIService.executeSingleAttempt()` calls `provider.getModelForTier(options.tier)` prior to execution and captures actual provider response metadata model string (`providerResponse.metadata.model`).

## 3. Analysis & Risk Evaluation
- If `AIRouter` implemented duplicate model lookup logic (`AIRouter.resolveModelForProvider`), it would establish a secondary authority for model mapping.
- If provider model mapping configuration changes or a custom provider is injected, `AIRouter`'s model string could drift from the actual model executed by `AIProvider`.
- `AIRouter` needs only to select the **PROVIDER TARGET** (`selectedProvider`). The executing provider owns resolving its own concrete model.

## 4. Final Decision
- **AIRouter selects PROVIDER TARGET ONLY (`selectedProvider`).**
- `AIProvider` remains sole owner of model resolution via `getModelForTier(tier)`.
- `AIRoutingDecision` will **NOT contain `selectedModel`**.
- Model string is resolved by the executing provider in `executeSingleAttempt()` as established in Phase 20/21/22.

## 5. Status
**CONFIRMED & REFINED** (Removed `selectedModel` from `AIRoutingDecision` to eliminate duplicate authority and configuration drift risk).
