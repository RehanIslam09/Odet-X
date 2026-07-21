# Project → Summarization AI Feature

This document explains the architecture and data flow of the AI capability for generating intelligent, context-aware project summaries based on active tasks and project metadata.

## Feature Overview

A user can request the AI to generate a comprehensive summary of an existing project. The AI analyzes the project description and its active tasks to infer the current status, highlight key achievements, and explicitly flag potential risks.

## Request Lifecycle

1. **Client Request**: The client issues a `POST /api/v1/projects/:id/generate-summary` request.
2. **HTTP Controller (`project.controller.ts`)**: The router verifies authentication and invokes `generateSummary`. The controller delegates completely to the `ProjectSummaryAIService`.
3. **Business Orchestrator (`project-summary-ai.service.ts`)**:
   - Asserts ownership and loads the project.
   - Loads all *active* (non-archived, non-deleted) tasks for the project.
   - **Context Transformation**: Maps raw Mongoose database entities into a strict, lightweight contextual object. Internal metadata (timestamps, MongoDB `_id` fields) are deliberately stripped to minimize token payload sizes and reduce hallucination vectors.
   - Clones the registered `project-summary` prompt and dynamically injects the optimized context.
4. **AI Layer (`ai.service.ts`)**:
   - Transmits the payload to the Anthropic provider.
   - Strictly validates the raw JSON response against `GeneratedProjectSummarySchema` using Zod, ensuring bounds (like minimum 10 char summary, max 5 highlights).
5. **Business Validation & Normalization**:
   - Trims and verifies the summary text length.
   - Normalizes highlights and risks (trims whitespace, collapses internal spaces).
   - Deduplicates highlights and risks.
   - Truncates risk/highlight lengths securely to prevent abuse, strictly enforcing the 5-item maximum limit.
6. **Persistence**:
   - Delegates back to `projectService.updateProject({ aiSummary: finalSummary })`.
   - Replaces any existing AI summary with the newly verified payload, properly capturing an `ACTIVITY_UPDATED` ledger event.
7. **Return**: The controller resolves the mutated `Project` document.

## Architectural Boundaries

This flow respects our strict AI boundaries:
- **ProjectSummaryAIService acts as the absolute orchestrator**, translating between domain entity requirements and AI inference capabilities.
- **AI Service remains perfectly persistence-blind**, having no knowledge of MongoDB, update methods, or entity limits.
- **ProjectService handles storage**, executing Mongoose hooks securely.

## Schemas & Prompts

- **Prompt Blueprint**: `src/ai/prompts/definitions/project-summary.prompt.ts`. Explicitly warns against hallucinating deadlines, percentages, or speculative project health statuses.
- **Zod Schema**: `src/ai/schemas/project-summary.schema.ts`. Restricts the JSON footprint strictly before business validation runs.
