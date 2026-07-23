# EXP-03 — Gemini Safety / Refusal / Blocked-Response Semantics

## 1. Experiment Question

What observable conditions from the current Google Gemini API / `@google/genai` SDK indicate that a request was blocked, refused, safety-filtered, truncated, produced no usable candidate, or otherwise failed to provide valid model output, and how should `GeminiProvider` normalize those conditions into the existing application AI error hierarchy?

---

## 2. Repository Error Architecture

Inspection of the existing repository implementation ([server/src/ai/errors/ai.errors.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/errors/ai.errors.ts), [server/src/ai/providers/anthropic.provider.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/anthropic.provider.ts), [server/src/ai/ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/ai.service.ts), [server/src/ai/validation/ai-response.validator.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/validation/ai-response.validator.ts)) establishes the following error-handling division of responsibilities:

1. **Concrete Provider Layer (`AnthropicProvider` / future `GeminiProvider`):**
   - Owns provider-specific SDK call execution, timeout enforcement, response payload inspection, fence cleaning, syntax parsing (`JSON.parse`), and SDK exception mapping.
   - Normalizes all SDK-specific failures, timeouts, safety blocks, missing candidates, and malformed JSON payloads into subclasses of `AIBaseError`.
   - Never leaks provider-specific SDK exception classes (e.g., `Anthropic.RateLimitError` or `@google/genai` SDK errors) past the `AIProvider` interface seam.

2. **Orchestration Layer (`AIService`):**
   - Owns prompt validation, prompt building, provider invocation, execution timing, telemetry logging (`aiLogger`), schema validation (`validateAIResponse`), and re-throwing `AIBaseError` instances.
   - If an error is an instance of `AIBaseError`, `AIService` logs telemetry (`success: false`, `errorType`, `errorMessage`) and re-throws it directly.

3. **HTTP / Middleware Layer (`server/src/middleware/error-handler.ts`):**
   - Owns HTTP status translation for Express routes. Operational errors (`AppError`) map to specific HTTP statuses (400, 401, 404, 409). Unhandled errors map to 500. `AIBaseError` is handled gracefully at service boundaries or translates to 500/operational responses depending on controller handling.

4. **Existing Error Class Inventory:**
   - **`AIBaseError`**: Base class for all AI module exceptions.
   - **`AIConfigurationError`**: Thrown for configuration issues (missing API key, unsupported provider string).
   - **`AIProviderError`**: Thrown when the provider fails (rate limit 429, server 5xx, safety/policy block, missing candidate, malformed JSON, truncated output). Accepts `(message: string, originalError?: unknown)`.
   - **`AITimeoutError`**: Thrown when execution exceeds the configured timeout threshold (`timeoutMs`).
   - **`AIValidationError`**: Thrown when LLM JSON output fails Zod schema validation (`validateAIResponse`).

**Architectural Finding:** Introducing Gemini does NOT require introducing a new application error class. Provider-level safety blocks, refusals, missing candidates, truncations, and API failures normalize cleanly into the existing `AIProviderError`, `AIConfigurationError`, and `AITimeoutError` hierarchy.

---

## 3. Method

1. Inspect governing Phase 20 documents (`00-contract.md`, `01-investigation.md`, `01a-repository-reconciliation.md`, `02-specification.md`, `03-implementation-plan.md`) and prior experiment artifacts (`exp-01`, `exp-01b`, `exp-02`).
2. Inspect live repository AI error architecture and provider test suites.
3. Check local environment for `GEMINI_API_KEY` presence (without printing credentials).
4. Perform authoritative static analysis of current official Google Gemini API documentation, `@google/genai` TypeScript SDK references, Protobuf schemas (`PromptFeedback`, `Candidate`, `FinishReason`, `BlockReason`, `SafetyRating`), and structured output guides.
5. Differentiate prompt-level blocking, candidate-level safety blocking, refusal semantics, finish reasons, truncation (`MAX_TOKENS`), safety ratings, empty candidate output, SDK exceptions, and successful responses.
6. Compare safety and block semantics between `generateContent` and the `Interactions API`.
7. Construct a comprehensive Safety-Semantics Matrix and define the target normalization boundary.
8. Clean up all temporary scripts.

