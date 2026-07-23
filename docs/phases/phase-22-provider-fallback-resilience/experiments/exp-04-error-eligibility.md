# Experiment 04 — Explicit Error Eligibility & Allowlist Adoption

## 1. Executive Summary

Experiment 04 challenged the preliminary error eligibility logic proposed in Gate 1. It evaluated the risks of broad error catching and formulated an **Explicit Allowlist Architecture** for fallback classification.

---

## 2. Gate 1 Design Challenge & Risk Analysis

Gate 1 proposed:
```typescript
// Gate 1 Preliminary Logic:
if (error instanceof AIProviderError && !error.isSafetyRefusal && !error.isMaxTokens) {
  return true;
}
```

### Risk Identified:
Defaulting to `true` for all `AIProviderError` instances means that any newly introduced, unclassified, or unknown provider error would automatically trigger provider fallback. This violates Invariant 3 (*No fallback for every error*) and risks unexpected failover behavior during unhandled edge cases.

---

## 3. Explicit Allowlist Architecture (Adopted Refinement)

To enforce fail-safe defaults, Phase 22 adopts an **Explicit Allowlist Policy**:
An error is fallback-eligible **ONLY IF** its normalized failure reason matches a specifically approved, transient infrastructure or formatting failure reason.

### Fallback-Eligible Allowlist Reasons:
1. `NETWORK_ERROR`: Connection drop, socket hangup, DNS resolution failure.
2. `TIMEOUT_ERROR`: Request exceeded allowed execution duration (`AITimeoutError`).
3. `RATE_LIMIT_ERROR`: HTTP 429 Too Many Requests / Quota Exceeded.
4. `SERVER_ERROR`: HTTP 500, 503, 504 Provider infrastructure failure.
5. `STRUCTURED_PARSE_ERROR`: Primary provider returned unparseable text instead of valid JSON.

### Non-Eligible Categories (FAIL FAST):
1. `SAFETY_REFUSAL`: Content moderation block (Gemini `blockReason` or finishReason `SAFETY`).
2. `MAX_TOKENS_TRUNCATION`: Output truncated due to token limit (`finishReason === 'MAX_TOKENS'`).
3. `AUTHENTICATION_ERROR`: Bad API key or unauthorized request (HTTP 401, 403).
4. `CONFIGURATION_ERROR`: Missing environment credentials or invalid provider setup (`AIConfigurationError`).
5. `VALIDATION_ERROR`: Provider output failed Zod schema bounds (`AIValidationError`).
6. `UNKNOWN_ERROR`: Programming error, TypeError, or unmapped exception.

---

## 4. Comprehensive Failure Classification Matrix

| Failure Event | Exception Class | Reason Code | Fallback Eligible? | Action Taken |
|---|---|---|:---:|---|
| Connection Drop | `AIProviderError` | `NETWORK_ERROR` | **YES** | Trigger Alternate Provider |
| Request Timeout | `AITimeoutError` | `TIMEOUT_ERROR` | **YES** | Trigger Alternate Provider (if latency remains) |
| HTTP 429 Rate Limit | `AIProviderError` | `RATE_LIMIT_ERROR` | **YES** | Trigger Alternate Provider |
| HTTP 500/503/504 | `AIProviderError` | `SERVER_ERROR` | **YES** | Trigger Alternate Provider |
| Raw JSON Syntax Error | `AIProviderError` | `STRUCTURED_PARSE_ERROR` | **YES** | Trigger Alternate Provider (if latency remains) |
| HTTP 401/403 Auth | `AIConfigurationError` | `AUTHENTICATION_ERROR` | **NO** | Fail Fast (Re-throw Original) |
| Missing API Key | `AIConfigurationError` | `CONFIGURATION_ERROR` | **NO** | Fail Fast (Re-throw Original) |
| Zod Schema Mismatch | `AIValidationError` | `VALIDATION_ERROR` | **NO** | Fail Fast (Re-throw Original) |
| Gemini Safety Block | `AIProviderError` | `SAFETY_REFUSAL` | **NO** | Fail Fast (Re-throw Original) |
| Output Truncated | `AIProviderError` | `MAX_TOKENS_TRUNCATION` | **NO** | Fail Fast (Re-throw Original) |
| Unhandled TypeError | `TypeError` / `Error` | `UNKNOWN_ERROR` | **NO** | Fail Fast (Re-throw Original) |

---

## 5. Structured Parse Failure Evaluation

Unlike network drops, a structured parse failure occurs after the LLM model completes output generation:
- Tokens were consumed during the primary attempt.
- Usage metadata may exist.
- Fallback consumes additional tokens on the alternate provider.

### Decision:
Structured parse failure remains fallback-eligible **ONLY IF** remaining latency budget $t_{\text{remaining}} \ge 3000\text{ms}$. Primary token usage (if present in response metadata) is preserved and logged in primary failure telemetry.

---

## 6. Conclusion & Evidence Status

- **Broad Catch Rejected:** Broad `AIProviderError` fallback rejected (REJECTED).
- **Explicit Allowlist Adopted:** Fallback authorized strictly for explicit allowlist reasons (CONFIRMED & ADOPTED).
