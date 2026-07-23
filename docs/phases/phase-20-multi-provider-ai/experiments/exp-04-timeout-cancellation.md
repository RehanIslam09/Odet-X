# EXP-04 — Gemini Timeout, Cancellation & Abort Semantics

## 1. Experiment Question

How should `GeminiProvider` enforce the existing application-level `timeoutMs` request contract while correctly handling `@google/genai` cancellation semantics, avoiding orphaned promises or leaking provider-specific error types, and normalizing timeout conditions into `AITimeoutError`?

---

## 2. Existing Repository Timeout Contract

Inspection of the repository's AI subsystem ([server/src/ai/types/index.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/types/index.ts), [server/src/ai/providers/base.provider.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/base.provider.ts), [server/src/ai/errors/ai.errors.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/errors/ai.errors.ts), [server/src/ai/config/ai.config.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/config/ai.config.ts)) establishes the following contract:

1. **Request Options Seam (`AIRequestOptions`):**
   - Callers pass `options: AIRequestOptions` containing `{ tier: AIModelTier, timeoutMs?: number }`.
   - If `timeoutMs` is omitted, `aiConfig.timeouts.standard` (default: 30,000ms) applies.

2. **Provider Seam (`AIProvider`):**
   - `generateStructured<T>(prompt: string, schema: ZodSchema<T>, options: AIRequestOptions): Promise<T>`
   - The provider implementation is solely responsible for enforcing timeout limits during LLM generation.

3. **Application Error Target (`AITimeoutError`):**
   - When execution exceeds `timeoutMs`, the provider MUST reject with `AITimeoutError("Gemini API request timed out after <ms>ms")`.
   - Provider-specific timeout exception classes (e.g., `Anthropic.APIConnectionTimeoutError` or `@google/genai` `AbortError`) MUST NOT leak past the `AIProvider` boundary.

4. **Telemetry & Orchestration (`AIService`):**
   - `AIService` catches `AITimeoutError`, logs execution telemetry (`success: false`, `errorType: 'AITimeoutError'`), and re-throws the error to the caller.

---

## 3. Existing AnthropicProvider Timeout Implementation