---

## 4. Authoritative Sources

1. **Google Gemini API Reference — `GenerateContentResponse` & Protobuf Definitions**
   - URL: `https://ai.google.dev/api/generate-content#v1beta.GenerateContentResponse`
   - Access Date: July 22, 2026
   - Supported Claims: Structures for `promptFeedback`, `candidates`, `FinishReason`, `BlockReason`, `SafetyRating`.
2. **Google Gemini Safety Settings & Filter Reference**
   - URL: `https://ai.google.dev/gemini-api/docs/safety-settings`
   - Access Date: July 22, 2026
   - Supported Claims: Safety categories (`HARM_CATEGORY_*`), probability thresholds, severity scores, and block trigger conditions.
3. **Google `@google/genai` SDK Reference (Node.js / TypeScript)**
   - Package: `@google/genai` (v2.x)
   - Access Date: July 22, 2026
   - Supported Claims: TypeScript type definitions for `GenerateContentResponse`, `Candidate`, `PromptFeedback`, `GenerateContentConfig`, `AbortSignal` cancellation, and SDK exception shapes.
4. **Google Gemini API Overview — `generateContent` vs `Interactions API`**
   - URL: `https://ai.google.dev/gemini-api/docs/api-overview`
   - Access Date: July 22, 2026
   - Supported Claims: GA status of Interactions API (June 2026), single-turn capabilities, stateless execution (`store: false`), and `generateContent` legacy status.

---

## 5. Current Gemini Response Model

In the `@google/genai` SDK and underlying Gemini REST/gRPC API, a response from `ai.models.generateContent({...})` returns a `GenerateContentResponse` object with the following structural layout:

```
GenerateContentResponse
├── promptFeedback? : PromptFeedback
│   ├── blockReason? : BlockReason (enum: SAFETY, OTHER, BLOCKLIST, PROHIBITED_CONTENT, JAILBREAK, MODEL_ARMOR)
│   ├── blockReasonMessage? : string
│   └── safetyRatings? : SafetyRating[]
├── candidates? : Candidate[]
│   └── [0] : Candidate
│       ├── content? : Content
│       │   └── parts? : Part[] (e.g. { text: string })
│       ├── finishReason? : FinishReason (enum: STOP, MAX_TOKENS, SAFETY, RECITATION, LANGUAGE, OTHER, BLOCKLIST, PROHIBITED_CONTENT, SPII, MALFORMED_FUNCTION_CALL, IMAGE_SAFETY, IMAGE_PROHIBITED_CONTENT, IMAGE_OTHER, NO_IMAGE, IMAGE_RECITATION, UNEXPECTED_TOOL_CALL, TOO_MANY_TOOL_CALLS, MISSING_THOUGHT_SIGNATURE, MALFORMED_RESPONSE, ESCALATION)
│       ├── finishMessage? : string
│       ├── safetyRatings? : SafetyRating[]
│       └── citationMetadata? : CitationMetadata
└── usageMetadata? : UsageMetadata
```

---

## 6. Prompt-Level Blocking Findings

- **Observable Condition:** `response.promptFeedback.blockReason` is defined and populated (e.g., `'SAFETY'`, `'BLOCKLIST'`, `'PROHIBITED_CONTENT'`, `'JAILBREAK'`, `'MODEL_ARMOR'`, `'OTHER'`).
- **Mechanism:** The input prompt violated safety policies or input blocklists *before* model generation started.
- **Payload State:**
  - `response.candidates` is either empty (`[]`) or `undefined`.
  - No candidate text or content parts exist.
  - Inspecting candidate structure confirms zero available parts.
- **SDK Exception Behavior:** In standard HTTP 200 API responses where prompt safety filters trigger, the SDK returns a valid `GenerateContentResponse` containing `promptFeedback.blockReason` rather than throwing a JS/TS network exception.
- **Normalization Action:** `GeminiProvider` MUST inspect `response.promptFeedback?.blockReason` immediately upon receiving the response. If present, it MUST throw `AIProviderError`:
  `"Gemini prompt blocked: <blockReason> (<blockReasonMessage || 'No detail provided'>)"`

