# Gate 4 — Bounded Experiment Review & Gemini API-Surface Decision

## 1. Gate Objective

The objective of Gate 4 is to perform a rigorous architectural review of all completed Phase 20 experiments (EXP-01, EXP-01B, EXP-02, EXP-03, EXP-04), reconcile their findings across the repository context, resolve the governing API-surface selection for Google Gemini, establish decision records for provider behavior, and evaluate readiness to proceed to Track C implementation (subject to human approval of Gate 5B).

---

## 2. Repository Baseline

- **Repository Path:** `/home/rehan/Developer/ai-project-manager`
- **Active Branch:** `feat/phase-20-multi-provider-ai`
- **Installed Zod Version:** `zod@4.4.3` ([server/package.json](file:///home/rehan/Developer/ai-project-manager/server/package.json#L34))
- **Track-A Foundation Status:** Completed & Reconciled:
  - WP-01A: Multi-provider configuration vocabulary implemented in [ai.config.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/config/ai.config.ts).
  - WP-01B: `AIProviderFactory` lazy resolver and process-wide instance cache implemented in [provider.factory.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/provider.factory.ts).
  - WP-01C: `AIService` constructor dependency injection seam (`new AIService(provider?)`) and lazy provider resolution implemented in [ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/ai.service.ts). Test injection updated in [execution.test.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/tests/execution.test.ts).

---

## 3. Evidence Reviewed

1. **Governing Chain:**
   - [00-contract.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/00-contract.md)
   - [01-investigation.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/01-investigation.md)
   - [01a-repository-reconciliation.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/01a-repository-reconciliation.md)
   - [02-specification.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/02-specification.md)
   - [03-implementation-plan.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/03-implementation-plan.md)
2. **Completed Experiment Artifacts:**
   - [exp-01-model-selection.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/experiments/exp-01-model-selection.md)
   - [exp-01b-deep-context-policy.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/experiments/exp-01b-deep-context-policy.md)
   - [exp-02-schema-compatibility.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/experiments/exp-02-schema-compatibility.md)
   - [exp-03-safety-semantics.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/experiments/exp-03-safety-semantics.md)
   - [exp-04-timeout-cancellation.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/experiments/exp-04-timeout-cancellation.md)
3. **Domain Consumers & Core Subsystem:**
   - [project-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/project-ai.service.ts)
   - [task-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/task-ai.service.ts)
   - [project-summary-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/project-summary-ai.service.ts)

---

## 4. Track A Status

Track A foundation refactoring is **100% COMPLETE**. Eager provider instantiation has been eliminated. Module import of `aiService` or `app.ts` does NOT execute `AnthropicProvider` constructor or validate API keys. Domain services remain 100% provider-independent.

---

## 5. Experiment Verdict Matrix

| Experiment | Question | Final Finding | Verdict | Blocks Track C? | Remaining Uncertainty |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **EXP-01** | Gemini Model Availability & Discovery | Identified GA model lineup (`gemini-3.6-flash`, `gemini-3.5-flash-lite`); confirmed deprecation of 2.5 series (shutdown Oct 16, 2026). | **PASS** | NO | None |
| **EXP-01B** | `DEEP_CONTEXT` Model Policy Resolution | Option A selected: `gemini-3.6-flash` configured for BOTH `FAST_JSON` and `DEEP_CONTEXT` tiers based on prompt context (<4k tokens); semantic tier isolation preserved in `aiConfig`. | **PASS** | NO | None |
| **EXP-02** | Zod 4 Schema -> Gemini Compatibility | `z.toJSONSchema()` available natively in Zod 4 (`zod@4.4.3`). `GeminiSchemaAdapter` required to strip `$schema`, remove length/array bounds, and normalize `type: ["string", "null"]` to `{ type: "STRING", nullable: true }`. Zod `safeParse()` remains authoritative. | **PASS** | NO | None |
| **EXP-03** | Safety / Refusal / Finish Semantics | `promptFeedback.blockReason` and `finishReason` are canonical triggers. `finishReason === 'STOP'` proceeds to pipeline; `MAX_TOKENS` (truncation) and all other terminal reasons throw `AIProviderError` immediately. Blocked responses NEVER reach `JSON.parse` or Zod. `safetyRatings` are diagnostic only. | **PASS** | NO | None |
| **EXP-04** | Timeout & Cancellation Semantics | `GenerateContentConfig.abortSignal` forwards to client fetch. `GeminiProvider` manages `AbortController` and `setTimeout`. `timedOut === true` is the authoritative invariant distinguishing provider timeout (`AITimeoutError`) from caller abort (`AIProviderError`). Mandatory `clearTimeout` in `finally` block prevents handle leaks. Client abort cancels client wait path; server TPU termination/0-cost billing is NOT guaranteed. | **PASS** | NO | None |

---

## 6. EXP-01 Final Finding

Google's official documentation confirms the Gemini 2.5 model family (`gemini-2.5-flash`, `gemini-2.5-pro`) is scheduled for shutdown on **October 16, 2026**. Targeting 2.5 models for a new integration introduces immediate technical debt. The confirmed, non-deprecated GA Flash models are **`gemini-3.6-flash`** (released July 21, 2026; GA) and **`gemini-3.5-flash-lite`** (GA).

---

## 7. EXP-01B Final Finding

Evaluation of live repository workloads ([project-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/project-ai.service.ts), [task-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/task-ai.service.ts), [project-summary-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/project-summary-ai.service.ts)) shows that all three capability workloads require small context inputs (< 4,000 tokens) and standard reasoning. Neither workload requires an unreleased Preview model (`gemini-3.1-pro-preview`).

**Policy Decision (Option A):** Configure `gemini-3.6-flash` as the default model string for BOTH `FAST_JSON` and `DEEP_CONTEXT` capability tiers in `aiConfig.gemini.models`, while preserving full semantic tier separation in configuration schema and domain service invocations.

---

## 8. EXP-02 Final Finding

Installed `zod@4.4.3` natively supports `z.toJSONSchema()`. Direct pass-through of raw Zod 4 JSON Schema output to Gemini is **REJECTED** because Gemini's OpenAPI schema dialect rejects root `$schema` headers, unsupported validation bounds (`minLength`, `maxLength`, `minItems`, `maxItems`, `additionalProperties`), and multi-type arrays (`type: ["string", "null"]`).

`GeminiProvider` will implement `GeminiSchemaAdapter` to sanitize schemas into valid Gemini OpenAPI definitions. Fine-grained string and array constraints stripped by the adapter remain 100% enforced post-generation by `AIService` via Zod `safeParse()`.

---

## 9. EXP-03 Final Finding

Gemini safety blocks manifest structurally in `promptFeedback.blockReason` or candidate `finishReason`.

1. **`finishReason === 'STOP'`**: Indicates natural model completion. Proceed to JSON fence stripping, `JSON.parse()`, and Zod `safeParse()`.
2. **`finishReason === 'MAX_TOKENS'`**: Indicates output truncation. **FAIL IMMEDIATELY.** Throw `AIProviderError("Gemini output truncated due to max_tokens limit")`. Neither `JSON.parse()` nor Zod `safeParse()` may execute.
3. **All Other Terminal Reasons (`SAFETY`, `RECITATION`, `BLOCKLIST`, `PROHIBITED_CONTENT`, etc.)**: **FAIL IMMEDIATELY.** Throw `AIProviderError("Gemini candidate generation terminated with finishReason: <finishReason>")`.
4. **Safety Ratings (`safetyRatings`)**: Present on both successful and blocked responses; diagnostic only. Non-blocked safety ratings when `finishReason === 'STOP'` DO NOT trigger failure.
5. **Error Hierarchy**: All safety blocks, refusals, missing candidates, and truncations map to `AIProviderError`. No new application error class is required.

---

## 10. EXP-04 Final Finding

`@google/genai` accepts `GenerateContentConfig.abortSignal`. `GeminiProvider` manages an explicit `AbortController` and `setTimeout` timer.

1. **Authoritative Invariant:** `timedOut === true` is the sole indicator of provider timeout, throwing `AITimeoutError`.
2. **Caller Abort:** Caller/external cancellation (`timedOut === false`, `AbortError`) throws `AIProviderError("Gemini API request was aborted by caller")`.
3. **Mandatory Cleanup:** `clearTimeout(timerId)` inside a `finally` block is mandatory to prevent event loop handle accumulation.
4. **Client vs Server Cancellation:** `AbortSignal` guarantees client HTTP socket closure and JS promise rejection. Official Google documentation does NOT guarantee instantaneous backend TPU execution termination or zero token billing.

---

## 11. Cross-Experiment Consistency Review

All 5 experiment artifacts are internally consistent and mutually reinforcing:
- EXP-01 and EXP-01B establish the model identifier baseline (`gemini-3.6-flash`).
- EXP-02 defines the request schema transformation pipeline (`GeminiSchemaAdapter`).
- EXP-03 establishes response safety and finish-reason parsing before `JSON.parse`.
- EXP-04 establishes request execution timeout enforcement and abort signal handling.

No factual or architectural contradictions exist across the experiment artifacts.

---

## 12. Gemini API-Surface Candidates

- **Candidate A:** `@google/genai` Interactions API (`ai.interactions.create({...})`)
- **Candidate B:** `@google/genai` `ai.models.generateContent({...})`

---

## 13. Interactions API Analysis

- **Official Status:** GA as of June 2026; Google's official recommended choice for new Gemini projects.
- **Capabilities:** Supports single-turn text generation, structured outputs (`response_format`), optional server-side state, and stateless execution via `store: false`.
- **Architectural Fit for Phase 20:** While technically capable of stateless execution when `store: false` is configured, the Interactions API paradigm is designed around multi-turn agentic interactions, step execution tracing, and interaction sessions. For Phase 20's stateless, single-turn structured data workloads, it introduces unnecessary interaction lifecycle abstractions (`status: "failed"`, step unwrapping) without adding value.

---

## 14. generateContent Analysis

- **Official Status:** Fully supported by Google and `@google/genai`; labeled legacy relative to the newer Interactions API.
- **Capabilities:** Single-turn stateless execution with direct `GenerateContentResponse` safety properties (`blockReason`, `finishReason`).
- **Architectural Fit for Phase 20:** 1-to-1 match for the existing `AnthropicProvider` stateless execution pattern. Receives an assembled prompt string, invokes `generateContent()`, inspects safety block state, cleans markdown fences, parses JSON, and returns strongly-typed data to `AIService`. Minimal conceptual and implementation delta.

---

## 15. API-Surface Decision Matrix

| Dimension | Option A: Interactions API | Option B: `generateContent` API | Winning Option |
| :--- | :--- | :--- | :---: |
| **Google Platform Direction** | GA / Recommended for new projects | Fully supported / Legacy surface | Option A |
| **Stateless Single-Turn Fit** | Supported via `store: false` | **Inherent native model** | **Option B** |
| **Structured Output Support** | Supported (`response_format`) | **Supported (`responseSchema`)** | Tie |
| **Anthropic Provider Parity** | Requires interaction lifecycle wrapper | **1-to-1 conceptual match** | **Option B** |
| **Safety Block Inspection** | Step-level status mapping | **Direct `GenerateContentResponse` properties** | **Option B** |
| **Timeout / Abort Signal** | Supported via `abortSignal` | **Supported via `abortSignal`** | Tie |
| **Implementation Complexity** | Moderate (unwrap step outputs) | **Low (~100 lines in GeminiProvider)** | **Option B** |
| **Offline Unit Testing** | Complex multi-step interaction mocks | **Simple JSON response mocks** | **Option B** |
| **YAGNI / Scope Discipline** | Risk of unnecessary agentic complexity | **Zero unnecessary infrastructure** | **Option B** |
| **Phase 20 Contract Fit** | Over-engineered for single-turn | **100% compliant with 00-contract.md** | **Option B** |

---

## 16. Selected Phase-20 API Surface

**SELECTED API SURFACE: `GENERATECONTENT` (`ai.models.generateContent()`)**

---

## 17. Decision Rationale

1. **Perfect Workload Fit:** All three existing production AI capabilities (`generateTasksForProject`, `generateLabelsForTask`, `generateSummaryForProject`) are stateless, single-turn, structured-JSON generation tasks. They do NOT require server-side conversation memory, background execution, agentic step tracing, or interaction history.
2. **Strict Adherence to Contract Scope:** `00-contract.md` Section 8 explicitly excludes agentic execution, conversational AI, and persistent memory. Adopting the `Interactions API` for stateless single-turn tasks violates the YAGNI ("You Aren't Gonna Need It") principle by taking on complex interaction-step abstractions for capabilities that do not need them.
3. **1-to-1 Provider Parity with Anthropic:** `generateContent` mirrors the stateless `AnthropicProvider` pattern exactly. `GeminiProvider` receives a single assembled prompt string, passes it to `generateContent()`, inspects safety block state, cleans codeblock fences, parses JSON, and returns data to `AIService`.
4. **Lowest Implementation & Testing Risk:** Mocking `GenerateContentResponse` objects in unit tests ([server/src/ai/tests/gemini.provider.test.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/tests/gemini.provider.test.ts)) is simple, robust, and fast, ensuring offline CI tests remain 100% reliable.

---

## 18. Rejected Alternative

The **Interactions API** was rejected for Phase 20's initial `GeminiProvider` implementation. While it represents Google's long-term platform direction for agentic and multi-turn applications, using it for stateless single-turn structured output in Phase 20 introduces unnecessary architectural complexity (unwrapping step outputs, mapping interaction statuses, setting `store: false`) without delivering any tangible product benefit.

If future product phases introduce multi-turn conversational agents or background AI tasks, the Interactions API can be adopted behind the `AIProvider` seam without modifying domain services.

---

## 19. Provider-Abstraction Compatibility

The selected `generateContent` API surface maintains 100% provider-independent isolation across all application layers:

```
Domain Service (project-ai / task-ai / summary-ai)
      │
      ▼
AIService (facade)
      │
      ▼
AIProvider (interface: generateStructured<T>)
      │
      ▼
GeminiProvider (concrete implementation using generateContent)
      │
      ▼
Google SDK (@google/genai)
```

Zero Google-specific types, response objects, SDK classes, or interaction IDs leak past `GeminiProvider`.

---

## 20. Timeout Policy

`GeminiProvider` MUST enforce request execution timeouts using the following authoritative rule:
- Manage an explicit `AbortController` and `setTimeout` timer for `options.timeoutMs` (default: `aiConfig.timeouts.standard`).
- `timedOut === true` is the sole indicator of a provider timeout, throwing `AITimeoutError`.
- Caller-initiated aborts (`timedOut === false`, `AbortError`) throw `AIProviderError`.
- Mandatory `clearTimeout(timerId)` inside a `finally` block prevents handle leaks.

---

## 21. Structured Output Policy

`GeminiProvider` MUST convert caller Zod schemas via native `z.toJSONSchema()` (Zod 4) and sanitize them via `GeminiSchemaAdapter` before passing them to `config.responseSchema`. `validateAIResponse()` / Zod `safeParse()` in `AIService` remains the authoritative runtime safety boundary.

---

## 22. Safety / Finish-Reason Policy

`GeminiProvider` MUST inspect `response.promptFeedback?.blockReason` and `candidate.finishReason` before text extraction. `finishReason === 'STOP'` proceeds to output validation. `MAX_TOKENS` (truncation) and all other terminal finish reasons throw `AIProviderError` immediately. Blocked or truncated responses MUST NEVER reach `JSON.parse()` or Zod `safeParse()`.

---

## 23. Model Policy

`aiConfig.gemini.models` MUST configure `gemini-3.6-flash` for BOTH `fastJson` and `deepContext` capability tiers, preserving full semantic tier separation in configuration schema and domain service invocations.

---

## 24. Track-C Preconditions

Track C implementation MUST NOT begin until:
1. **Gate 4** (this document) receives explicit human approval.
2. **Gate 5B** (Anthropic Regression Gate) is executed and receives explicit human approval.

---

## 25. Remaining Risks

1. **Google Model Identifier Evolution:** While `gemini-3.6-flash` is GA, Google may introduce new model revisions. Environment overrides (`GEMINI_FAST_MODEL`, `GEMINI_DEEP_MODEL`) mitigate this risk.
2. **Zod 4 Schema Edge Cases:** Unusual custom Zod refinements in future schemas might not map to JSON Schema. `validateAIResponse()` ensures application safety regardless of provider-side schema hints.

---

## 26. Decision Register

| Decision ID | Topic | Status | Evidence | Implementation Impact |
| :--- | :--- | :---: | :--- | :--- |
| **P20-G4-D01** | Gemini API Surface Selection | **ACCEPTED** | EXP-03, EXP-04 & Section 17 | `GeminiProvider` targets `ai.models.generateContent()` |
| **P20-G4-D02** | FAST_JSON & DEEP_CONTEXT Model | **ACCEPTED** | EXP-01 & EXP-01B | Default model string `gemini-3.6-flash` for both tiers |
| **P20-G4-D03** | Structured Output Adapter | **ACCEPTED** | EXP-02 | Implement `GeminiSchemaAdapter` (`z.toJSONSchema` + cleaning) |
| **P20-G4-D04** | Safety Block & Finish Reason | **ACCEPTED** | EXP-03 | Inspect `blockReason` and `finishReason` before `JSON.parse` |
| **P20-G4-D05** | MAX_TOKENS Truncation Policy | **ACCEPTED** | EXP-03 | Truncation throws `AIProviderError` immediately; 0 parsing |
| **P20-G4-D06** | Safety Ratings Role | **ACCEPTED** | EXP-03 | Diagnostic context only; `finishReason` is failure authority |
| **P20-G4-D07** | Timeout Enforcement Mechanism | **ACCEPTED** | EXP-04 | `AbortController` + `timedOut` boolean flag + `finally` cleanup |
| **P20-G4-D08** | Error Normalization Target | **ACCEPTED** | EXP-03, EXP-04 | Normalize to existing `AIBaseError` subclasses; 0 new error classes |
| **P20-G4-D09** | Zod Runtime Authority | **ACCEPTED** | 02-specification.md | `validateAIResponse()` / Zod `safeParse()` remains authoritative |
| **P20-G4-D10** | CI Offline Invariant | **ACCEPTED** | 00-contract.md | 0 external network requests during unit tests / CI |

---

## 27. Governing Document Amendments Required Before Track C

**No governing-document amendment is required.**

All Gate-4 architectural decisions (`generateContent` API surface, `gemini-3.6-flash` model mapping, `GeminiSchemaAdapter`, safety/finishReason checks, `AbortController` timeout) are 100% aligned with the existing specification ([02-specification.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/02-specification.md)) and implementation plan ([03-implementation-plan.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/03-implementation-plan.md)).

---

## 28. Track-C Work Package Readiness Check

- **WP-02A (Add `@google/genai` dependency):** **READY.** Prerequisites clear; package name verified.
- **WP-02B (`GeminiProvider` shell & factory registration):** **READY.** Class structure and constructor credentials specified.
- **WP-02C (`GeminiProvider` schema adapter & request payload):** **READY.** Model mapping (`gemini-3.6-flash`) and `GeminiSchemaAdapter` specified.
- **WP-02D (`GeminiProvider` response parsing, safety & error mapping):** **READY.** Safety checks, `MAX_TOKENS` truncation rule, `AbortController` timeout algorithm, and error mapping specified.

---

## 29. Gate 4 Verdict

**GATE 4: APPROVED — TRACK C MAY PROCEED SUBJECT TO GATE 5B**