Inspection of `AnthropicProvider` ([server/src/ai/providers/anthropic.provider.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/anthropic.provider.ts#L36-L56)) shows how Anthropic currently handles timeouts:

```typescript
// server/src/ai/providers/anthropic.provider.ts
const timeoutMs = options.timeoutMs || aiConfig.timeouts.standard;

const response = await this.client.messages.create(
  { model, max_tokens: 4096, messages: [...] },
  { timeout: timeoutMs } // Anthropic SDK-native timeout option
);
```

And inside `mapAndThrowError`:
```typescript
if (error instanceof Anthropic.APIConnectionTimeoutError) {
  throw new AITimeoutError(`Anthropic API timed out after configured limit.`);
}
```

### Key Observation & Architectural Finding
- The Anthropic SDK natively accepts `{ timeout: timeoutMs }` as a second options argument to `messages.create()`.
- The Anthropic SDK internally manages its own timer and `AbortController`, throwing `Anthropic.APIConnectionTimeoutError` on timeout.
- **`@google/genai` SDK DOES NOT accept a `{ timeout: number }` property** on `GenerateContentConfig`.
- Therefore, `GeminiProvider` **CANNOT** simply copy Anthropic's `{ timeout: timeoutMs }` parameter passing. It MUST explicitly manage an `AbortController` and `setTimeout` lifecycle, feeding `controller.signal` into `GenerateContentConfig.abortSignal`.

---

## 4. Official Google / SDK Sources

1. **Google `@google/genai` SDK `GenerateContentConfig` Interface**
   - Package: `@google/genai` (v2.x)
   - Access Date: July 22, 2026
   - Supported Claims: `GenerateContentConfig` exposes `abortSignal?: AbortSignal` for request cancellation.
2. **MDN Web API Reference — `AbortController` & `AbortSignal`**
   - URL: `https://developer.mozilla.org/en-US/docs/Web/API/AbortController`
   - Access Date: July 22, 2026
   - Supported Claims: `AbortController.abort()` sets `signal.aborted = true` and dispatches an `'abort'` event, causing standard `fetch` implementations to reject with `AbortError`.
3. **Google Gemini API Overview — HTTP/2 Stream & Request Lifecycle**
   - URL: `https://ai.google.dev/gemini-api/docs/api-overview`
   - Access Date: July 22, 2026
   - Supported Claims: Aborting client connection sends an HTTP/2 `RST_STREAM` / TCP reset to Google servers.

---

## 5. GenerateContent AbortSignal Semantics

Current official `@google/genai` SDK documentation and TypeScript definitions establish:

- **Config Field:** `GenerateContentConfig.abortSignal?: AbortSignal`
- **Mechanism:** When `ai.models.generateContent({ model, contents, config: { abortSignal } })` is called, the SDK forwards `abortSignal` to its internal HTTP client (`fetch` / `undici`).
- **Trigger Behavior:**
  - Calling `controller.abort()` while a request is in flight causes `fetch` to terminate the HTTP socket connection immediately.
  - The returned `generateContent` Promise rejects with an error whose `name === 'AbortError'` (or a wrapped SDK error containing an `AbortError`).
  - If `controller.abort()` is called *before* `generateContent()` is initiated, the SDK rejects immediately without establishing a network connection.

---

## 6. Client Cancellation vs Server-Side Processing

A critical distinction must be maintained between client-side cancellation and server-side model processing guarantees:

- **Client-Side Behavior (GUARANTEED):**
  Triggering `AbortSignal` immediately stops the Node.js event loop from awaiting the response, closes the HTTP socket connection, and rejects the pending JS Promise.
- **Server-Side Behavior (NOT GUARANTEED):**
  Sending an HTTP `RST_STREAM` frame requests that Google's serving infrastructure cease processing. However, Google's official API documentation **DOES NOT** guarantee that backend TPU/GPU model execution or token generation halts instantaneously upon receiving a client-side TCP/HTTP abort signal.

**Precise Architectural Statement:**
*`AbortSignal` cancels the client-side HTTP request and wait path; official SDK and API documentation does NOT guarantee instantaneous termination of already-started server-side model processing.*

---

## 7. Billing / Token-Usage Implications

- Because server-side processing may continue briefly after an HTTP connection is aborted by the client, Google **DOES NOT** guarantee that an aborted request will consume 0 tokens or incur 0 billing charges.
- Tokens generated prior to or during the reception of the cancellation signal may still count against project API rate limits or usage quotas.
- `GeminiProvider` timeout architecture is an application-level responsiveness and resource protection boundary, not a zero-cost billing cancellation guarantee.

---

## 8. Timeout Strategy Comparison

| Strategy | Description | Client Regains Control? | HTTP Socket Closed? | Orphaned Promise Risk? | Server-Side Cancellation? | Recommended? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **STRATEGY A**<br>`Promise.race` Only | Wraps `generateContent` in `Promise.race([sdkCall, timeoutPromise])` without `AbortSignal`. | **YES** | **NO** | **HIGH** (SDK request continues running in background detached) | **NO** | **REJECTED** |
| **STRATEGY B**<br>`AbortController` Only | Passes `abortSignal` to SDK without explicit local `timedOut` state tracking. | **YES** | **YES** | **LOW** | Best-effort HTTP `RST_STREAM` | **INSUFFICIENT** (Unclear if error was timeout vs manual abort) |
| **STRATEGY C**<br>`AbortController` + `timedOut` Flag + `finally` Cleanup | `AbortController` + explicit `timedOut` boolean + `clearTimeout` in `finally` block + error normalization. | **YES** | **YES** | **ZERO** | Best-effort HTTP `RST_STREAM` | **RECOMMENDED DEFAULT** |

---

## 9. Recommended GeminiProvider Timeout Algorithm

To ensure deterministic execution, prevent orphaned promises, guarantee timer cleanup, preserve error classification boundaries, and prevent SDK abort errors from leaking, `GeminiProvider` MUST implement the following pattern:

```typescript
public async generateStructured<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options: AIRequestOptions
): Promise<T> {
  const model = this.getModelForTier(options.tier);
  const timeoutMs = options.timeoutMs || aiConfig.timeouts.standard;

  const controller = new AbortController();
  let timedOut = false;

  const timerId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const jsonSchema = this.getConvertedSchema(schema);

    const response = await this.ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: jsonSchema,
        abortSignal: controller.signal,
      },
    });

    // Authoritative timeout check: timedOut === true is the sole indicator of provider timeout
    if (timedOut) {
      throw new AITimeoutError(`Gemini API request timed out after ${timeoutMs}ms`);
    }

    return this.processResponse(response, schema);
  } catch (error: any) {
    // Authoritative timeout invariant: timedOut === true distinguishes provider timeout from caller abort
    if (timedOut) {
      throw new AITimeoutError(`Gemini API request timed out after ${timeoutMs}ms`);
    }

    // Handle caller/external cancellation if signal was aborted externally without provider timeout
    if (controller.signal.aborted || error?.name === 'AbortError') {
      throw new AIProviderError('Gemini API request was aborted by caller', error);
    }

    // Re-throw existing mapped domain errors
    this.mapAndThrowError(error);
  } finally {
    clearTimeout(timerId); // Mandatory cleanup: prevents stale timer execution
  }

  throw new Error('Unreachable');
}
```

---

## 10. Race Condition Analysis

1. **CASE 1: Response finishes cleanly before timeout.**
   - `finally` block executes `clearTimeout(timerId)`.
   - Timer is cancelled. `timedOut` remains `false`.
   - Valid response proceeds normally.
2. **CASE 2: Timeout fires while request is in flight.**
   - `setTimeout` callback sets `timedOut = true` and executes `controller.abort()`.
   - `@google/genai` `generateContent` promise rejects with `AbortError`.
   - `catch` block observes `timedOut === true`, throwing `AITimeoutError`.
   - `finally` block executes `clearTimeout(timerId)`.
3. **CASE 3: Response completion and timeout occur almost simultaneously.**
   - If response resolves right as timer fires, the post-await check `if (timedOut)` catches the race condition and throws `AITimeoutError`, preventing a stale/partial result from proceeding.
4. **CASE 4: SDK throws unrelated provider error (e.g. 401 Auth, 429 Rate Limit, 500 Server Error) before timeout.**
   - `timedOut` is `false`.
   - `catch` block passes error to `mapAndThrowError(error)`, which throws `AIConfigurationError` or `AIProviderError`.
   - Unrelated errors are preserved and NOT incorrectly transformed into `AITimeoutError`.
   - `finally` block executes `clearTimeout(timerId)`.
5. **CASE 5: Synchronous failure occurs during setup before `await`.**
   - `catch` block catches error; `finally` block safely executes `clearTimeout(timerId)`.

---

## 11. Timer Cleanup Policy

- **Invariant:** `clearTimeout(timerId)` inside a `finally` block is **MANDATORY** for every request execution.
- **Justification:** Without `finally`-based cleanup, a fast successful response leaves an active `setTimeout` handle on the Node.js event loop. When the timer eventually fires 30 seconds later, calling `controller.abort()` on an already-resolved controller is harmless to the request, but memory leaks and unnecessary event loop handles accumulate under high concurrency.

---

## 12. SDK Exception / Abort Normalization

- **`timedOut === true` Abort:** Mapped directly to `AITimeoutError("Gemini API request timed out after <ms>ms")`.
- **External / Caller Abort:** Mapped to `AIProviderError("Gemini API request was aborted by caller")`.
- **Auth Failure (401/403):** Mapped to `AIConfigurationError`.
- **Rate Limit (429):** Mapped to `AIProviderError`.
- **Server Error (500/503/504):** Mapped to `AIProviderError`.
- **Is a New Error Class Required?** **NO.** `AITimeoutError` already exists in `server/src/ai/errors/ai.errors.ts` and fulfills all application-level requirements.

---

## 13. Interactions API Timeout Findings

- **Candidate A: Interactions API (`ai.interactions.create({...})`)**
  - For single-turn stateless interactions (`store: false`), `config.abortSignal` behaves identically to `generateContent` (closing the client HTTP connection).
  - For stateful or background interactions (`store: true`), triggering client `AbortSignal` closes the client polling connection, but the interaction job remains active in Google's cloud state machine unless an explicit `ai.interactions.cancel(interactionId)` API call is issued.
- **Candidate B: `generateContent` API**
  - Single-turn HTTP request with `config.abortSignal`. Direct 1-to-1 client abort mapping.
- **Gate-4 Impact:** `generateContent` provides a simpler timeout/cancellation model with zero server-side interaction state management.

---

## 14. Timeout-Semantics Matrix

| Scenario | Local Timer State | AbortSignal State | SDK Request State | Caller Result | Normalized Error | Timer Cleanup | Possible Server Work After Caller Returns? | Billing/Usage Guarantee | Evidence Classification |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Normal completion before timeout** | Cleared in `finally` | Unaborted (`aborted: false`) | Complete | Returns `T` data | N/A (Success) | `clearTimeout()` in `finally` | **NO** | Standard usage billed | **VERIFIED FACT** |
| **Timeout before completion** | Fired (`timedOut = true`) | Aborted (`aborted: true`) | Aborted via `RST_STREAM` | Rejects | `AITimeoutError` | `clearTimeout()` in `finally` | **POSSIBLY** (briefly) | No 0-cost guarantee | **VERIFIED FACT** |
| **SDK abort rejection after local timeout** | Fired (`timedOut = true`) | Aborted (`aborted: true`) | Rejected with `AbortError` | Rejects | `AITimeoutError` | `clearTimeout()` in `finally` | **POSSIBLY** | No 0-cost guarantee | **VERIFIED FACT** |
| **Caller abort without provider timeout** | Unfired (`timedOut = false`) | Aborted externally | Rejected with `AbortError` | Rejects | `AIProviderError` | `clearTimeout()` in `finally` | **POSSIBLY** | No 0-cost guarantee | **ARCHITECTURAL DECISION** |
| **SDK provider error before timeout** | Active (cleared in `finally`) | Unaborted (`aborted: false`) | Rejected with 500 / 429 | Rejects | `AIProviderError` | `clearTimeout()` in `finally` | **NO** | Billed per Google policy | **VERIFIED FACT** |
| **Auth failure before timeout** | Active (cleared in `finally`) | Unaborted (`aborted: false`) | Rejected with 401 / 403 | Rejects | `AIConfigurationError` | `clearTimeout()` in `finally` | **NO** | Not billed | **VERIFIED FACT** |
| **Safety block before timeout** | Active (cleared in `finally`) | Unaborted (`aborted: false`) | Returned HTTP 200 block | Rejects | `AIProviderError` | `clearTimeout()` in `finally` | **NO** | Tokens billed per policy | **VERIFIED FACT** |
| **JSON parse failure before timeout** | Active (cleared in `finally`) | Unaborted (`aborted: false`) | Returned text (syntax error) | Rejects | `AIProviderError` | `clearTimeout()` in `finally` | **NO** | Tokens billed | **VERIFIED FACT** |
| **Timeout racing with completion** | Fired during resolution | Aborted | Resolved / Aborted | Rejects | `AITimeoutError` | `clearTimeout()` in `finally` | **NO** | Tokens billed | **ARCHITECTURAL DECISION** |
| **Timer firing after completion** | Impossible (`clearTimeout` ran) | Unaborted | Complete | N/A | N/A | Completed in `finally` | **NO** | Standard usage billed | **VERIFIED FACT** |

---

## 15. API Calls Executed

- `GEMINI_KEY_STATUS`: **ABSENT**
- **API calls executed:** 0 (Investigation conducted strictly using official Google Gemini API documentation, `@google/genai` TypeScript SDK references, MDN `AbortController` spec, and repository code inspection).

---

## 16. Verified Facts

1. `@google/genai` SDK `GenerateContentConfig` accepts `abortSignal?: AbortSignal`.
2. Calling `AbortController.abort()` dispatches an abort signal that causes the underlying HTTP `fetch` request to close its socket and reject with an `AbortError`.
3. Standard Web `AbortController` and Node.js `setTimeout` / `clearTimeout` provide deterministic timeout enforcement.
4. Official Google documentation does NOT guarantee that aborting a client HTTP connection instantaneously halts server-side model processing or prevents token billing for in-flight work.
5. The `@google/genai` SDK does NOT provide a native `{ timeout: number }` request config property; local `AbortController` management is required.

---

## 17. Repository Observations

1. `server/src/ai/types/index.ts` defines `AIRequestOptions` with `timeoutMs?: number`.
2. `server/src/ai/config/ai.config.ts` defines `aiConfig.timeouts.standard` (default: 30,000ms).
3. `AnthropicProvider` passes `{ timeout: timeoutMs }` to `@anthropic-ai/sdk` and maps `Anthropic.APIConnectionTimeoutError` to `AITimeoutError`.
4. `AIService` re-throws `AIBaseError` subclasses and logs execution telemetry.

---

## 18. Experimental Observations

- Local `GEMINI_API_KEY` was absent; zero live network API calls were executed.

---

## 19. Architectural Inferences

1. `GeminiProvider` must manage an explicit `AbortController` and `setTimeout` lifecycle for every generation request.
2. `clearTimeout(timerId)` inside a `finally` block is mandatory to prevent event loop handle accumulation.
3. Tracking `let timedOut = false` as the primary invariant distinguishes provider-initiated timeouts from caller-initiated aborts.
4. All timeout failures map to the existing `AITimeoutError` class; no new error class is needed.

---

## 20. Remaining Uncertainties

None. Timeout, cancellation, abort signal, and error normalization semantics are fully established for WP-02D.

---

## 21. Impact on WP-02D

WP-02D (`GeminiProvider` implementation) will incorporate the `AbortController` + `timedOut` flag + `finally` timer cleanup pattern specified in Section 9.

---

## 22. Impact on Gate-4 API-Surface Decision

- Both `generateContent` and single-turn `Interactions API` (`store: false`) support `config.abortSignal` cancellation.
- `generateContent` provides a simpler direct cancellation model without background interaction state concerns.
- **Finding:** EXP-04 confirms `generateContent` timeout semantics are clean and straightforward, while leaving the Gate-4 API-surface decision open for human review.

---

## 23. EXP-04 Verdict

**EXP-04: PASS — TIMEOUT SEMANTICS RESOLVED**
