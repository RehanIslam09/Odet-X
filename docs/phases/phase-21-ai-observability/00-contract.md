# Phase 21 Contract — AI Observability & Usage Intelligence

## 1. Problem Statement

Following the completion of Phase 20 (Multi-Provider AI Architecture & Google Gemini Integration), Odet-X possesses a resilient, multi-provider AI execution core. However, the system currently lacks fine-grained operational observability. Production operators cannot answer key operational questions such as:
- Which concrete AI provider and model executed a request?
- What was the exact latency and success/failure state of each AI capability invocation?
- What token usage was reported by the underlying provider?
- What normalized error category occurred when an execution failed?

Without telemetry, cost tracking, model performance auditing, and operational debugging remain impossible. Furthermore, any observability telemetry must strictly guarantee that prompt text, generated AI content, API keys, credentials, and sensitive user project data are **never** logged or persisted.

---

## 2. Phase 21 Objective

Establish lightweight, production-grade AI observability and usage intelligence across the Odet-X AI subsystem.

The system will capture, structure, and expose telemetry for operational questions:
- Provider identity (`anthropic`, `gemini`)
- Requested semantic model tier (`FAST_JSON`, `DEEP_CONTEXT`)
- Concrete model used (`claude-3-haiku-20240307`, `gemini-3.6-flash`, etc.)
- AI capability/prompt identifier (`project-to-tasks`, `task-auto-label`, `project-summary`)
- Execution duration in milliseconds (`durationMs`)
- Request outcome (success / failure)
- Normalized error category (`PROVIDER_ERROR`, `VALIDATION_ERROR`, `CONFIGURATION_ERROR`, `TIMEOUT_ERROR`)
- Timeout signal indicator
- Token usage counts (`inputTokens`, `outputTokens`, `totalTokens`) returned by providers
- Data privacy compliance (zero leak of prompts, output payloads, credentials, or sensitive domain content)

---

## 3. Governance Budget & Review Gates

Phase 21 is intentionally lightweight compared to Phase 20. It operates under a strict governance budget:

- **Investigation Blockades:** 1 Single Investigation Blockade (No manufactured secondary blockades).
- **Review Gates Total:** 3 Review Gates:
  - **GATE 1:** Design Approval (Current pass)
  - **GATE 3:** Implementation Review
  - **GATE 4:** Final Verification
- **Gate 2 Exception:** Gate 2 (Experiment Review) is intentionally omitted unless investigation reveals an unresolved empirical question that cannot be answered via code/SDK inspection or official documentation.

---

## 4. Single Investigation Blockade Definition

> **Blockade Definition:**
> *"What AI execution metadata can Odet-X safely observe and record without persisting prompts, generated AI content, API credentials, secrets, or sensitive project information, and where should that observability boundary live within the existing Phase 20 architecture?"*

This blockade is fully addressed and resolved in `01-investigation.md`.

---

## 5. Scope & Explicit Non-Goals

### In-Scope (Phase 21 Observability)
- Standardized `AIExecutionResult` / `AITelemetryEvent` metadata model.
- Extraction of token usage (`inputTokens`, `outputTokens`, `totalTokens`) from Anthropic and Gemini provider SDK responses.
- Accurate capture of concrete model string, requested tier, provider identity, capability template name, execution timing, and normalized error category.
- Privacy boundary enforcement: explicit classification of safe, conditional, and forbidden fields.
- Decoupled observability listener/logger interface (`AITelemetryObserver`) invoked centrally by `AIService`.
- 100% offline unit tests validating telemetry emission on success, failure, timeout, and schema validation error.

### Explicit Non-Goals (Out of Scope)
- **NO** Provider Fallback or automatic failover (Reserved for Phase 22).
- **NO** Intelligent routing or dynamic model selection policies (Reserved for Phase 23).
- **NO** Circuit breakers or retry mechanisms.
- **NO** Model benchmarking or automated quality scoring.
- **NO** Persistent database telemetry infrastructure or heavy DB tables unless justified.
- **NO** Prompt redesign, agentic loops, vector DBs, or RAG.
- **NO** Modification of Phase 20 provider abstraction or Zod validation boundaries.
- **NO** Live API calls during CI/testing (Zero-live-call policy remains absolute).

---

## 6. Inherited Phase 20 Invariants

Phase 21 strictly preserves and inherits all Phase 20 platform guarantees:
1. `AIProvider` interface contract.
2. `AIService` facade as the single entry point for domain services.
3. `AIProviderFactory` lazy construction and process-wide caching.
4. Provider credential isolation (missing credentials evaluated lazily).
5. Default provider: Anthropic (`AI_PROVIDER=anthropic`). Supported provider: Gemini (`AI_PROVIDER=gemini`).
6. Semantic model tiers: `FAST_JSON` and `DEEP_CONTEXT`.
7. Gemini model policy (`gemini-3.6-flash`).
8. Zod 4 structured-output schema validation boundary (`validateAIResponse`).
9. `GeminiSchemaAdapter` Zod-to-JSON-Schema conversion.
10. Gemini safety refusal and MAX_TOKENS finishReason semantics (`ONLY STOP succeeds`).
11. `AbortController` timeout cancellation semantics (`AITimeoutError`).
12. Normalized error hierarchy (`AIBaseError`, `AIProviderError`, `AIValidationError`, `AIConfigurationError`, `AITimeoutError`).
13. Domain service provider isolation (`ProjectAIService`, `TaskAIService`, `ProjectSummaryAIService`).
14. Offline CI policy: zero external AI API calls during automated verification.

---

## 7. Privacy & Data-Minimization Policy

Telemetry data **MUST NOT** include sensitive content.
- **SAFE BY DEFAULT:** `executionId`, `provider`, `tier`, `model`, `promptName`, `promptVersion`, `durationMs`, `success`, `errorType`, `errorCategory`, `inputTokens`, `outputTokens`, `totalTokens`, `timestamp`.
- **FORBIDDEN BY DEFAULT:** Prompt text, system prompts, dynamic context input, raw LLM response text, parsed JSON payload, API keys, credentials, authorization headers, raw error stack traces containing user content.

---

## 8. Expected Deliverables

1. `00-contract.md` — Phase 21 Contract & Governance.
2. `01-investigation.md` — Single Investigation Blockade Resolution & Data Minimization Analysis.
3. `02-specification.md` — Technical Specification for AI Observability & Telemetry.
4. `03-implementation-plan.md` — WP-01 to WP-03 Implementation Plan.
5. `reviews/gate-01-design-review.md` — Gate 1 Design Approval Review document.

---

## 9. Acceptance Criteria

1. Every AI capability invocation produces a complete, structured telemetry record with token usage, provider, concrete model, capability name, timing, and status.
2. Token usage metadata is accurately captured from both Anthropic (`usage.input_tokens`, `usage.output_tokens`) and Gemini (`usageMetadata.promptTokenCount`, `usageMetadata.candidatesTokenCount`).
3. Failed requests (timeout, provider error, schema validation failure) log normalized error categories without swallowing exceptions.
4. Zero sensitive data (prompts, outputs, API keys) leaks into log output or telemetry events.
5. `npm run verify` passes 100% offline with zero external AI API calls.

---

## 10. Implementation Authorization Status

> **STATUS: UNAUTHORIZED**
>
> Implementation work (modifying production TypeScript source files or test files) remains **UNAUTHORIZED** until formal Gate 1 Human Review approval is granted.