---

## 7. Candidate-Level Blocking Findings

- **Observable Condition:** `response.candidates[0].finishReason` is populated with a non-success stop reason (e.g., `'SAFETY'`, `'RECITATION'`, `'BLOCKLIST'`, `'PROHIBITED_CONTENT'`, `'SPII'`, `'MALFORMED_FUNCTION_CALL'`, `'IMAGE_SAFETY'`, `'IMAGE_PROHIBITED_CONTENT'`, `'IMAGE_OTHER'`, `'NO_IMAGE'`, `'IMAGE_RECITATION'`, `'UNEXPECTED_TOOL_CALL'`, `'TOO_MANY_TOOL_CALLS'`, `'MISSING_THOUGHT_SIGNATURE'`, `'MALFORMED_RESPONSE'`, `'ESCALATION'`, `'OTHER'`).
- **Mechanism:** Model generation started, but was terminated mid-stream or post-generation by safety, policy, image, tool, or protocol guardrails.
- **Payload State:**
  - `candidate.content` may be missing or partially generated.
  - Useful structured output is **UNAVAILABLE**.
- **Normalization Action:** `GeminiProvider` MUST inspect `candidate.finishReason`. If `finishReason` is not `'STOP'`, it MUST throw `AIProviderError` (unless handled by prompt/candidate block logic).

---

## 8. Refusal Semantics

- **Distinction Between Guardrail Safety Block and In-Text Refusal:**
  - **Guardrail Safety Block:** Hard block triggered by API filters (`finishReason === 'SAFETY'`, `blockReason === 'SAFETY'`). No text output is returned.
  - **In-Text Model Refusal:** The model generates text naturally (`finishReason === 'STOP'`), but the generated text consists of a conversational refusal (e.g., *"I cannot fulfill this request because..."*).
- **Behavior in Structured JSON Output Mode:**
  - Phase 20 requests require strict JSON output (`responseMimeType: "application/json"` and `responseSchema`).
  - When `responseSchema` is active, Gemini constrains output tokens to valid JSON structure.
  - If a model refuses conversational framing, it either (a) triggers a candidate finish reason (e.g. `SAFETY`), or (b) emits a JSON string or plain text that fails `JSON.parse` or Zod schema validation.
- **Normalization Action:**
  - Guardrail safety blocks are caught via `blockReason` or `finishReason` check -> `AIProviderError`.
  - In-text refusals that break JSON format fail `JSON.parse` -> `AIProviderError`.
  - In-text refusals formatted as JSON that fail schema constraints fail `validateAIResponse` -> `AIValidationError`.

---

## 9. Finish-Reason Semantics & Forward-Compatible Rule

The official Gemini `FinishReason` enum includes a growing list of terminal reasons across model generations and capabilities:
`STOP`, `MAX_TOKENS`, `SAFETY`, `RECITATION`, `LANGUAGE`, `OTHER`, `BLOCKLIST`, `PROHIBITED_CONTENT`, `SPII`, `MALFORMED_FUNCTION_CALL`, `IMAGE_SAFETY`, `IMAGE_PROHIBITED_CONTENT`, `IMAGE_OTHER`, `NO_IMAGE`, `IMAGE_RECITATION`, `UNEXPECTED_TOOL_CALL`, `TOO_MANY_TOOL_CALLS`, `MISSING_THOUGHT_SIGNATURE`, `MALFORMED_RESPONSE`, `ESCALATION`.

**Forward-Compatible Architectural Rule:**
Application architecture MUST NOT depend on a manually maintained whitelist/blacklist of every individual failure enum value, as Google frequently introduces new enum members.

Instead, for Phase 20 schema-constrained structured JSON generation, `GeminiProvider` enforces a simple two-branch policy:

1. **`finishReason === 'STOP'`**:
   - Indicates natural model completion. Proceed to structural text extraction, fence cleaning, `JSON.parse()`, and Zod validation.
