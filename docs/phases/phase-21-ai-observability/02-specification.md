# Phase 21 Specification — AI Observability & Usage Intelligence

## 1. Data Contracts & Interfaces

### 1.1 Provider Usage & Metadata (`server/src/ai/types/index.ts`)

```typescript
/**
 * Token usage counts reported by the underlying AI provider.
 */
export interface AIProviderUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Metadata captured directly from the provider execution layer.
 */
export interface AIProviderMetadata {
  model: string;
  usage?: AIProviderUsage;
}

/**
 * Enhanced response object returned by concrete AIProvider implementations.
 */
export interface AIProviderResponse<T> {
  data: T;
  metadata: AIProviderMetadata;
}
```

### 1.2 Telemetry Event & Observer Contract (`server/src/ai/types/index.ts` & `server/src/ai/utils/logger.ts`)

```typescript
/**
 * High-level normalized error categories for observability.
 */
export type AIErrorCategory =
  | 'PROVIDER_ERROR'
  | 'VALIDATION_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Standardized telemetry event emitted for every AI capability request.
 */
export interface AITelemetryEvent {
  executionId: string;
  timestamp: string;
  provider: string;
  tier: AIModelTier;
  model: string;
  promptName: string;
  promptVersion: string;
  durationMs: number;
  success: boolean;
  usage?: AIProviderUsage;
  errorType?: string;
  errorCategory?: AIErrorCategory;
  errorMessage?: string;
}

/**
 * Listener interface for telemetry events (used for test assertions and future sinks).
 */
export type AITelemetryListener = (event: AITelemetryEvent) => void;
```

---

## 2. Core Provider Contract (`server/src/ai/providers/base.provider.ts`)

```typescript
import { ZodSchema } from 'zod';
import { AIRequestOptions, AIModelTier, AIProviderResponse } from '../types/index.js';

export interface AIProvider {
  /**
   * Unique name identifying the concrete provider (e.g. 'anthropic', 'gemini').
   */
  readonly providerName: string;

  /**
   * Resolves the concrete model identifier for a given capability tier.
   * Enables model resolution on success AND failure paths without config inspection.
   */
  getModelForTier(tier: AIModelTier): string;

  /**
   * Generates structured data validated against the provided Zod schema,
   * returning parsed data along with provider-level metadata (model, usage).
   */
  generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options: AIRequestOptions
  ): Promise<AIProviderResponse<T>>;
}
```

---

## 3. Provider Implementation & Token Extraction Specifications

### 3.1 Anthropic Provider (`server/src/ai/providers/anthropic.provider.ts`)
- `readonly providerName = 'anthropic';`
- Implements public `getModelForTier(tier: AIModelTier): string`.
- Invokes `this.client.messages.create(...)`.
- **Token Extraction Policy:**
  - Check `response.usage`.
  - If `typeof response.usage?.input_tokens === 'number'` and `typeof response.usage?.output_tokens === 'number'`:
    `usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, totalTokens: response.usage.input_tokens + response.usage.output_tokens }`.
  - Otherwise `usage = undefined` (NO `?? 0` fallbacks).
- Returns `AIProviderResponse<T>` containing `data` and `{ model, usage }`.

### 3.2 Gemini Provider (`server/src/ai/providers/gemini.provider.ts`)
- `readonly providerName = 'gemini';`
- Implements public `getModelForTier(tier: AIModelTier): string`.
- Invokes `this.client.models.generateContent(...)`.
- **Token Extraction Policy:**
  - Check `response.usageMetadata`.
  - If `typeof response.usageMetadata?.promptTokenCount === 'number'` and `typeof response.usageMetadata?.candidatesTokenCount === 'number'`:
    `inputTokens = response.usageMetadata.promptTokenCount`
    `outputTokens = response.usageMetadata.candidatesTokenCount`
    `totalTokens = response.usageMetadata.totalTokenCount ?? (inputTokens + outputTokens)`
    `usage = { inputTokens, outputTokens, totalTokens }`.
  - Otherwise `usage = undefined` (NO `?? 0` fallbacks).
- Returns `AIProviderResponse<T>` containing `data` and `{ model, usage }`.

---

## 4. AIService Telemetry Orchestration & Failure Model Resolution (`server/src/ai/ai.service.ts`)

1. Generate `executionId = crypto.randomUUID()`.
2. Record `startTime = Date.now()`.
3. Resolve concrete model string synchronously via `this.provider.getModelForTier(options.tier)`.
4. Invoke `provider.generateStructured(fullPrompt, schema, options)`.
5. Validate response via `validateAIResponse(providerResponse.data, schema)`.
6. Construct `AITelemetryEvent` for Success:
   - `executionId`, `timestamp`, `provider: this.provider.providerName`, `tier: options.tier`, `model`, `promptName`, `promptVersion`, `durationMs: Date.now() - startTime`, `success: true`, `usage: providerResponse.metadata.usage`.
7. Emit event to `aiLogger` and registered observers.
8. On Catch (Failure):
   - Map error to `AIErrorCategory` (`AITimeoutError` -> `TIMEOUT_ERROR`, `AIValidationError` -> `VALIDATION_ERROR`, `AIConfigurationError` -> `CONFIGURATION_ERROR`, `AIProviderError` -> `PROVIDER_ERROR`, default -> `UNKNOWN_ERROR`).
   - Resolve `usage`: Retain `providerResponse.metadata.usage` if available (Zod validation failure), or set `usage = undefined` if execution failed before response wrapper was returned.
   - Sanitize `errorMessage`: Strip raw LLM response text or prompt snippets, providing safe static message.
   - Construct failure `AITelemetryEvent` with `model` (resolved via `getModelForTier`), `provider: this.provider.providerName`, `success: false`, `errorCategory`, `usage`.
   - Emit failure `AITelemetryEvent`.
   - Re-throw normalized error.

---

## 5. Logging & Listener Failure Isolation (`server/src/ai/utils/logger.ts`)

```typescript
export const aiLogger = {
  logExecution(event: AITelemetryEvent): void {
    // 1. Primary console JSON logging
    const logEntry = { timestamp: new Date().toISOString(), level: event.success ? 'info' : 'error', module: 'AI', ...event };
    if (event.success) { console.log(JSON.stringify(logEntry)); }
    else { console.error(JSON.stringify(logEntry)); }

    // 2. Observer listener invocation with per-listener isolation
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (listenerErr) {
        // Prevent listener failures from bubbling up or changing execution outcome
        console.error('aiLogger: Telemetry listener threw an error:', listenerErr);
      }
    }
  },
  onTelemetry(listener: AITelemetryListener): void { listeners.add(listener); },
  offTelemetry(listener: AITelemetryListener): void { listeners.delete(listener); },
  clearListeners(): void { listeners.clear(); }
};
```

---

## 6. Privacy & Domain Backward Compatibility

- Privacy: `AITelemetryEvent` strictly excludes `prompt`, `fullPrompt`, `content`, `text`, `validatedData`, `apiKey`, `headers`, `userId`, `projectId`, and raw LLM response snippets.
- Domain Compatibility: `AIService.generateStructuredData<T>` signature remains **UNCHANGED**:
  `generateStructuredData<T>(template: PromptTemplate, schema: ZodSchema<T>, options: AIRequestOptions): Promise<AIExecutionResult<T>>`
- Domain services (`ProjectAIService`, `TaskAIService`, `ProjectSummaryAIService`) require **ZERO** code changes.
