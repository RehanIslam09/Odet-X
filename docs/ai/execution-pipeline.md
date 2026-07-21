# AI Execution Pipeline & Reliability Framework

This document outlines the execution lifecycle of every AI request within the platform.

## Execution Lifecycle

To guarantee consistency, observability, and security, every AI generation request strictly follows this 7-step lifecycle orchestrated by the `AIService`:

1. **Initialization**: A unique `executionId` is generated, and a high-resolution timer begins. The requested `tier` is resolved into a concrete model name using `aiConfig.models`.
2. **Prompt Validation**: The provided `PromptTemplate` is structurally validated against rules (e.g., must contain `system` and `intent` sections).
3. **Prompt Construction**: The template sections are deterministically assembled and wrapped in XML-style tags to mitigate prompt injection.
4. **Provider Execution**: The unified prompt is passed to the concrete provider (e.g., Anthropic), which handles network communication and timeout enforcement.
5. **Response Validation**: The provider's raw output is run through a strict Zod schema pipeline. If the output is malformed, an `AIValidationError` is thrown.
6. **Logging**: The `AIService` emits a structured log entry containing the `executionId`, model, provider, duration, and prompt metadata.
7. **Return**: The service returns an `AIExecutionResult<T>`, containing both the strictly typed business `data` and the observability `metadata`.

## Observability Philosophy

Our logging and metadata strategy is built around observability without compromising privacy:

- **Centralized Logging**: Logging is owned by the `AIService` rather than the Provider. This ensures logs have full context (prompt metadata, exact execution times, and validation status) which the Provider abstraction is oblivious to.
- **No PII Leaks**: We explicitly **DO NOT** log user prompts, AI text responses, or API keys. Only metadata (durations, provider, prompt name/version) is logged.
- **Deterministic Execution Context**: Every request is tagged with an `executionId` to allow tracking failures through external log aggregators seamlessly.

## Debugging Workflow

When debugging an AI failure:
1. Locate the `executionId` in the server logs.
2. The log will clearly indicate whether the failure occurred during **Prompt Validation** (bad code), **Provider Execution** (network/rate limit/timeout), or **Response Validation** (LLM hallucinated bad JSON).
3. Check the `promptName` and `promptVersion` in the metadata to identify the exact prompt responsible.
