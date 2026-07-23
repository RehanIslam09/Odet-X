# Experiment 06 — Double Failure Semantics & Exception Design

## 1. Executive Summary

Experiment 06 settled the error semantics and exception hierarchy when both primary and fallback attempts fail, ensuring complete internal error context while maintaining public error sanitization.

---

## 2. Problem Statement

When both primary provider (Attempt 1) and alternate fallback provider (Attempt 2) fail:
- Throwing only the alternate error discards the primary failure cause.
- Throwing only the primary error discards the fallback failure cause.

---

## 3. Evaluation of Exception Options

- **Option A (Throw alternate error only):** Discards primary outage context. Operator cannot diagnose why primary failed.
- **Option B (Throw primary error only):** Discards fallback failure context. Developer cannot see why fallback failed.
- **Option C (AIFallbackExecutionError Aggregate Class - SELECTED):**
  Introduce a specialized aggregate error class extending `AIBaseError`:

```typescript
export class AIFallbackExecutionError extends AIBaseError {
  constructor(
    message: string,
    public readonly primaryError: AIBaseError,
    public readonly fallbackError: AIBaseError,
    public readonly primaryProvider: string,
    public readonly fallbackProvider: string
  ) {
    super(message);
  }
}
```

---

## 4. Exception Mapping & Sanitization Pipeline

```
[Primary Attempt Fails (e.g. HTTP 503)]
            │
            ▼
[Fallback Attempt Fails (e.g. HTTP 429)]
            │
            ▼
[AIFallbackExecutionError Instantiated]
    ├── .primaryError = AIProviderError (503)
    ├── .fallbackError = AIProviderError (429)
    ├── .primaryProvider = 'gemini'
    └── .fallbackProvider = 'anthropic'
            │
            ▼
[Logged internally via aiLogger & console]
            │
            ▼
[Express Error Handler / Application Layer]
    └── Sanitized Public Message: "AI service unavailable across configured providers."
```

### Properties Preserved:
1. **Internal Debugging:** Full error details for both attempts present in `AIFallbackExecutionError`.
2. **Telemetry:** Both primary failure and fallback failure logged as separate telemetry events.
3. **Public API Safety:** Express middleware converts `AIFallbackExecutionError` into a safe 503 HTTP response without leaking stack traces or internal configuration.

---

## 5. Conclusion & Evidence Status

- **Double Failure Exception Design:** `AIFallbackExecutionError` adopted (CONFIRMED & ADOPTED).
- **Public Error Sanitization:** Verified (CONFIRMED).
