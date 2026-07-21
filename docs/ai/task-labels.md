# Task → Auto Labeling AI Feature

This document explains the architecture and flow of the AI capability for generating context-aware labels for tasks.

## Feature Overview

A user can request the AI to generate relevant labels for an existing task. The AI analyzes the task title, description, and the surrounding project context to infer appropriate classification labels (e.g., domain, technology, priority logic).

## Request Lifecycle

1. **Client Request**: The client sends a `POST /api/v1/tasks/:id/generate-labels`.
2. **HTTP Controller (`task.controller.ts`)**: The router verifies authentication and invokes `generateLabels` in the controller. The controller delegates directly to the `TaskAIService`.
3. **Business Layer (`task-ai.service.ts`)**: 
   - Asserts the user owns the task.
   - Loads the parent project context if available.
   - Loads existing labels to ensure the AI has full visibility into what has already been classified.
   - Clones the registered `task-auto-label` prompt and injects dynamic context.
4. **AI Layer (`ai.service.ts`)**:
   - Queries the Anthropic model.
   - Validates the JSON strict response against `GeneratedLabelsSchema` using Zod.
   - Schema mandates 1 to 5 labels, string limits, and specific JSON array layout.
5. **Business Validation & Normalization**: 
   - Normalization: Trims whitespace, collapses inner duplicate spaces, and converts labels to lowercase.
   - Deduplication: Filters out labels that the AI returned as duplicates, or labels that semantically match the task's existing labels.
   - Limit enforcement: The domain strictly bounds total task labels to a maximum of 10. Existing labels are preserved first, and new validated labels are appended until the cap is hit.
6. **Persistence**:
   - The `TaskAIService` delegates persistence to `taskService.updateTask({ labels: finalLabels })`.
   - This explicitly triggers the standard update pipeline, guaranteeing activity log generation (`TASK_UPDATED`).
7. **Return**: The controller returns the mutated `Task` document.

## Architectural Boundaries

This flow rigorously respects the clean architecture of the AI Foundation:
- **TaskAIService acts as the absolute orchestrator**, encapsulating the boundary between domain concepts (Tasks, limits, labels) and AI models.
- **AI Service remains perfectly persistence-blind**, having no knowledge of `MongoDB` limits, truncation, or task saving. It strictly guarantees the structure of the JSON blob.
- **TaskService handles storage**, running pre-save hooks and activity event dispatching accurately.

## Schemas & Prompts

- **Prompt Blueprint**: `src/ai/prompts/definitions/task-labels.prompt.ts`. Emphasizes brevity and explicitly rejects synonyms.
- **Zod Schema**: `src/ai/schemas/task-labels.schema.ts`. Restricts the AI payload structurally before business rules take over.
