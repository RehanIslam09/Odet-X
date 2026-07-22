---
title: "AI Module Developer Guide"
description: "Local developer documentation for the server AI module, provider interfaces, prompt registry, and validation boundaries."
status: "active"
owner: "AI Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 19"
related_documents:
  - "docs/architecture/ai-subsystem.md"
  - "docs/ai/prompt-engineering.md"
  - "docs/ai/execution-pipeline.md"
  - "docs/api/ai-endpoints.md"
superseded_by: null
review_frequency: "quarterly"
---

# Server AI Module (`server/src/ai/`)

> [!NOTE]
> **Developer Guide:** This is the local developer guide for `server/src/ai/`. For the authoritative system architecture specification, see [`docs/architecture/ai-subsystem.md`](../../docs/architecture/ai-subsystem.md).

---

## 📋 Table of Contents
1. [Purpose & Responsibilities](#purpose--responsibilities)
2. [Architectural Boundaries](#architectural-boundaries)
3. [How to Integrate Future Features](#how-to-integrate-future-features)
4. [Local Development & Setup](#local-development--setup)
5. [What NOT to place in this module](#what-not-to-place-in-this-module)
6. [Central Documentation Links](#central-documentation-links)

---

## Purpose & Responsibilities

- **Abstraction & Decoupling**: Application business logic never talks directly to an AI provider SDK (e.g., Anthropic or OpenAI). It talks to the `AIService` facade.
- **Validation**: All structured outputs from the LLM are strictly validated through Zod pipelines before they reach the rest of the application.
- **Prompt Infrastructure**: The `src/ai/prompts` directory acts as a lightweight library for defining and assembling prompts from `PromptTemplate` objects and registering them securely.
- **Execution Framework**: The `AIService` orchestrates a strict 7-step lifecycle for every request, producing predictable observability logs, tracking an internal `executionId`, and wrapping responses in an `AIExecutionResult<T>`.

---

## Architectural Boundaries

1. **Application Service**: Coordinates the overall workflow (e.g., retrieving a project, mapping data, saving tasks).
2. **AI Service**: Orchestrates the AI request, manages execution context, and owns all logging.
3. **Prompt Builder**: Formats the prompt using pure functions and structural XML delimiters (`<system>`, `<context>`, `<intent>`).
4. **Prompt Validator**: Enforces schema and integrity checks on Prompt definitions before they run (`validatePromptTemplate`).
5. **Prompt Registry**: A lightweight store organizing prompts by name.
6. **Provider Interface**: A generic contract strictly defining LLM communication capabilities without concerning itself with observability.
7. **Concrete Provider**: Implements the Provider Interface for a specific vendor (e.g., `AnthropicProvider`).
8. **Response Validator**: Enforces Zod schema correctness on LLM responses.

---

## How to Integrate Future Features

When building a new AI feature:
1. Define a `PromptTemplate` incorporating the necessary metadata and static sections (using `GLOBAL_SYSTEM_BEHAVIOR`).
2. Register the template on app startup via `promptRegistry.register()`.
3. In your business service, retrieve the template, clone it to append dynamic user sections (e.g., `context` and `intent`).
4. Call `const { data, metadata } = await aiService.generateStructuredData(clonedTemplate, schema, options)`.
5. Consume `data` for business logic, and optionally use `metadata` for observability.
6. **Never** include business rules (e.g., "save to database") inside the AI module. The AI module only returns validated data.

---

## Local Development & Setup

To enable AI features locally, configure the Anthropic provider:

1. Obtain an API key from your [Anthropic Console](https://console.anthropic.com/).
2. Add the following to your `server/.env` file:
   ```env
   # AI Configuration
   ANTHROPIC_API_KEY=your_api_key_here
   AI_DEFAULT_MODEL=claude-3-haiku-20240307
   AI_REQUEST_TIMEOUT=30000
   ```
3. If `ANTHROPIC_API_KEY` is missing, the application will throw an `AIConfigurationError` when an AI feature is invoked.

---

## What NOT to place in this module

- **Business Logic**: Do not mutate database state here. This module is purely functional—it receives inputs and returns validated outputs.
- **Framework-specific API Code**: Do not put Express controllers or middleware here.
- **Speculative Abstractions**: Do not introduce multi-provider routing, retry layers, or complex prompt classes until a concrete requirement demands them.

---

## Central Documentation Links

For further information in the central engineering wiki:
- [AI Subsystem Architecture](../../docs/architecture/ai-subsystem.md)
- [Prompt Engineering & Injection Defense](../../docs/ai/prompt-engineering.md)
- [AI 7-Step Execution Pipeline](../../docs/ai/execution-pipeline.md)
- [AI Capability Endpoints](../../docs/api/ai-endpoints.md)
