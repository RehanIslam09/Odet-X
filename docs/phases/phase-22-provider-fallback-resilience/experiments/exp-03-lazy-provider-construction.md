# Experiment 03 — Lazy Alternate Provider Construction & Credential Isolation

## 1. Executive Summary

Experiment 03 evaluated provider construction mechanics in `AIProviderFactory` to verify lazy instantiation guarantees and establish error handling policies when fallback triggers under missing alternate credentials.

---

## 2. Lazy Instantiation Proof

`AIProviderFactory.getProvider(name?: string)` manages provider instances process-wide:

```typescript
// server/src/ai/providers/provider.factory.ts
public static getProvider(name?: string): AIProvider {
  const providerName = (name || aiConfig.provider).toLowerCase().trim();
  if (this.cache.has(providerName)) {
    return this.cache.get(providerName)!;
  }
  let provider: AIProvider;
  switch (providerName) {
    case 'anthropic':
      provider = new AnthropicProvider();
      break;
    case 'gemini':
      provider = new GeminiProvider();
      break;
    ...
  }
  this.cache.set(providerName, provider);
  return provider;
}
```

### Scenario Analysis:

1. **Primary Provider Success:**
   - Configuration: `AI_PROVIDER=gemini`. `GEMINI_API_KEY` present, `ANTHROPIC_API_KEY` missing.
   - Execution: Primary Gemini executes and succeeds.
   - Result: `AIProviderFactory.getProvider('anthropic')` is **NEVER** called. `AnthropicProvider` constructor is never executed. Missing `ANTHROPIC_API_KEY` causes **ZERO** impact on primary Gemini requests.

2. **Primary Failure + Missing Alternate Credential:**
   - Configuration: `AI_PROVIDER=gemini`. Gemini fails with fallback-eligible HTTP 503 error. `ANTHROPIC_API_KEY` missing.
   - Execution: `AIService` catches 503, resolves alternate provider name (`anthropic`), and calls `AIProviderFactory.getProvider('anthropic')`.
   - Result: `AnthropicProvider` constructor executes `if (!apiKey) throw new AIConfigurationError(...)`.

---

## 3. Evaluation of Alternate Construction Failure Policies

When primary fails with a fallback-eligible error (e.g. 503) and fallback construction fails due to missing credentials (`AIConfigurationError`), which error should escape `AIService`?

- **Policy A (Throw alternate `AIConfigurationError` only):**
  - *Cons:* Masks the primary 503 infrastructure outage that triggered fallback in the first place.
- **Policy B (Re-throw primary error only):**
  - *Cons:* Masks the misconfiguration of the alternate provider, preventing ops from discovering missing keys.
- **Policy C (Deterministic Aggregate / Wrapped Error - SELECTED):**
  - Create `AIFallbackExecutionError` wrapping both errors:
    - Primary error retained in `.primaryError` (and `cause`).
    - Alternate error retained in `.fallbackError`.
    - Message explicitly logs both events: `Primary provider 'gemini' failed with PROVIDER_ERROR (503). Fallback provider 'anthropic' failed with CONFIGURATION_ERROR (Missing API key).`

---

## 4. Credential Leakage Audit

Inspected error formatting and exception classes:
- Neither `AIConfigurationError` nor `AIFallbackExecutionError` format raw API key strings or process env objects into error messages.
- Error strings report missing key names (e.g. `'ANTHROPIC_API_KEY'`), never secret values.
- Privacy guarantee maintained.

---

## 5. Conclusion & Evidence Status

- **Lazy Construction:** CONFIRMED (Alternate provider instantiated strictly on-demand).
- **Credential Isolation:** CONFIRMED (Missing alternate key does not break primary success).
- **Alternate Construction Failure Policy:** Policy C (Deterministic Aggregate Error) adopted.
