---
title: "AI Subsystem Architecture & Validation Framework"
description: "Authoritative specification for the AIService facade, provider abstractions, Zod response validation, and model tiering."
status: "active"
owner: "AI Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 19"
related_documents:
  - "docs/architecture.md"
  - "docs/ai/prompt-engineering.md"
  - "docs/ai/execution-pipeline.md"
  - "docs/api/ai-endpoints.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > [Architecture](README.md) > AI Subsystem Architecture

# AI Subsystem Architecture & Validation Framework

This document defines the architecture of the **AI Subsystem** (`server/src/ai/`), covering the provider-agnostic facade, LLM provider integration, prompt registry, Zod response validation, and model tiering strategy.

---

## 📋 Table of Contents
1. [Core Principles](#1-core-principles)
2. [Subsystem Component Boundaries](#2-subsystem-component-boundaries)
3. [Provider Abstraction & Vendor Decoupling](#3-provider-abstraction--vendor-decoupling)
4. [Structured JSON Output & Zod Validation](#4-structured-json-output--zod-validation)
5. [Abstract Model Tiers](#5-abstract-model-tiers)
6. [Error Taxonomy](#6-error-taxonomy)

---

## 1. Core Principles

- **Untrusted Input Constraint**: LLM output is treated strictly as untrusted external data. No model response is allowed near domain business logic or database persistence without passing Zod schema validation.
- **Provider Decoupling**: Domain services talk exclusively to `AIService`. Vendor SDKs (`@anthropic-ai/sdk`) are encapsulated behind the `AIProvider` contract.
- **Single-Flight & Observability**: Every execution receives a unique `executionId`. Observability logs duration, prompt template name/version, and model tier without logging raw secrets or user data.

---

## 2. Subsystem Component Boundaries

```mermaid
flowchart TD
    Domain[Domain Service e.g. project-ai.service.ts] -->|generateStructuredData| Facade[AIService Facade]
    
    subgraph AI Subsystem Boundary
        Facade -->|1. Fetch Template| Registry[PromptRegistry]
        Facade -->|2. Validate Structure| Validator[PromptValidator]
        Facade -->|3. Assemble XML| Builder[PromptBuilder]
        Facade -->|4. Dispatch Request| Contract[AIProvider Interface]
        Contract --> Provider[AnthropicProvider]
        Provider --> SDK[@anthropic-ai/sdk]
        SDK --> API[Anthropic API]
        API --> RawJSON[Raw JSON String]
        RawJSON --> ZodVal[Zod Response Schema Validator]
    end

    ZodVal -->|5. Return Typed DTO| Domain
```

---

## 3. Provider Abstraction & Vendor Decoupling

Domain services never import vendor SDKs. The `AIProvider` interface defines the generic LLM execution contract:

```typescript
export interface AIProvider {
  name: string;
  generateStructured<T>(
    prompt: CompiledPrompt,
    schema: z.ZodSchema<T>,
    options: AIExecutionOptions
  ): Promise<T>;
}
```

The concrete `AnthropicProvider` handles Anthropic SDK calls, timeout cancellations (`AbortController`), rate-limit retries, and maps vendor exceptions into internal error types.

---

## 4. Structured JSON Output & Zod Validation

All AI prompts mandate raw JSON responses matching pre-defined schemas:

- `GenerateTasksResponseSchema`: Validates AI-generated project task arrays.
- `GeneratedLabelsSchema`: Validates auto-label arrays (max 10 labels).
- `GeneratedProjectSummarySchema`: Validates status summary strings, highlights arrays, and risk factor arrays.

If an LLM response fails Zod parsing, an `AIValidationError` is thrown with exact validation field paths, preventing corrupt data from entering MongoDB.

---

## 5. Abstract Model Tiers

Call sites specify abstract model tiers rather than hardcoded vendor model strings:

| Tier Name | Mapped Anthropic Model | Primary Use Cases |
|---|---|---|
| `fast-json` | `claude-3-haiku-20240307` | Task auto-labeling, short extractions, low-latency JSON |
| `deep-context` | `claude-3-5-sonnet-20240620` | Project-to-tasks decomposition, complex status summaries |

Centralizing model resolution in `server/src/ai/config/ai.config.ts` allows updating models across the entire application by modifying a single configuration file.

---

## 6. Error Taxonomy

All AI module errors inherit from `AIBaseError`:

- `AIConfigurationError`: Thrown when required environment variables (e.g. `ANTHROPIC_API_KEY`) are missing or invalid.
- `AIProviderError`: Thrown when the vendor API returns HTTP error status codes or network rejections.
- `AITimeoutError`: Thrown when a request exceeds the configured timeout threshold (default 30,000ms).
- `AIValidationError`: Thrown when LLM output fails Zod schema validation.
