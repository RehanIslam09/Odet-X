# AI Module

This module is the foundational layer for all AI capabilities in the AI Project Manager. It encapsulates all interactions with LLMs, prompt management, provider specifics, and validation of AI responses.

## Purpose & Responsibilities

- **Abstraction & Decoupling**: Application business logic never talks directly to an AI provider SDK (e.g., Anthropic or OpenAI). It talks to the `AIService`.
- **Validation**: All structured outputs from the LLM are strictly validated through Zod pipelines before they reach the rest of the application.
- **Prompt Infrastructure**: The `src/ai/prompts` directory acts as a lightweight library for defining and assembling prompts from `PromptTemplate` objects and registering them securely.

4. **Execution Framework**: The `AIService` orchestrates a strict 7-step lifecycle for every request, producing predictable observability logs, tracking an internal `executionId`, and wrapping responses in an `AIExecutionResult<T>`.

## Architectural Boundaries

1. **Application Service**: Coordinates the overall workflow (e.g., retrieving a project, mapping data, saving tasks).
2. **AI Service**: Orchestrates the AI request, manages execution context, and owns all logging.
3. **Prompt Builder**: Formats the prompt using pure functions and structural XML delimiters.
4. **Prompt Validator**: Enforces schema and integrity checks on Prompt definitions before they run.
5. **Prompt Registry**: A lightweight store organizing prompts by name.
6. **Provider Interface**: A generic contract strictly defining LLM communication capabilities without concerning itself with observability.
7. **Concrete Provider**: Implements the Provider Interface for a specific vendor (e.g., Anthropic).
8. **Response Validator**: Enforces schema correctness on LLM responses.

## How to Integrate Future Features

When building a new AI feature:
1. Define a `PromptTemplate` incorporating the necessary metadata and static sections (using `GLOBAL_SYSTEM_BEHAVIOR`).
2. Register the template on app startup via `promptRegistry.register()`.
3. In your business service, retrieve the template, clone it to append dynamic user sections (e.g., `context` and `intent`).
4. Call `const { data, metadata } = await aiService.generateStructuredData(clonedTemplate, schema, options)`.
5. Consume `data` for business logic, and optionally use `metadata` for observability.
6. **Never** include business rules (e.g., "save to database") inside the AI module. The AI module only returns validated data.

## Local Development & Setup

To enable AI features locally, you need to configure the Anthropic provider:

1. Obtain an API key from your [Anthropic Console](https://console.anthropic.com/).
2. Add the following to your `.env` file:
   ```env
   # AI Configuration
   ANTHROPIC_API_KEY=your_api_key_here
   AI_DEFAULT_MODEL=claude-3-haiku-20240307
   AI_REQUEST_TIMEOUT=30000
   ```
3. If `ANTHROPIC_API_KEY` is missing, the application will throw an `AIConfigurationError` when an AI feature is invoked.

## What NOT to place in this module

- **Business Logic**: Do not mutate database state here. This module is purely functional—it receives inputs and returns validated outputs.
- **Framework-specific API Code**: Do not put Express controllers or middleware here.
- **Speculative Abstractions**: Do not introduce multi-provider routing, retry layers, or complex prompt classes until a concrete requirement demands them.
