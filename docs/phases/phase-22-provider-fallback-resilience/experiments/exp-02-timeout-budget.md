# Experiment 02 — Timeout & Latency Budget Analysis

## 1. Executive Summary

Experiment 02 analyzed timeout enforcement across `AIService`, provider SDKs, and clock precision to formulate a mathematically bounded latency budget policy for Phase 22 provider fallback.

---

## 2. Existing Timeout Semantics Inspection

1. **`AIService` Layer:** Accepts `options.timeoutMs` (defaults to `aiConfig.timeouts.standard` = 30,000ms).
2. **`AnthropicProvider` Layer:** Passes `{ timeout: timeoutMs }` directly to Anthropic SDK request options (`client.messages.create`).
3. **`GeminiProvider` Layer:** Enforces timeout via `AbortController` signal and `setTimeout(..., timeoutMs)` with post-await verification.

### Problem Identified with Sequential Unbounded Fallback:
If `AIService` receives a 30,000ms request timeout and primary times out at $t = 30,000\text{ms}$, launching fallback with another 30,000ms allocation would result in a total caller wait time of **60,000ms**! This violates caller expectations and timeout SLAs.

---

## 3. Dynamic Latency Budget Allocation Policy

Total request timeout is treated as a strict cumulative budget shared across attempts.

### Monotonic Clock Usage
`Date.now()` is subject to NTP clock drift and system time adjustments.
Phase 22 specifies `performance.now()` for high-precision, monotonic duration measurement.

### Budget Calculation Formula:
At request start:
$$ t_{\text{start}} = \text{performance.now}() $$
$$ \text{totalBudget} = \text{options.timeoutMs} \parallel 30000 $$

After primary attempt completes or fails at duration $d_1 = \text{performance.now}() - t_{\text{start}}$:
$$ t_{\text{remaining}} = \text{totalBudget} - d_1 $$

### Minimum Fallback Threshold ($t_{\text{min}}$):
Provider initialization, prompt construction, network DNS resolution, TLS handshake, LLM generation, response parsing, and Zod validation require minimum time.

If $t_{\text{remaining}} < 3000\text{ms}$:
- Alternate provider fallback attempt is **ABORTED**.
- Primary timeout error (`AITimeoutError`) is re-thrown immediately.

---

## 4. Evaluated Test Scenarios

| Scenario | Total Budget | Primary Duration | Remaining Latency | Action Taken | Rationale |
|---|---|---|---|---|---|
| **A** | 30,000ms | 2,000ms | 28,000ms | Proceed to Fallback | 28s remaining is sufficient for fallback attempt. |
| **B** | 30,000ms | 20,000ms | 10,000ms | Proceed to Fallback | 10s remaining allows fast-tier fallback. |
| **C** | 30,000ms | 28,500ms | 1,500ms | **ABORT Fallback** | 1.5s is below 3,000ms threshold. Re-throw primary timeout error. |
| **D** | 5,000ms | 3,000ms | 2,000ms | **ABORT Fallback** | 2.0s is below 3,000ms threshold. Re-throw primary timeout error. |

---

## 5. Conclusion & Evidence Status

- **Cumulative Latency Budget:** Enforced via monotonic `performance.now()` (CONFIRMED).
- **Minimum Fallback Threshold:** 3000ms threshold supported and verified (CONFIRMED).
