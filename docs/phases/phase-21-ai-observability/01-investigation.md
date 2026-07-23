# Phase 21 Investigation — Single Blockade Resolution & Data Minimization Audit

## 1. Executive Overview

This document resolves the Single Phase 21 Investigation Blockade:
> *"What AI execution metadata can Odet-X safely observe and record without persisting prompts, generated AI content, API credentials, secrets, or sensitive project information, and where should that observability boundary live within the existing Phase 20 architecture?"*

Following a strict Gate 1 design audit and final documentation reconciliation, all architectural holes, privacy vulnerabilities, and internal contract contradictions have been resolved to guarantee data privacy, failure-path truthfulness, and future compatibility with Phase 22/23.

---

## 2. Gate 1 Design Audit & Final Architectural Reconciliation

### 2.1 Audit of Proposed `AIProvider` Contract & Failure Model Resolution
- **Initial Hole Identified:** On failure paths (timeout, 500 error, 401 configuration error, safety refusal), `AIService` catches an exception and never receives an `AIProviderResponse` wrapper. Thus `providerResponse.metadata.model` is unavailable on failure.
- **Forbidden anti-patterns:** `AIService` must NOT inspect Anthropic/Gemini config directly, nor use `aiConfig.models` (which hardcodes Anthropic model names).
- **Reconciliation Resolution:** Expose `getModelForTier(tier: AIModelTier): string` as a required public method on the `AIProvider` contract.
  - `AnthropicProvider` and `GeminiProvider` already implement `getModelForTier(tier)` as internal methods.
  - `AIService` calls `this.provider.getModelForTier(options.tier)` synchronously before or during execution, ensuring the intended concrete model string is **100% available on both success and failure paths** without inspecting config directly or leaking model logic.

### 2.2 Reconciled Token Extraction Rules (Unknown vs. Zero)
- **Invariant:** UNKNOWN / UNAVAILABLE token usage != ZERO token usage. Telemetry MUST NOT fabricate zero usage when provider usage metadata is missing.
- **Reconciliation Resolution:**
  - `usage` is optional on `AITelemetryEvent` (`usage?: AIProviderUsage`).
  - Pseudocode MUST NOT use `?? 0` fallbacks when reading provider usage fields.
  - **Anthropic:** If `response.usage` is present and contains numeric `input_tokens` and `output_tokens`, `usage` is populated. Otherwise `usage = undefined`.
  - **Gemini:** If `response.usageMetadata` is present and contains numeric `promptTokenCount` and `candidatesTokenCount`, `usage` is populated. If `usageMetadata` or count fields are missing, `usage = undefined`.

### 2.3 Truthful Usage Retention Matrix Across Failure Paths
- **Path Classification:**
  1. **Success Path (Successful Provider + Successful Zod Validation):** Provider `providerName`, concrete `model`, and token `usage` are ALL AVAILABLE.
  2. **Zod Validation Failure (Provider Envelope Succeeded + Zod Failed):** Provider `providerName`, concrete `model`, and token `usage` (retained from provider response) are ALL AVAILABLE.
  3. **Provider-Internal Parse / Safety / MAX_TOKENS Failure:** Provider `providerName` and concrete `model` are AVAILABLE via `getModelForTier(tier)`. Token `usage` is `undefined` (provider threw exception before returning response envelope).
  4. **Timeout / Network / Configuration Failure:** Provider `providerName` and concrete `model` are AVAILABLE via `getModelForTier(tier)`. Token `usage` is `undefined` (request failed before response envelope arrived).

### 2.4 Listener Failure Isolation Policy (`AITelemetryObserver`)
- **Required Invariant:** TELEMETRY FAILURE MUST NEVER CHANGE AI EXECUTION OUTCOME.
- **Reconciliation Resolution:**
  - `aiLogger.logExecution` invokes each registered listener inside an isolated `try/catch` block.
  - If a telemetry listener throws an error, the error is caught and logged to low-level stderr (`console.error`).
  - A throwing listener DOES NOT bubble errors up to `AIService`, DOES NOT prevent subsequent listeners from executing, DOES NOT mask original AI errors, and DOES NOT alter returned domain data.

### 2.5 Privacy Boundary Enforcement (`errorMessage` Sanitization)
- **Required Invariant:** ZERO leak of prompts, generated content, project data, credentials, or raw output snippets into telemetry.
- **Reconciliation Resolution:** Existing error creation paths (e.g. `AnthropicProvider` line 75 containing `rawText.substring(0, 100)`) MUST be sanitized in `AIService` before populating `AITelemetryEvent.errorMessage`. Raw LLM text snippets are stripped, leaving safe, static error descriptions and `AIErrorCategory` enums.

---

## 3. Truthful Failure Path Metadata Matrix

| Path / Scenario | `provider` Available? | `model` Available? | `usage` Available? | `AITelemetryEvent.usage` Value |
| :--- | :--- | :--- | :--- | :--- |
| **1. Success Path** | YES (`provider.providerName`) | YES (`getModelForTier(tier)`) | YES (from provider response) | `{ inputTokens, outputTokens, totalTokens }` |
| **2. Zod Validation Failure** | YES (`provider.providerName`) | YES (`getModelForTier(tier)`) | YES (retained from provider response) | `{ inputTokens, outputTokens, totalTokens }` |
| **3. Provider-Internal Parse / Safety Failure** | YES (`provider.providerName`) | YES (`getModelForTier(tier)`) | NO (threw before response wrapper) | `undefined` |
| **4. Timeout / Network / Config Failure** | YES (`provider.providerName`) | YES (`getModelForTier(tier)`) | NO (no response envelope received) | `undefined` |

---

## 4. Privacy & Data Minimization Classification

| Field | Classification | Action / Constraint |
| :--- | :--- | :--- |
| `executionId` | **SAFE** | UUID v4 |
| `provider` | **SAFE** | Executing provider string (`provider.providerName`) |
| `tier` | **SAFE** | `FAST_JSON` / `DEEP_CONTEXT` |
| `model` | **SAFE** | Concrete model string (`getModelForTier(tier)`) |
| `promptName` | **SAFE** | Template identifier |
| `promptVersion` | **SAFE** | Version string |
| `durationMs` | **SAFE** | Latency integer |
| `success` | **SAFE** | Boolean |
| `errorType` | **SAFE** | Exception class name |
| `errorCategory` | **SAFE** | Enum string (`TIMEOUT_ERROR`, etc.) |
| `usage` | **SAFE** | Optional token count object (`undefined` if unavailable) |
| `errorMessage` | **CONDITIONALLY SAFE** | MUST BE SANITIZED (no `rawText` snippets) |
| `prompt` / `fullPrompt` | **FORBIDDEN** | User/project text. NEVER LOG. |
| `rawResponse` / `text` | **FORBIDDEN** | Generated LLM text. NEVER LOG. |
| `validatedData` | **FORBIDDEN** | Domain object. NEVER LOG. |
| `apiKey` / `credentials` | **FORBIDDEN** | Secrets. NEVER LOG. |

---

## 5. Empirical Experiment Necessity
**NO GATE 2 EXPERIMENT REQUIRED.** Token usage metadata structures were verified directly from installed SDK TypeScript definitions (`messages.d.ts` and `genai.d.ts`). Zero live API calls are needed or permitted.