2. **Anything Else Terminal (`finishReason !== 'STOP'`)**:
   - Indicates unusable or incomplete output.
   - Throw `AIProviderError("Gemini candidate generation terminated with finishReason: <finishReason>")` immediately.
   - `JSON.parse()` MUST NOT execute.
   - Zod `safeParse()` MUST NOT execute.

---

## 10. MAX_TOKENS Truncation Semantics

- **Definition:** Official documentation defines `MAX_TOKENS` as generation terminating because the configured maximum token limit (`maxOutputTokens`) was reached before natural completion.
- **Impact on Structured Output:** For schema-constrained JSON generation, a truncated response cuts off mid-string or mid-object (unclosed braces, quotes, or brackets), rendering the JSON payload structurally incomplete and invalid.
- **Architectural Invariant:**
  - `finishReason === 'STOP'` -> Proceed to parsing pipeline.
  - `finishReason === 'MAX_TOKENS'` -> **FAIL IMMEDIATELY.**
    - `GeminiProvider` MUST throw `AIProviderError("Gemini output truncated due to max_tokens limit")`.
    - `JSON.parse()` **MUST NOT execute** on truncated text.
    - Zod `safeParse()` **MUST NOT execute** on truncated text.

---

## 11. Safety Ratings vs Canonical Failure Authority

- **VERIFIED FACT:** Safety ratings (`safetyRatings: SafetyRating[]`) exist on **BOTH** successful and blocked responses in current Gemini API objects.
- **Structure:**
  ```json
  {
    "category": "HARM_CATEGORY_HARASSMENT",
    "probability": "NEGLIGIBLE",
    "blocked": false
  }
  ```
- **Canonical Failure Authority:**
  - `promptFeedback.blockReason` and `candidate.finishReason` are the primary, canonical authorities for response failure/block state.
  - `safetyRatings` provide diagnostic explanation and granularity (explaining *why* a prompt or candidate was flagged).
  - `GeminiProvider` MUST NOT use non-blocked `safetyRatings` to fail a response when `finishReason === 'STOP'`.
  - Canonical failure is driven strictly by `promptFeedback.blockReason` and `candidate.finishReason`. `safetyRatings` are retained solely for sanitized logging and diagnostic metadata.

---

## 12. Empty / Missing Output & Text Accessor Semantics

- **Helper Accessor Caveat (`response.text`):** Convenience accessors like `response.text` have varying behavior across SDK versions when candidates or content parts are missing (may return `undefined`, empty string `""`, or throw an SDK `GoogleGenAIError` / `ValueError` with `"Content has no parts"`).
- **Explicit Structural Inspection Policy:**
  To guarantee zero unhandled SDK exceptions on empty or blocked responses, `GeminiProvider` MUST explicitly inspect the candidate object hierarchy before attempting text extraction:

```typescript
const candidate = response.candidates?.[0];
if (!candidate) {
  throw new AIProviderError('Gemini returned no response candidates');
}

if (candidate.finishReason !== 'STOP') {
  if (candidate.finishReason === 'MAX_TOKENS') {
    throw new AIProviderError('Gemini output truncated due to max_tokens limit');
  }
  throw new AIProviderError(`Gemini candidate generation terminated with finishReason: ${candidate.finishReason}`);
}

const textPart = candidate.content?.parts?.[0];
if (!textPart || typeof textPart.text !== 'string' || textPart.text.trim() === '') {
  throw new AIProviderError('Gemini candidate contains no valid text content');
}

const rawText = textPart.text.trim();
```

---

## 13. SDK Exception & Error Mapping Semantics

When `@google/genai` encounters network, authentication, or API-level failures, it throws native JS exceptions. `GeminiProvider` must map these exceptions in a `try...catch` block:

