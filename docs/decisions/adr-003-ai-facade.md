---
title: "ADR 003: AIService Facade, Provider Abstraction & Zod Output Validation Boundary"
description: "Architecture decision record for LLM vendor decoupling and untrusted output Zod validation."
status: "accepted"
owner: "AI Architecture Team"
last_updated: "2026-07-21"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 19"
related_documents:
  - "docs/architecture/ai-subsystem.md"
  - "docs/ai/prompt-engineering.md"
  - "docs/ai/execution-pipeline.md"
superseded_by: null
review_frequency: "annual"
---

[Docs Wiki Portal](../README.md) > [ADRs](README.md) > ADR 003

# ADR 003: AIService Facade, Provider Abstraction & Zod Output Validation Boundary

## Context & Problem Statement
Integrating LLMs into a domain model creates risks: vendor SDK lock-in, unvalidated responses corrupting database records, prompt injection vulnerabilities, and lack of execution observability.

## Decision Drivers
- Treat LLM output strictly as untrusted external data.
- Decouple domain business logic from specific vendor SDKs (`@anthropic-ai/sdk`).
- Prevent prompt injection attacks from user-authored text.
- Enforce strict JSON output schemas before data touches domain services.

## Considered Options
1. **Option 1:** Direct Anthropic SDK calls inside Express controllers or services.
2. **Option 2:** Heavy multi-provider LangChain abstraction framework.
3. **Option 3:** Lightweight internal `AIService` facade with `AIProvider` contract, PromptRegistry XML delimiters, and Zod response validation.

## Decision Outcome
**Chosen Option: Option 3 (Custom Lightweight AIService Facade)**.

### Rationale
- **Facade & Contract:** Domain code calls `aiService.generateStructuredData()`. Switching vendors requires changing only the `AIProvider` implementation.
- **XML Tag Encapsulation:** PromptBuilder wraps prompt sections in `<system>`, `<context>`, and `<intent>` tags, instructing the model to treat context strictly as data to analyze.
- **Zod Validation Boundary:** Every LLM JSON output is parsed against strict Zod schemas before being returned to calling services. Malformed outputs throw `AIValidationError`.

## Consequences
- **Positive:** Complete vendor decoupling; 100% type-safe and schema-validated AI outputs; robust prompt injection defense.
- **Negative:** Requires defining Zod response schemas and `PromptTemplate` objects for every AI capability.
