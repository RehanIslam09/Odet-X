# AI Foundation Architecture

**Phase 19.1: Provider Abstraction Layer**

This document outlines the architectural decisions made during the initial implementation of the AI module.

## 1. Purpose

The `src/ai` module exists to isolate all AI-specific concerns (LLM integration, prompting, and validation) from the rest of the application. It acts as an abstraction layer between the business logic and the underlying AI providers.

## 2. Orchestration Flow

Every structured AI request follows this exact orchestration flow:

1. **Application Service**: Coordinates the overall workflow (e.g., handling HTTP request, gathering data from the DB).
2. **AI Service**: Receives the request (schema, context, intent) and orchestrates the generation.
3. **Prompt Builder**: Formats the prompt using pure functions, separating system instructions from user context safely.
4. **Provider Interface**: The generic contract (`generateStructured`) that shields the AI Service from specific vendor SDKs.
5. **Concrete Provider**: Implements the Provider Interface for a specific vendor (e.g., `AnthropicProvider`).
6. **Response Validator**: The LLM's raw output is passed through Zod schema validation to ensure it's structurally sound.
7. **Return Result**: The fully validated, strongly-typed data is returned to the Application Service.

## 3. Scope Restraints & Minimal Abstractions

During Phase 19.1, several architectural choices were explicitly simplified to avoid speculative engineering:

- **Single Provider**: We currently only support Anthropic. Therefore, no `provider.factory.ts` or complex DI container was implemented. The `AIService` simply instantiates the `AnthropicProvider`.
- **No Retries or Fallbacks**: The provider orchestration does not include retry loops or cross-provider fallbacks. These belong in a future phase once actual API calls and observability metrics exist.
- **No Global AIResponse Wrapper**: The AI Service does not wrap all responses in a generic `AIResponse<T>` object. Instead, the response naturally shapes itself based on the caller's requirements (e.g., directly returning the validated JSON).
- **No Streaming (Yet)**: The `AIProvider` interface deliberately omits `generateStream()`. It only exposes what is strictly required for the MVP phase (`generateStructured`).

## 4. Error Handling

Errors inside the AI module are clearly categorized for future observability:
- `AIProviderError`: Issues communicating with the LLM (e.g., rate limits, network failures).
- `AIValidationError`: The LLM successfully returned data, but it did not match the provided Zod schema.
- `AIConfigurationError`: Bad setup (e.g., missing API keys).
- `AITimeoutError`: Generation took too long.

These errors inherit from `AIBaseError` and are bubbled up by the `AIService` so the calling Application Service can handle them gracefully (e.g., by returning a 503 or 422 to the client, or disabling the feature locally).

## 5. Security & Prompt Integrity

The `Prompt Builder` deliberately separates system instructions from user-provided context. By wrapping context in `<context>` tags, we reduce the surface area for Prompt Injection attacks. The LLM is structurally guided to treat user inputs as data to analyze, not instructions to execute.