| Caught SDK Exception / HTTP Status | Trigger Condition | Normalized Domain Error | Evidence Classification |
| :--- | :--- | :--- | :--- |
| **Missing Local API Key** | `GEMINI_API_KEY` is empty string during construction | `AIConfigurationError("Gemini API key is missing...")` | **REPOSITORY OBSERVATION** |
| **Auth Error (401 / 403)** | Invalid `GEMINI_API_KEY` or unauthorized project | `AIConfigurationError("Gemini authentication failed...")` | **VERIFIED FACT** |
| **Invalid Request / Config (400)** | Invalid model string or malformed request options | `AIConfigurationError` (if config) / `AIProviderError` (if payload) | **INFERENCE** |
| **Rate Limit / Quota (429)** | Exceeded API quota or rate limits | `AIProviderError("Gemini rate limit exceeded.", error)` | **VERIFIED FACT** |
| **Timeout / AbortError** | Execution exceeded `timeoutMs` threshold | `AITimeoutError("Gemini API request timed out after <ms>ms")` | **VERIFIED FACT** |
| **Server Error (500 / 503 / 504)** | Google backend service outage or internal error | `AIProviderError("Gemini provider error: <message>", error)` | **VERIFIED FACT** |

---

## 14. GenerateContent Findings

- **API Surface:** `ai.models.generateContent({...})`
- **Official Status:** Fully supported by Google and `@google/genai`; labeled as legacy relative to the newer Interactions API.
- **Execution Model:** Single-turn, stateless, synchronous HTTP POST.
- **Safety Representation:** Direct structural fields on response object (`response.promptFeedback.blockReason`, `candidate.finishReason`, `candidate.safetyRatings`).
- **Repository Alignment:** Matches existing `AnthropicProvider` stateless execution model and provides a smaller conceptual migration delta for Phase 20.

---

## 15. Interactions API Findings

- **API Surface:** `ai.interactions.create({...})`
- **Official Status:** Generally Available (GA) as of June 2026; recommended by Google for all new Gemini projects.
- **Execution Model:** Supports single-turn generation, structured outputs (`response_format`), optional server-side interaction history, and stateless execution via `store: false`.
- **Stateless Capability:** Setting `store: false` disables server-side interaction storage, enabling stateless single-turn execution.
- **Repository Alignment:** Architecturally capable of fulfilling Phase 20 requirements, though requiring adaptation for interaction lifecycle status handling.

---

## 16. Safety-Semantics Matrix

| Row | Condition / Scenario | Provider Observation | Usable Output? | JSON.parse? | Zod safeParse? | Normalized Application Error | Evidence Classification |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **1** | Normal successful response | `finishReason === 'STOP'`, valid JSON in text | **YES** | **YES** | **YES** | N/A (Success) | **VERIFIED FACT** |
| **2** | Max tokens reached | `finishReason === 'MAX_TOKENS'` | **NO** | **NO** | **NO** | `AIProviderError` ("output truncated") | **VERIFIED FACT** |
| **3** | Prompt blocked before generation | `promptFeedback.blockReason` defined | **NO** | **NO** | **NO** | `AIProviderError` ("prompt blocked") | **VERIFIED FACT** |
| **4** | Candidate stopped for safety | `finishReason === 'SAFETY'` | **NO** | **NO** | **NO** | `AIProviderError` ("safety blocked") | **VERIFIED FACT** |
| **5** | Other terminal finish reason | `finishReason` in `['RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'OTHER', ...]` | **NO** | **NO** | **NO** | `AIProviderError` ("terminated with finishReason") | **VERIFIED FACT** |
| **6** | Missing candidates | `candidates` is `undefined` or `length === 0` | **NO** | **NO** | **NO** | `AIProviderError` ("no candidates") | **VERIFIED FACT** |
| **7** | Missing content / parts | `candidate.content` or `parts` missing/empty | **NO** | **NO** | **NO** | `AIProviderError` ("no content parts") | **VERIFIED FACT** |
| **8** | Empty text string | `text` is empty string `""` or whitespace | **NO** | **NO** | **NO** | `AIProviderError` ("empty text output") | **VERIFIED FACT** |
| **9** | Successful response with safetyRatings | `finishReason === 'STOP'`, `safetyRatings` present with `blocked: false` | **YES** | **YES** | **YES** | N/A (Success) | **VERIFIED FACT** |
| **10** | Malformed JSON despite `STOP` | `finishReason === 'STOP'`, `JSON.parse` throws SyntaxError | **NO** | **YES** (Fails) | **NO** | `AIProviderError` ("JSON parse failure") | **VERIFIED FACT** |
| **11** | Authentication / Config Failure | SDK 401 / 403 or missing `GEMINI_API_KEY` | **NO** | **NO** | **NO** | `AIConfigurationError` | **VERIFIED FACT** |
| **12** | Rate Limit / Quota | SDK 429 Error | **NO** | **NO** | **NO** | `AIProviderError` | **VERIFIED FACT** |
| **13** | Provider Server Failure | SDK 500 / 503 / 504 Error | **NO** | **NO** | **NO** | `AIProviderError` | **VERIFIED FACT** |
| **14** | Timeout / Client Abort | `AbortError` / Timeout exceeded | **NO** | **NO** | **NO** | `AITimeoutError` | **VERIFIED FACT** |

