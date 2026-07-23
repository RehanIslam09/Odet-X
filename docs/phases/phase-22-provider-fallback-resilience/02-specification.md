# Phase 22 Specification — Provider Fallback & Resilience Architecture

## 1. Architectural Boundary & Reconciled Principles

The provider fallback architecture introduces resilience to the Odet-X AI subsystem while maintaining absolute isolation between layers:

1. **Orchestration Boundary:** Fallback logic is encapsulated exclusively within `AIService.generateStructuredData()`.
2. **Provider Neutrality:** Concrete providers (`AnthropicProvider`, `GeminiProvider`) and domain services (`ProjectAIService`, `TaskAIService`, `ProjectSummaryAIService`) remain completely unaware of fallback orchestration.
3. **Bounded Execution:** Maximum 2 Application-Level Attempts (Primary $\rightarrow$ Alternate). SDK retries explicitly configured (`maxRetries: 1` in AnthropicProvider).
4. **Explicit Allowlist Error Eligibility:** Only explicitly allowlisted failure reasons (`NETWORK_ERROR`, `TIMEOUT_ERROR`, `RATE_LIMIT_ERROR`, `SERVER_ERROR`, `STRUCTURED_PARSE_ERROR`) trigger fallback. Unknown errors fail fast.
5. **Data Privacy:** Telemetry maintains full Phase 21 privacy compliance.

---

## 2. Component Architecture & Fallback Flow

```
Domain AI Service (e.g. ProjectAIService)
       │
       ▼
   AIService.generateStructuredData(template, schema, options)
       │
       ├─► Attempt 1: Resolve Primary Provider (e.g. Gemini)
       │     │
       │     ├── SUCCESS ──► Log Telemetry (attempt: 1) ──► Return Result
       │     │
       │     └── FAILURE ──► Evaluate isFallbackEligible(error)
       │                         │
       │                         ├── NO ──► Log Telemetry ──► Re-throw Original Error
       │                         │
       │                         └── YES ──► Log Telemetry (attempt: 1, success: false)
       │                                         │
       │                                         ▼
       └─► Attempt 2: Resolve Alternate Provider (e.g. Anthropic)
             │
             ├── Latency Check: t_remaining < 3000ms? ──► YES ──► Re-throw Primary Error
             │                                       │
             │                                       NO
             │                                       ▼
             ├── SUCCESS ──► Log Telemetry (attempt: 2, isFallback: true) ──► Return Result
             │
             └── FAILURE ──► Log Telemetry (attempt: 2) ──► Throw AIFallbackExecutionError
```

---

## 3. Reconciled Specification Contracts

### 3.1 Failure Eligibility Helper (`isFallbackEligible`)

```typescript
export function isFallbackEligible(error: unknown): boolean {
  if (error instanceof AITimeoutError) {
    return true; // TIMEOUT_ERROR is fallback-eligible if latency remains
  }

  if (error instanceof AIProviderError) {
    // Explicit allowlist check based on failureReason
    switch (error.failureReason) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
      case 'RATE_LIMIT_ERROR':
      case 'SERVER_ERROR':
      case 'STRUCTURED_PARSE_ERROR':
        return true;
      
      case 'SAFETY_REFUSAL':
      case 'MAX_TOKENS_TRUNCATION':
      case 'AUTHENTICATION_ERROR':
      default:
        return false; // All other reasons fail fast
    }
  }

  // Non-eligible error classes (AIValidationError, AIConfigurationError, TypeError)
  return false;
}
```

### 3.2 Double Failure Aggregate Exception (`AIFallbackExecutionError`)

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
    this.name = 'AIFallbackExecutionError';
  }
}
```

---

## 4. Telemetry Schema Specification

```typescript
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
  
  // Phase 22 Telemetry Extensions:
  attempt?: number;                 // 1 for primary, 2 for fallback
  isFallback?: boolean;            // true if executed as secondary fallback attempt
  fallbackFromProvider?: string;   // Name of primary provider that failed
  primaryErrorCategory?: AIErrorCategory; // Error category of primary failure
  
  usage?: AIProviderUsage;
  errorType?: string;
  errorCategory?: AIErrorCategory;
  errorMessage?: string;
}
```

---

## 5. Execution Pseudocode (`AIService.generateStructuredData`)

```typescript
public async generateStructuredData<T>(
  template: PromptTemplate,
  schema: ZodSchema<T>,
  options: AIRequestOptions
): Promise<AIExecutionResult<T>> {
  const executionId = crypto.randomUUID();
  const startTime = performance.now();

  const primaryProvider = this.provider;
  const primaryProviderName = primaryProvider.providerName;
  const totalTimeoutMs = options.timeoutMs || aiConfig.timeouts.standard;

  // 1. Primary Attempt Execution (Attempt 1)
  try {
    return await this.executeSingleAttempt(
      primaryProvider,
      template,
      schema,
      { ...options, timeoutMs: totalTimeoutMs },
      executionId,
      startTime,
      { attempt: 1, isFallback: false }
    );
  } catch (primaryError: any) {
    const primaryDurationMs = Math.round(performance.now() - startTime);
    const primaryCategory = this.mapErrorToCategory(primaryError);

    // 2. Fallback Eligibility & Latency Check
    const canFallback = isFallbackEligible(primaryError);
    const alternateProviderName = canFallback ? resolveAlternateProviderName(primaryProviderName) : null;
    const remainingTimeoutMs = Math.max(0, totalTimeoutMs - primaryDurationMs);

    if (!canFallback || !alternateProviderName || remainingTimeoutMs < 3000) {
      // Re-throw original primary error if fallback is not eligible or latency exhausted
      throw primaryError;
    }

    // 3. Alternate Provider Execution (Attempt 2)
    try {
      const alternateProvider = AIProviderFactory.getProvider(alternateProviderName);
      const fallbackStartTime = performance.now();

      return await this.executeSingleAttempt(
        alternateProvider,
        template,
        schema,
        { ...options, timeoutMs: remainingTimeoutMs },
        executionId,
        fallbackStartTime,
        {
          attempt: 2,
          isFallback: true,
          fallbackFromProvider: primaryProviderName,
          primaryErrorCategory: primaryCategory,
        }
      );
    } catch (fallbackError: any) {
      // 4. Double Failure Aggregate Error Handling
      const normPrimary = primaryError instanceof AIBaseError ? primaryError : new AIProviderError(primaryError.message, primaryError);
      const normFallback = fallbackError instanceof AIBaseError ? fallbackError : new AIProviderError(fallbackError.message, fallbackError);

      throw new AIFallbackExecutionError(
        `AI request failed on both primary provider (${primaryProviderName}) and fallback provider (${alternateProviderName}).`,
        normPrimary,
        normFallback,
        primaryProviderName,
        alternateProviderName
      );
    }
  }
}
```

---

## 6. Affirmation of Phase 23 Boundaries

Phase 22 implements **Resilience Only** (post-failure fallback). It strictly prohibits:
- Cost-based routing or primary provider selection based on price.
- Dynamic scoring, performance ranking, or adaptive routing.
- Load balancing or round-robin multi-provider routing.

All such features belong exclusively to Phase 23.
