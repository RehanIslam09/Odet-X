# AI Module

This module is the foundational layer for all AI capabilities in the AI Project Manager. It encapsulates all interactions with LLMs, prompt management, provider specifics, and validation of AI responses.

## Purpose & Responsibilities

- **Abstraction & Decoupling**: Application business logic never talks directly to an AI provider SDK (e.g., Anthropic or OpenAI). It talks to the `AIService`.
- **Validation**: All structured outputs from the LLM are strictly validated through Zod pipelines before they reach the rest of the application.
- **Prompt Organization**: Prompts are composed centrally using shared utilities to ensure immutability of system instructions and secure injection of user context.

## Architectural Boundaries

1. **Application Service**: Coordinates the overall workflow (e.g., retrieving a project, mapping data, saving tasks).
2. **AI Service**: Orchestrates the AI request.
3. **Prompt Builder**: Formats the prompt using pure functions.
4. **Provider Interface**: A generic contract defining supported AI capabilities (e.g., `generateStructured`).
5. **Concrete Provider**: Implements the Provider Interface for a specific vendor (e.g., Anthropic).
6. **Response Validator**: Enforces schema correctness on LLM responses.

## How to Integrate Future Features

When building a new AI feature:
1. Define the necessary context and user intent.
2. If it requires a structured response, define a Zod schema.
3. Call `aiService.generateStructuredData(schema, context, intent)` from your business service.
4. **Never** include business rules (e.g., "save to database") inside the AI module. The AI module only returns validated data; the caller decides what to do with it.

## What NOT to place in this module

- **Business Logic**: Do not mutate database state here. This module is purely functional—it receives inputs and returns validated outputs.
- **Framework-specific API Code**: Do not put Express controllers or middleware here.
- **Speculative Abstractions**: Do not introduce multi-provider routing, retry layers, or complex prompt classes until a concrete requirement demands them.