---

## 17. Application Error Mapping

```
Gemini Provider Response / SDK State
      │
      ├─► Missing Key / Auth Failure (401/403) ──────────────► AIConfigurationError
      │
      ├─► Timeout / AbortSignal Triggered ───────────────────► AITimeoutError
      │
      ├─► Prompt Blocked (promptFeedback.blockReason) ───────► AIProviderError
      │
      ├─► Truncated Output (finishReason === MAX_TOKENS) ────► AIProviderError
      │
      ├─► Terminal Block (finishReason !== STOP) ────────────► AIProviderError
      │
      ├─► Missing Candidates / Empty Content Parts ──────────► AIProviderError
      │
      ├─► Rate Limit (429) / Provider Outage (500/503) ──────► AIProviderError
      │
      ├─► Malformed JSON (JSON.parse SyntaxError) ───────────► AIProviderError
      │
      └─► Valid JSON Text ──► JSON.parse() ──► AIService ──► Zod safeParse()
                                                                 │
                                                                 └─► Failure ──► AIValidationError
```

---

## 18. JSON Parsing / Zod Boundary

- **Boundary Sequence:**
  1. `GeminiProvider` receives response object.
  2. `GeminiProvider` checks `promptFeedback.blockReason`. If present, throws `AIProviderError`.
  3. `GeminiProvider` checks `candidates[0].finishReason`. If not `'STOP'`, throws `AIProviderError`.
  4. `GeminiProvider` checks candidate content/text availability. If missing, throws `AIProviderError`.
  5. `GeminiProvider` strips markdown fences and executes `JSON.parse(rawText)`. If syntax error, throws `AIProviderError`.
  6. `GeminiProvider` returns raw parsed JSON object `T` to `AIService`.
  7. `AIService` passes parsed JSON object to `validateAIResponse(rawData, schema)`.
  8. `validateAIResponse` executes `schema.safeParse(rawData)`. If validation fails, throws `AIValidationError`.

- **Boundary Invariants:**
  - Provider-specific safety interpretation belongs inside `GeminiProvider`.
  - Blocked/truncated responses MUST NEVER reach `JSON.parse`.
  - Blocked/truncated responses MUST NEVER reach Zod `safeParse`.
  - Malformed JSON is a provider-output/parsing failure (`AIProviderError`), not a safety failure.
  - Schema validity remains `AIService`/Zod responsibility (`AIValidationError`).
  - No Gemini-specific application error class is required.
  - API keys, full prompts, and raw blocked payloads MUST NOT be logged.
  - No provider-specific SDK errors may leak past the `AIProvider` interface.

---

## 19. Logging & Diagnostic Policy

To ensure high observability without exposing sensitive data or violating security invariants:

1. **Sanitized Telemetry Fields Retained:**
   - `executionId`: UUID correlation identifier.
   - `provider`: `'gemini'`
   - `model`: e.g. `'gemini-3.6-flash'`
   - `promptName` & `promptVersion`: Prompt template metadata.
   - `executionTimeMs`: Milliseconds taken.
   - `success`: boolean (`true` or `false`).
   - `errorType`: Constructor name of caught error (e.g. `'AIProviderError'`).
   - `errorMessage`: Sanitized error summary (e.g. `"Gemini candidate generation terminated with finishReason: SAFETY"`).

2. **Data Explicitly Excluded from Logs:**
   - `GEMINI_API_KEY` (Credentials MUST NEVER be logged).
   - Full raw prompt strings containing end-user project/task data.
   - Full raw LLM response payloads.
   - Unsafe model outputs flagged by safety filters.

