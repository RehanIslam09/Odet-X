# Experiment 03: Credential Availability & Discovery Semantics

## 1. Question / Hypothesis
What API key string values render a provider constructable vs unconstructable? How should `AIRouter` discover provider availability without triggering constructor exceptions or instantiating SDK clients?

## 2. Repository Evidence Inspected
- `server/src/ai/config/ai.config.ts`
- `server/src/ai/providers/anthropic.provider.ts`
- `server/src/ai/providers/gemini.provider.ts`

### Findings:
1. `AnthropicProvider` constructor checks `const apiKey = aiConfig.anthropic.apiKey; if (!apiKey) throw new AIConfigurationError(...)`.
2. `GeminiProvider` constructor checks `const apiKey = aiConfig.gemini.apiKey; if (!apiKey) throw new AIConfigurationError(...)`.
3. In JavaScript, `Boolean('')` and `Boolean(undefined)` evaluate to `false`.
4. However, whitespace-only strings like `'   '` evaluate to `true` under `Boolean('   ')`, but represent invalid API keys.

## 3. Analysis & Risk Evaluation
- Checking `Boolean(apiKey)` alone would falsely classify `'   '` as an available provider.
- Calling `AIProviderFactory.getProvider(name)` inside `AIRouter` to test availability would instantiate SDK clients and throw `AIConfigurationError` exceptions when keys are missing, breaking candidate discovery.
- An inspective helper `isProviderConfigured(providerName)` using `Boolean(apiKey && apiKey.trim().length > 0)` accurately checks availability without side effects or SDK instantiation.

## 4. Final Decision
- Provider credential availability is defined as: `Boolean(apiKey && apiKey.trim().length > 0)`.
- `AIRouter` inspects `aiConfig` parameters directly without calling `AIProviderFactory.getProvider()`.

## 5. Status
**CONFIRMED & REFINED** (Trimmed string non-empty condition established as authoritative availability rule).
