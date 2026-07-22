# Phase 20 — Gate 2: Multi-Provider AI Technical Specification

## 1. Executive Summary

### Phase 20 in One Sentence
Phase 20 transforms the AI subsystem from a single concrete Anthropic implementation into a provider-independent architecture introducing Google Gemini as a supported second provider, with zero modifications to domain services or REST API contracts.

### What Phase 20 Changes
- **Provider Abstraction Seam:** Replaces eager concrete instantiation in [AIService](file:///home/rehan/Developer/ai-project-manager/server/src/ai/ai.service.ts) with a lazy `AIProviderFactory` resolver.
- **Google Gemini Integration:** Introduces `GeminiProvider` implementing [AIProvider](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/base.provider.ts) via the official `@google/genai` SDK.
- **Provider-Aware Configuration:** Refactors [ai.config.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/config/ai.config.ts) to support deterministic `AI_PROVIDER=anthropic|gemini` selection and conditional environment variable validation.
- **Lazy Initialization Lifecycle:** Eliminates import-time API key validation crashes, ensuring unselected provider classes are never constructed.
- **Test Seam & Injectability:** Introduces constructor injection on `AIService` to eliminate unsafe `(aiService as any).provider` test mutations.

### What Phase 20 Deliberately Does NOT Change
- **Domain AI Services:** [project-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/project-ai.service.ts), [task-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/task-ai.service.ts), and [project-summary-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/project-summary-ai.service.ts) remain 100% untouched.
- **REST API Endpoints & Response DTOs:** HTTP routes, controllers, request DTOs, and JSON responses remain completely unchanged.
- **Zod Runtime Trust Boundary:** Output validation via [validateAIResponse](file:///home/rehan/Developer/ai-project-manager/server/src/ai/validation/ai-response.validator.ts) remains authoritative and mandatory.
- **Prompt Blueprints:** Prompt definitions in `server/src/ai/prompts/definitions/` and prompt assembly logic in [prompt.builder.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/prompts/builder/prompt.builder.ts) remain vendor-neutral and unchanged.

---

## 2. Current-State Baseline

Based on verified evidence from [01a-repository-reconciliation.md](file:///home/rehan/Developer/ai-project-manager/docs/phases/phase-20-multi-provider-ai/01a-repository-reconciliation.md):

1. **Facade Layer:** [ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/ai.service.ts) exports a module-level singleton `aiService = new AIService()`. Its constructor explicitly executes `this.provider = new AnthropicProvider()`.
2. **Provider Contract:** [base.provider.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/base.provider.ts) defines `AIProvider` exposing `generateStructured<T>(prompt: string, schema: ZodSchema<T>, options: AIRequestOptions): Promise<T>`.
3. **Concrete Implementation:** [anthropic.provider.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/anthropic.provider.ts) wraps `@anthropic-ai/sdk`. Its constructor checks `aiConfig.anthropic.apiKey` and throws `AIConfigurationError` if empty.
4. **Prompt System:** [prompt.registry.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/prompts/registry/prompt.registry.ts) maintains prompt blueprints. [prompt.builder.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/prompts/builder/prompt.builder.ts) formats sections into XML-tagged strings (`<system>`, `<context>`, `<intent>`, `<schema>`).
5. **Runtime Safety Boundary:** [ai-response.validator.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/validation/ai-response.validator.ts) invokes `schema.safeParse(rawData)` inside `AIService.generateStructuredData()`.
6. **Installed Dependencies:** `zod@4.4.3` is installed ([server/package.json](file:///home/rehan/Developer/ai-project-manager/server/package.json#L34)). Native `z.toJSONSchema()` is available.
7. **Eager Instantiation Problem:** Importing [app.ts](file:///home/rehan/Developer/ai-project-manager/server/src/app.ts) imports Express routes -> controllers -> domain AI services -> `aiService` -> `AIService` constructor -> `AnthropicProvider` constructor. This forces `ANTHROPIC_API_KEY` validation on module load, breaking app import if credentials are not preset.

---

## 3. Architectural Invariants

Phase 20 implementation must enforce the following strict invariants:

- **INV-01 (Domain Independence):** Domain services, controllers, routes, and client code MUST NOT import `@anthropic-ai/sdk`, `@google/genai`, or concrete provider classes.
- **INV-02 (Lazy Instantiation):** Provider instances MUST NOT be constructed at module import time. Unselected providers MUST NOT be instantiated or validate credentials.
- **INV-03 (Credential Isolation):** Configuring `AI_PROVIDER=gemini` MUST NOT require `ANTHROPIC_API_KEY`. Configuring `AI_PROVIDER=anthropic` MUST NOT require `GEMINI_API_KEY`.
- **INV-04 (Zod Authority):** Every LLM response MUST be parsed and validated via `validateAIResponse()` / Zod `safeParse()`. Provider-side schema constraints MUST NOT bypass runtime Zod validation.
- **INV-05 (Deterministic Selection):** Provider selection MUST be deterministic via environment configuration (`AI_PROVIDER`). Invalid configurations MUST fail at startup or provider resolution with `AIConfigurationError`.
- **INV-06 (Error Containment):** Provider SDK exceptions MUST NOT escape the provider boundary. All provider failures MUST be mapped to the `AIBaseError` hierarchy.
- **INV-07 (Zero CI Network Calls):** Automated tests and CI verification MUST NOT make live network calls to Anthropic or Google Gemini.

---

## 4. Target Architecture

```mermaid
flowchart TD
    Domain[Domain AI Services] --> AIService[AIService Facade]
    AIService --> Factory[AIProviderFactory]
    
    subgraph Provider Resolution & Caching
        Factory -->|Reads AI_PROVIDER| Config[aiConfig]
        Factory -->|Lazily Resolves| ProviderMap{Provider Resolver}
        ProviderMap -->|AI_PROVIDER=anthropic| AnthropicProv[AnthropicProvider]
        ProviderMap -->|AI_PROVIDER=gemini| GeminiProv[GeminiProvider]
    end

    subgraph Provider Execution
        AnthropicProv --> AnthropicSDK[@anthropic-ai/sdk]
        GeminiProv -->|Schema Adapter| GeminiSDK[@google/genai SDK]
    end

    AnthropicSDK --> ClaudeAPI[Anthropic Claude API]
    GeminiSDK --> GeminiAPI[Google Gemini API]

    AnthropicProv --> ZodValidator[validateAIResponse / Zod safeParse]
    GeminiProv --> ZodValidator
    ZodValidator --> Domain
```

### Component Responsibilities

| Component | Module Path | Primary Responsibility |
| :--- | :--- | :--- |
| **`AIService`** | `server/src/ai/ai.service.ts` | Domain facade; prompt building; orchestrating provider execution; schema validation; execution telemetry logging |
| **`AIProviderFactory`** | `server/src/ai/providers/provider.factory.ts` | Lazy resolver; provider instantiation; instance caching; invalid provider validation |
| **`AIProvider`** | `server/src/ai/providers/base.provider.ts` | Core contract interface: `generateStructured<T>(prompt, schema, options)` |
| **`AnthropicProvider`** | `server/src/ai/providers/anthropic.provider.ts` | Concrete Anthropic SDK wrapper; Anthropic error mapping; markdown fence cleaning |
| **`GeminiProvider`** | `server/src/ai/providers/gemini.provider.ts` | Concrete Google GenAI SDK wrapper; `z.toJSONSchema` conversion; safety block normalization; Gemini error mapping |
| **`aiConfig`** | `server/src/ai/config/ai.config.ts` | Provider-aware configuration schema; conditional credential validation; tier model maps |

---

## 5. Provider Selection Specification

### Configuration Schema (`AI_PROVIDER`)
- **Environment Variable:** `AI_PROVIDER`
- **Accepted Values:** `'anthropic'`, `'gemini'` (case-insensitive, normalized to lowercase).
- **Default Value:** `'anthropic'` (if `AI_PROVIDER` is undefined or empty string).
- **Invalid Value Behavior:** If `AI_PROVIDER` is set to an unsupported value (e.g., `'openai'`), `AIProviderFactory` or `aiConfig` MUST throw an `AIConfigurationError` with message:
  `"Unsupported AI provider: 'openai'. Supported providers are 'anthropic', 'gemini'."`

### Lifecycle Stage Separation
The specification distinguishes 4 separate lifecycle stages:
1. **STAGE A — CONFIGURATION RESOLUTION:** `AI_PROVIDER` is read and normalized when `aiConfig` is evaluated. Zero provider constructors execute. Zero network calls occur.
2. **STAGE B — PROVIDER RESOLUTION:** `AIService` requests the active provider from `AIProviderFactory`.
3. **STAGE C — PROVIDER CONSTRUCTION:** On cache miss, ONLY the selected concrete provider is constructed and validates its credentials. Unselected providers are never constructed.
4. **STAGE D — PROVIDER EXECUTION:** The active provider executes an external API network request only when a domain AI capability calls `aiService.generateStructuredData()`.

---

## 6. Lazy Initialization Specification

### Instantiation Sequence

```
1. Application Bootstrap (app.ts)
   └─► Imports routes & services. Stage A config resolution only. NO provider constructors execute.

2. First AI Capability Execution (e.g. generateTasksForProject)
   └─► Domain Service calls aiService.generateStructuredData(template, schema, options)
        └─► AIService requests provider: this.provider (Stage B Resolution)
             └─► AIProviderFactory.getProvider(aiConfig.provider)
                  ├─► Check Cache: Returns cached instance if present.
                  └─► If Cache Miss (Stage C Construction):
                       ├─► Validate selected provider credentials.
                       ├─► Instantiate concrete provider (e.g. new GeminiProvider()).
                       ├─► Cache instance.
                       └─► Return instance.
        └─► Provider executes generateStructured() (Stage D Execution)
```

### Invariants
- Importing `app.ts` or `ai.service.ts` MUST NOT instantiate `AnthropicProvider` or `GeminiProvider`.
- Unselected providers MUST NOT execute constructor checks or credential validations.

---

## 7. Provider Factory Specification

`AIProviderFactory` will be implemented as a static resolver class in `server/src/ai/providers/provider.factory.ts`.

### Justification for Static Resolver Class in THIS Repository
- **Pattern Alignment:** Matches existing singleton/static repository conventions (`PromptRegistry`, `aiLogger`).
- **Encapsulated Caching:** Privately encapsulates the `Map<string, AIProvider>` instance cache without cluttering module exports.
- **Zero Framework Overhead:** Provides a lightweight resolver seam without introducing complex DI framework machinery.

### Illustrative Pseudocode (ILLUSTRATIVE PSEUDOCODE — NOT IMPLEMENTATION)
```typescript
// ILLUSTRATIVE PSEUDOCODE — NOT IMPLEMENTATION
import { AIProvider } from './base.provider.js';
import { AnthropicProvider } from './anthropic.provider.js';
import { GeminiProvider } from './gemini.provider.js';
import { aiConfig } from '../config/ai.config.js';
import { AIConfigurationError } from '../errors/ai.errors.js';

export class AIProviderFactory {
  private static cache: Map<string, AIProvider> = new Map();

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
      default:
        throw new AIConfigurationError(
          `Unsupported AI provider: '${providerName}'. Supported providers are 'anthropic', 'gemini'.`
        );
    }

    this.cache.set(providerName, provider);
    return provider;
  }

  public static clearCache(): void {
    this.cache.clear();
  }
}
```

---

## 8. AIService Refactoring Specification

### Target Class Structure (ILLUSTRATIVE PSEUDOCODE — NOT IMPLEMENTATION)
```typescript
// ILLUSTRATIVE PSEUDOCODE — NOT IMPLEMENTATION
export class AIService {
  private customProvider?: AIProvider;

  constructor(provider?: AIProvider) {
    if (provider) {
      this.customProvider = provider;
    }
  }

  private get provider(): AIProvider {
    if (this.customProvider) {
      return this.customProvider;
    }
    return AIProviderFactory.getProvider();
  }

  public async generateStructuredData<T>(
    template: PromptTemplate,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<AIExecutionResult<T>> {
    // Orchestration flow:
    // 1. Validate prompt template
    // 2. Build prompt string
    // 3. Resolve active provider via this.provider
    // 4. Execute provider.generateStructured(fullPrompt, schema, options)
    // 5. Validate response via validateAIResponse(rawResponse, schema)
    // 6. Log execution telemetry
    // 7. Return AIExecutionResult<T>
  }
}
```

### Primary Unit Testing Seam
Constructor dependency injection (`new AIService(mockProvider)`) is the primary seam for unit testing `AIService`. Process-global test provider overrides (`setTestProvider`) are intentionally excluded to preserve test isolation and avoid mutable global state.

---

## 9. AIProvider Contract Specification

The core interface in [base.provider.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/base.provider.ts) remains 100% backward-compatible:

```typescript
export interface AIProvider {
  /**
   * Generates structured data validated against the provided Zod schema.
   *
   * @param prompt The complete constructed prompt string.
   * @param schema The Zod schema expected by the caller.
   * @param options Additional request options (tier, custom timeout).
   * @returns Promise resolving to raw parsed JSON data matching shape T.
   */
  generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<T>;
}
```

---

## 10. GeminiProvider Specification

### Core Specification
- **File Location:** `server/src/ai/providers/gemini.provider.ts`
- **SDK Package:** `@google/genai` (Google GenAI SDK)
- **API Surface Target:** `ai.models.generateContent({...})`

### Required Architectural Behaviors
1. **Constructor Credentials:**
   - Reads `aiConfig.gemini.apiKey`.
   - Throws `AIConfigurationError` if `GEMINI_API_KEY` is missing/empty.
2. **Schema Adapter Boundary:**
   - Converts input `ZodSchema<T>` using native `z.toJSONSchema(schema)`.
   - Passes resulting schema through a conceptual Gemini Compatibility Adapter (identity transform unless EXP-02 dictates adaptation).
   - Caches conversions in a `WeakMap<ZodSchema<any>, object>()`.
3. **Safety / Refusal Detection & Normalization:**
   - **REQUIRED BEHAVIOR:** `GeminiProvider` MUST inspect Gemini API response structures for prompt-level safety blocks, candidate-level refusal/safety stops, or empty candidate payloads, and normalize them into an `AIProviderError` with descriptive message.
   - *Note:* Exact SDK property names (`promptFeedback.blockReason`, `candidate.finishReason`) are candidate hypotheses subject to EXP-03 verification.
4. **Timeout / Cancellation:**
   - **REQUIRED BEHAVIOR:** `GeminiProvider` MUST enforce the configured request timeout (`options.timeoutMs` / `aiConfig.timeouts.standard`) and normalize timeout failures into `AITimeoutError`.
   - *Note:* Exact SDK cancellation signal mechanics (`AbortSignal` / `AbortController`) are subject to EXP-04 verification.
5. **Markdown Fence Stripping & JSON Parsing:**
   - Extracts text content, strips markdown fences (`rawText.replace(/^```(json)?\n/, '').replace(/\n```$/, '')`), and parses JSON. Throws `AIProviderError` on syntax error.
6. **Error Normalization:**
   - Catches raw `@google/genai` exceptions and maps them to `AIBaseError` subclasses (`AIConfigurationError`, `AITimeoutError`, `AIProviderError`).

---

## 11. AnthropicProvider Compatibility Specification

- **File Location:** [server/src/ai/providers/anthropic.provider.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/anthropic.provider.ts)
- **Status:** Retained as first-class primary provider.
- **Refactoring Scope:**
  - Update model lookups to read `aiConfig.anthropic.models` rather than shared `aiConfig.models`.
  - All Anthropic SDK calls, error mapping, fence stripping, and JSON parsing remain 100% unchanged.

---

## 12. Model Tier Architecture

### Configuration Structure (`ai.config.ts`)

```typescript
// PROVISIONAL EXAMPLES — NOT APPROVED CONFIGURATION. Subject to EXP-01.
export const aiConfig = {
  provider: (process.env.AI_PROVIDER || 'anthropic').toLowerCase(),

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    models: {
      fastJson: process.env.ANTHROPIC_FAST_MODEL || 'claude-3-haiku-20240307',
      deepContext: process.env.ANTHROPIC_DEEP_MODEL || 'claude-3-sonnet-20240229',
    },
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    models: {
      // PROVISIONAL EXAMPLES — NOT APPROVED CONFIGURATION. Subject to EXP-01.
      fastJson: process.env.GEMINI_FAST_MODEL || '<EXP-01 selected Gemini fast model>',
      deepContext: process.env.GEMINI_DEEP_MODEL || '<EXP-01 selected Gemini deep-context model>',
    },
  },

  timeouts: {
    standard: parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10),
  },
};
```

---

## 13. Configuration & Environment Contract

### Environment Variable Matrix

| Variable Name | Role | Required When | Default Value | Validation Location |
| :--- | :--- | :--- | :--- | :--- |
| `AI_PROVIDER` | Provider Selector | Optional | `'anthropic'` | `aiConfig` |
| `ANTHROPIC_API_KEY` | Anthropic Credentials | Only if `AI_PROVIDER=anthropic` | `''` | `AnthropicProvider` constructor |
| `GEMINI_API_KEY` | Gemini Credentials | Only if `AI_PROVIDER=gemini` | `''` | `GeminiProvider` constructor |
| `AI_REQUEST_TIMEOUT` | Timeout limit (ms) | Optional | `30000` | `aiConfig` |

### Environment Validation Isolation
`server/src/config/env.ts` enforces core app vars (`PORT`, `MONGODB_URI`, etc.). AI API keys remain validated inside their respective concrete provider constructors during Stage C construction, ensuring zero cross-provider key validation failures.

---

## 14. Structured Output Strategy

```
1. Domain Service passes Zod Schema (e.g. GenerateTasksResponseSchema)
2. AIService passes Zod Schema to Provider
3. GeminiProvider converts Zod Schema via z.toJSONSchema(schema)
4. GeminiProvider passes result through Schema Adapter (identity transform unless EXP-02 requires adaptation)
5. Gemini Provider sends resulting schema in config.responseSchema
6. Gemini API returns constrained JSON string
7. GeminiProvider strips codeblock fences & executes JSON.parse()
8. AIService passes parsed object to validateAIResponse(parsedJson, GenerateTasksResponseSchema)
9. validateAIResponse executes GenerateTasksResponseSchema.safeParse(parsedJson)
10. Strongly typed data returned to Domain Service
```

**Zod Authority Invariant:** Provider schema hints guide the model, but `validateAIResponse()` / Zod `safeParse()` remains the authoritative application boundary.

---

## 15. Prompt Portability Contract

- Prompts defined in `server/src/ai/prompts/definitions/` are provider-agnostic.
- `PromptBuilder.buildPrompt()` outputs XML-delimited prompt strings (`<system>`, `<context>`, `<intent>`, `<schema>`).
- Both `AnthropicProvider` and `GeminiProvider` receive the exact same assembled prompt string, maintaining 100% prompt content parity.

---

## 16. Error Normalization Specification

### Domain Error Mapping (Independent of HTTP Layer)

| Provider Failure Category | Required Provider Mapping | Target Domain Error Class |
| :--- | :--- | :--- |
| **Missing API Key** | Empty key during Stage C Construction | `AIConfigurationError` |
| **Invalid Provider** | Unsupported provider string in factory | `AIConfigurationError` |
| **Authentication Failure** | SDK 401 / Invalid Credentials exception | `AIConfigurationError` |
| **Rate Limit** | SDK 429 / Throttling exception | `AIProviderError` |
| **Request Timeout** | Timeout threshold reached | `AITimeoutError` |
| **Safety / Content Block** | Prompt or candidate safety refusal detected | `AIProviderError` |
| **Malformed JSON** | `JSON.parse` syntax failure | `AIProviderError` |
| **Schema Validation Mismatch** | Zod `safeParse()` failure in AIService | `AIValidationError` |

*Note:* Express HTTP status translation (400, 429, 500, etc.) is handled separately by [error-handler.ts](file:///home/rehan/Developer/ai-project-manager/server/src/middleware/error-handler.ts) and controller async wrappers. The provider layer's sole responsibility is normalizing SDK errors into the `AIBaseError` hierarchy.

---

## 17. Timeout & Cancellation Semantics

- **Standard Timeout:** Configured via `aiConfig.timeouts.standard` (default: 30,000ms).
- **Required Behavior:** `GeminiProvider` MUST enforce request execution timeouts. If execution time exceeds the timeout threshold, `GeminiProvider` MUST throw `AITimeoutError("Gemini API request timed out after <ms>ms")`.
- **Cancellation Mechanics (Subject to EXP-04):** EXP-04 will verify whether `@google/genai` natively supports `AbortSignal` in `generateContent` or requires promise-race timer wrapping.

---

## 18. Logging & Observability

- [aiLogger](file:///home/rehan/Developer/ai-project-manager/server/src/ai/utils/logger.ts) records execution telemetry:
  ```json
  {
    "timestamp": "2026-07-22T21:19:31.000Z",
    "level": "info",
    "module": "AI",
    "executionId": "c8f92a10-4b82-412e-9d8a-1234567890ab",
    "provider": "gemini",
    "model": "<EXP-01 selected model>",
    "promptName": "project-to-tasks",
    "promptVersion": "1.0.0",
    "executionTimeMs": 850,
    "success": true
  }
  ```
- `AIService` model resolution queries the active provider's configured model tier mapping.
- API keys, credentials, and raw prompts containing user inputs are excluded from log outputs.

---

## 19. Testing Strategy

### 1. Unit Tests (`server/src/ai/tests/provider.factory.test.ts`)
- Tests default selection (`AI_PROVIDER` unset -> `anthropic`).
- Tests explicit `gemini` selection.
- Tests invalid provider string (`AI_PROVIDER=invalid` -> throws `AIConfigurationError`).
- Tests lazy initialization (unselected provider constructor is never called).
- Tests cache reset (`AIProviderFactory.clearCache()`).

### 2. Provider Unit Tests (`server/src/ai/tests/gemini.provider.test.ts`)
- Tests mock `@google/genai` client response handling.
- Tests JSON fence cleaning (` ```json ... ``` `).
- Tests safety block handling and error mapping using mock response objects.

### 3. Facade Tests (`server/src/ai/tests/execution.test.ts`)
- Refactored to pass `new AIService(new MockProvider())` via constructor dependency injection.

### 4. Integration & Smoke Tests
- Domain tests ([project-ai.test.ts](file:///home/rehan/Developer/ai-project-manager/server/src/tests/project-ai.test.ts), etc.) continue stubbing `generateStructuredData()`.
- Smoke test ([smoke.ts](file:///home/rehan/Developer/ai-project-manager/server/src/smoke.ts)) asserts clean application import (`import "./app.js"`). Due to lazy initialization, importing `app.ts` does NOT instantiate any concrete provider or require live API credentials.

---

## 20. CI / Smoke Verification Contract

- **CI Strategy:** `npm run verify` in `.github/workflows/ci.yml` will execute smoke verification and unit tests offline.
- **Smoke Assurance:** Application smoke test ([smoke.ts](file:///home/rehan/Developer/ai-project-manager/server/src/smoke.ts)) verifies route, middleware, and prompt registry initialization without constructing concrete provider instances or making network calls.
- **Offline Guarantee:** Zero unit, integration, or smoke tests in CI will invoke live external network APIs.

---

## 21. Backwards Compatibility Contract

The following artifacts MUST remain 100% unchanged:
- REST API routes (`/api/v1/projects/:id/generate-tasks`, `/tasks/:id/generate-labels`, `/projects/:id/generate-summary`).
- Domain service signatures (`generateTasksForProject`, `generateLabelsForTask`, `generateSummaryForProject`).
- Zod response schemas (`GenerateTasksResponseSchema`, `GeneratedLabelsSchema`, `GeneratedProjectSummarySchema`).
- Express controllers and response DTO shapes.
- Database schemas and MongoDB persistence logic.

---

## 22. Security Considerations

- `GEMINI_API_KEY` and `ANTHROPIC_API_KEY` remain strictly server-side environment variables.
- Raw LLM responses continue to be parsed as untrusted data and validated against Zod schemas.
- Log telemetry outputs never include API keys or authorization headers.

---

## 23. Performance & Cost Boundaries

- Provider instances are cached in `AIProviderFactory` to prevent redundant client instantiation per request.
- Zod -> JSON Schema conversions in `GeminiProvider` are cached in a `WeakMap`.
- Zero network requests occur during module import or application bootstrap.

---

## 24. File-Level Change Surface

| File Path | Action | Reason |
| :--- | :--- | :--- |
| `server/src/ai/providers/provider.factory.ts` | **[NEW]** | Implement `AIProviderFactory` resolver |
| `server/src/ai/providers/gemini.provider.ts` | **[NEW]** | Implement `GeminiProvider` concrete class |
| `server/src/ai/tests/provider.factory.test.ts` | **[NEW]** | Unit tests for factory resolver |
| `server/src/ai/tests/gemini.provider.test.ts` | **[NEW]** | Unit tests for Gemini provider |
| [server/src/ai/ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/ai.service.ts) | **[MODIFY]** | Add constructor injection seam; delegate to factory |
| [server/src/ai/config/ai.config.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/config/ai.config.ts) | **[MODIFY]** | Add multi-provider configuration & model maps |
| [server/src/ai/providers/anthropic.provider.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/providers/anthropic.provider.ts) | **[MODIFY]** | Update model config lookups |
| [server/src/ai/tests/execution.test.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/tests/execution.test.ts) | **[MODIFY]** | Update mock provider injection pattern |
| [server/package.json](file:///home/rehan/Developer/ai-project-manager/server/package.json) | **[MODIFY]** | Add `@google/genai` dependency |
| [server/.env.example](file:///home/rehan/Developer/ai-project-manager/server/.env.example) | **[MODIFY]** | Add `AI_PROVIDER` and `GEMINI_API_KEY` examples |

---

## 25. Migration Strategy

1. **Phase 20 Stage 03:** Produce Implementation Plan & Work Packages.
2. **Phase 20 Stage 04:** Execute Bounded Experiments (EXP-01 through EXP-04).
3. **Phase 20 Stage 05 (Work Package Execution):**
   - WP-01: Provider Factory & Config Refactor
   - WP-02: Gemini Provider Implementation (`@google/genai`)
   - WP-03: Test Suite & Injection Seams
   - WP-04: Smoke & CI Verification
4. **Phase 20 Stage 06:** Final Verification (`npm run verify`).

---

## 26. Implementation-Grade Open Experiments Register

### EXP-01 — Gemini Model Availability & Tier Mapping
- **Question:** Which exact non-deprecated Gemini 3.x model identifiers provide optimal performance, cost, and stability for `FAST_JSON` and `DEEP_CONTEXT` tiers?
- **Why It Is Unresolved:** Model availability strings evolve rapidly; `gemini-3.6-flash` status had conflicting reports at investigation time.
- **Hypothesis (Provisional):** `gemini-3.1-flash-lite` for `FAST_JSON`; `gemini-3.5-flash` for `DEEP_CONTEXT`.
- **Minimum Experiment:** Execute live SDK `ai.models.list()` call and run structured output benchmark scripts against candidate model strings.
- **Inputs:** Candidate model strings (`gemini-3.1-flash-lite`, `gemini-3.5-flash`, `gemini-3.6-flash`), test prompts, target Zod schemas.
- **Evidence Required:** Successful JSON output generation, latency timings, and model list API response.
- **Exit Criteria:** Approved model identifier strings locked for `aiConfig.gemini.models`.
- **Blocks:** Hardcoded default model strings in WP-02 / `ai.config.ts`.
- **Does NOT Block:** `AIProviderFactory` implementation (WP-01), `AIService` refactoring (WP-01), Anthropic provider preservation.
- **Expected Artifact:** `docs/phases/phase-20-multi-provider-ai/experiments/exp-01-model-selection.md`

### EXP-02 — Zod 4 JSON Schema -> Gemini responseSchema Compatibility
- **Question:** Does `z.toJSONSchema(schema)` output pass directly into `@google/genai`'s `responseSchema` without rejecting unsupported OpenAPI/JSON Schema keywords?
- **Why It Is Unresolved:** Gemini uses an OpenAPI-subset schema dialect; silent keyword rejections must be tested empirically against all three production schemas.
- **Hypothesis (Provisional):** `z.toJSONSchema()` output is compatible, but an identity Schema Adapter is required to handle edge cases if keywords are rejected.
- **Minimum Experiment:** Convert all three production schemas using `z.toJSONSchema()` and pass them to `@google/genai` in offline/mock and live API tests.
- **Inputs:** [project-tasks.schema.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/schemas/project-tasks.schema.ts), [task-labels.schema.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/schemas/task-labels.schema.ts), [project-summary.schema.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/schemas/project-summary.schema.ts).
- **Evidence Required:** Zero schema compilation errors from `@google/genai` SDK; valid JSON returned matching target keys.
- **Exit Criteria:** Confirmed Schema Adapter implementation (identity vs keyword filtering).
- **Blocks:** `GeminiProvider` schema conversion logic (WP-02).
- **Does NOT Block:** `AIProviderFactory` (WP-01), `aiConfig` refactoring (WP-01), Anthropic provider preservation.
- **Expected Artifact:** `docs/phases/phase-20-multi-provider-ai/experiments/exp-02-schema-compatibility.md`

### EXP-03 — Gemini Safety / Blocked Response Behavior
- **Question:** What is the exact response object shape and exception behavior when `@google/genai` encounters a prompt-level safety block or candidate-level refusal?
- **Why It Is Unresolved:** Safety blocks can return responses with empty candidate text or specific finish reasons rather than throwing SDK exceptions.
- **Hypothesis (Provisional):** Safety blocks populate `promptFeedback` or candidate `finishReason` without throwing; `GeminiProvider` must inspect candidate state before calling `JSON.parse()`.
- **Minimum Experiment:** Execute test script with safety-triggering test prompts against `@google/genai` and record full response object structure.
- **Inputs:** Test prompts designed to trigger safety/refusal responses.
- **Evidence Required:** Documented response object property paths (`promptFeedback`, `finishReason`) for blocked calls.
- **Exit Criteria:** Verified refusal detection logic inside `GeminiProvider`.
- **Blocks:** `GeminiProvider` safety error mapping logic (WP-02).
- **Does NOT Block:** Provider factory (WP-01), configuration refactoring (WP-01), Anthropic provider preservation.
- **Expected Artifact:** `docs/phases/phase-20-multi-provider-ai/experiments/exp-03-safety-handling.md`

### EXP-04 — Gemini Timeout & Cancellation Semantics
- **Question:** Does `@google/genai`'s `generateContent` natively support `AbortSignal` cancellation, and what exception shape is thrown on timeout?
- **Why It Is Unresolved:** Cancellation support varies across SDK methods; exact thrown error class on abort must be verified.
- **Hypothesis (Provisional):** `config.abortSignal` is supported; aborted requests throw an `AbortError` or SDK network exception that maps to `AITimeoutError`.
- **Minimum Experiment:** Execute `generateContent` with a pre-aborted `AbortController` or 1ms timeout and verify caught error type.
- **Inputs:** AbortController, 1ms timeout threshold, standard test prompt.
- **Evidence Required:** Confirmed request cancellation and verified caught exception type.
- **Exit Criteria:** Confirmed timeout mechanism in `GeminiProvider`.
- **Blocks:** `GeminiProvider` timeout implementation (WP-02).
- **Does NOT Block:** Provider factory (WP-01), configuration refactoring (WP-01), Anthropic provider preservation.
- **Expected Artifact:** `docs/phases/phase-20-multi-provider-ai/experiments/exp-04-timeout-semantics.md`

---

## 27. Experiment Dependency Matrix

| Experiment | Blocks | Does NOT Block |
| :--- | :--- | :--- |
| **EXP-01** (Model Selection) | WP-02 Gemini default model strings in `aiConfig.ts` | WP-01 Provider factory, WP-01 Config structure, Anthropic path |
| **EXP-02** (Schema Compatibility) | WP-02 `GeminiProvider` schema conversion adapter | WP-01 Provider factory, WP-01 Config structure, Anthropic path |
| **EXP-03** (Safety Handling) | WP-02 `GeminiProvider` safety error normalization | WP-01 Provider factory, WP-01 Config structure, Anthropic path |
| **EXP-04** (Timeout Semantics) | WP-02 `GeminiProvider` cancellation implementation | WP-01 Provider factory, WP-01 Config structure, Anthropic path |

---

## 28. Decision Register

| Decision ID | Topic | Status | Evidence | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **P20-D01** | Global Provider Selection Scope | **ACCEPTED** | Contract Section 7.3/7.4 | `AI_PROVIDER` configures application-wide provider |
| **P20-D02** | `AIProviderFactory` Architecture | **ACCEPTED** | Repository code style & Section 7 | Static resolver class with instance caching |
| **P20-D03** | Lazy Provider Construction | **ACCEPTED** | [ai.service.ts#L22](file:///home/rehan/Developer/ai-project-manager/server/src/ai/ai.service.ts#L22) evidence | Unselected providers are never constructed |
| **P20-D04** | Provider Instance Caching | **ACCEPTED** | Performance boundary Section 23 | Process-wide cache map prevents redundant SDK instantiation |
| **P20-D05** | Test Injection Architecture | **ACCEPTED** | [execution.test.ts#L38](file:///home/rehan/Developer/ai-project-manager/server/src/ai/tests/execution.test.ts#L38) evidence | Constructor injection `AIService(provider?)` eliminates mutation hacks |
| **P20-D06** | Semantic Model Tiers | **ACCEPTED** | [types/index.ts#L4](file:///home/rehan/Developer/ai-project-manager/server/src/ai/types/index.ts#L4) | `FAST_JSON` and `DEEP_CONTEXT` remain vendor-neutral tiers |
| **P20-D07** | Zod Runtime Authority | **ACCEPTED** | [ai-response.validator.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/validation/ai-response.validator.ts) | `validateAIResponse()` remains authoritative runtime boundary |
| **P20-D08** | Prompt Portability (Approach A) | **ACCEPTED** | Prompt definitions in `server/src/ai/prompts/` | Send assembled XML string without parsing/extraction |
| **P20-D09** | Structured-Output Adapter Boundary | **PROVISIONAL** | `zod@4.4.3` installed; EXP-02 pending | Schema adapter boundary (`z.toJSONSchema` -> Adapter -> Gemini) |
| **P20-D10** | Error Normalization Boundary | **ACCEPTED** | [ai.errors.ts](file:///home/rehan/Developer/ai-project-manager/server/src/ai/errors/ai.errors.ts) | Providers normalize SDK errors into `AIBaseError` hierarchy |
| **P20-D11** | Smoke-Test Responsibility | **ACCEPTED** | [smoke.ts](file:///home/rehan/Developer/ai-project-manager/server/src/smoke.ts) | Smoke verifies app bootstrap; lazy init requires 0 provider calls |
| **P20-D12** | CI Offline Guarantee | **ACCEPTED** | [.github/workflows/ci.yml](file:///home/rehan/Developer/ai-project-manager/.github/workflows/ci.yml) | Unit/contract tests use mock SDK objects; zero live network calls |
| **P20-D13** | Gemini Model Strings | **BLOCKED BY EXP-01** | EXP-01 pending | Final model string defaults blocked by EXP-01 |
| **P20-D14** | Gemini Safety Refusal Detection | **BLOCKED BY EXP-03** | EXP-03 pending | Exact SDK safety response shape blocked by EXP-03 |
| **P20-D15** | Gemini Timeout Cancellation | **BLOCKED BY EXP-04** | EXP-04 pending | Exact SDK cancellation signal mechanics blocked by EXP-04 |

---

## 29. Acceptance Criteria

- [ ] `AI_PROVIDER=anthropic` executes AI tasks via Anthropic Claude.
- [ ] `AI_PROVIDER=gemini` executes AI tasks via Google Gemini.
- [ ] Domain services ([project-ai.service.ts](file:///home/rehan/Developer/ai-project-manager/server/src/services/project-ai.service.ts), etc.) contain zero provider SDK imports.
- [ ] `AI_PROVIDER=gemini` boots without `ANTHROPIC_API_KEY` present.
- [ ] `AI_PROVIDER=anthropic` boots without `GEMINI_API_KEY` present.
- [ ] Invalid `AI_PROVIDER` values fail with `AIConfigurationError`.
- [ ] All Gemini responses pass Zod schema validation in `validateAIResponse()`.
- [ ] Unit tests for `AIProviderFactory` and `GeminiProvider` pass offline.
- [ ] `npm run verify` (lint, typecheck, test, build, smoke) passes 100% clean.

---

## 30. Explicit Non-Goals

- No automatic provider failover or fallback.
- No per-capability or per-request provider routing.
- No streaming UI responses.
- No RAG, embeddings, or vector databases.
- No OpenAI or local model implementations.
- No user-facing provider selection UI.

---

## 31. Gate 2 Verdict

### Verdict: GATE 2: APPROVE FOR IMPLEMENTATION PLANNING

**Reasoning:**
The technical specification for Phase 20 is fully hardened, complete, and self-contained. Architectural boundaries (lazy provider factory, constructor dependency injection, Zod runtime authority, isolated configuration, and error normalization) are 100% defined. Provider-specific runtime uncertainties are explicitly isolated into an implementation-grade Open Experiments Register (EXP-01 through EXP-04) with a clear dependency matrix, ensuring implementation planning (Stage 03) can proceed without risking unverified assumptions.

*Note: Approval of Gate 2 does NOT authorize implementation. Execution must proceed to Stage 03 (Implementation Plan & Work Packages).*