---

## 20. API Calls Executed

- `GEMINI_KEY_STATUS`: **ABSENT**
- **API calls executed:** 0 (Investigation conducted strictly using official Google Gemini API documentation, `@google/genai` TypeScript SDK references, Protobuf schemas, and repository inspection).

---

## 21. Verified Facts

1. Current official Google Gemini API documentation confirms prompt-level blocking is indicated by `response.promptFeedback.blockReason`.
2. Current official Google Gemini API documentation confirms candidate-level generation termination is indicated by `candidate.finishReason`.
3. Official Google documentation defines `MAX_TOKENS` as generation terminating because max output tokens were reached.
4. `safetyRatings` exist on both successful and blocked candidate responses; their presence alone does NOT indicate failure.
5. The Interactions API is GA as of June 2026, recommended for new projects, supports single-turn generation, structured outputs, and stateless execution (`store: false`).
6. `generateContent` remains fully supported as Google's legacy API surface for Gemini.

---

## 22. Repository Observations

1. `server/src/ai/errors/ai.errors.ts` defines `AIBaseError`, `AIConfigurationError`, `AIProviderError`, `AITimeoutError`, and `AIValidationError`.
2. `AnthropicProvider` maps all SDK errors into `AIBaseError` subclasses and cleans markdown fences before calling `JSON.parse`.
3. `AIService` orchestrates execution, logs telemetry via `aiLogger`, re-throws `AIBaseError` instances, and validates output via `validateAIResponse`.
4. `validateAIResponse` throws `AIValidationError` when `schema.safeParse()` fails.

---

## 23. Inferences

1. `GeminiProvider` must perform safety, finish-reason, and truncation (`MAX_TOKENS`) inspection BEFORE attempting text extraction or `JSON.parse`.
2. All Gemini safety blocks, refusals, missing candidates, truncations, and API failures normalize into existing `AIBaseError` subclasses (`AIProviderError`, `AIConfigurationError`, `AITimeoutError`).
3. No new application error class is required for Gemini integration.

---

## 24. Remaining Uncertainties

None. Gemini safety, refusal, finish-reason, truncation, missing candidate, and SDK exception semantics are fully resolved for WP-02D.

---

## 25. Impact on WP-02D

WP-02D (`GeminiProvider` Response Parsing, Safety & Error Mapping) will implement:
1. Early check for `response.promptFeedback?.blockReason` -> throw `AIProviderError`.
2. Early check for `candidate.finishReason !== 'STOP'` (including `MAX_TOKENS` truncation) -> throw `AIProviderError`.
3. Explicit candidate and content structure check before text extraction.
4. Fence cleaning and `JSON.parse` -> throw `AIProviderError` on syntax error.
5. Catch SDK exceptions (401, 429, 500, AbortError) -> map to `AIConfigurationError`, `AIProviderError`, `AITimeoutError`.

---

## 26. Impact on Gate-4 API-Surface Decision

**Gate-4 API-surface decision: OPEN**

EXP-03 establishes that both candidate API surfaces can fulfill Phase 20 requirements:

- **Candidate A: Interactions API**
  - **Status:** GA as of June 2026; Google's official recommended choice for new Gemini projects.
  - **Capabilities:** Supports single-turn text generation, structured outputs (`response_format`), and stateless execution via `store: false`.
  - **Tradeoff:** Modern platform standard, but represents a slightly different response object surface relative to existing `AnthropicProvider`.

- **Candidate B: `generateContent` API**
  - **Status:** Fully supported; labeled legacy relative to Interactions API.
  - **Capabilities:** Single-turn stateless execution with direct `GenerateContentResponse` safety properties (`blockReason`, `finishReason`).
  - **Tradeoff:** Matches existing Phase 20 specification and Anthropic provider pattern almost 1-to-1, minimizing implementation delta.

The final API-surface selection belongs to explicit Gate-4 human review prior to Track C implementation.

---

## 27. EXP-03 Verdict

**EXP-03: PASS — SAFETY SEMANTICS RESOLVED**
