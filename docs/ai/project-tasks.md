# Project → Tasks AI Feature

This document explains the architecture and flow of the first concrete AI product feature: generating structured tasks from a project description.

## Feature Overview

A user can supply a natural language description of their project, and the AI platform will break this down into a sequence of actionable, prioritized, and estimated tasks.

## Request Lifecycle

1. **Client Request**: The client sends a `POST /api/v1/projects/:id/generate-tasks` containing a `description`.
2. **HTTP Controller (`project.controller.ts`)**: The router verifies authentication and uses Zod to validate the request payload (`generateProjectTasksSchema`). The controller passes the request to `ProjectAIService`.
3. **Business Layer (`project-ai.service.ts`)**: 
   - Validates that the project exists and belongs to the user.
   - Loads existing tasks for the project to prevent duplicate generations.
   - Clones the registered `project-to-tasks` prompt and appends the dynamic context (project metadata, existing task titles) and the user's unstructured request.
4. **AI Layer (`ai.service.ts`)**:
   - Compiles the final prompt.
   - Queries the Anthropic model (using the `deep-context` model tier).
   - Validates the resulting JSON string strictly against `GenerateTasksResponseSchema`.
   - Generates structured logs and execution metadata.
5. **Business Validation**: 
   - The returned `GenerateTasksResponse` is checked in the `ProjectAIService`.
   - Empty tasks or tasks with duplicate titles are filtered out.
   - If no valid tasks remain, a `BadRequestError` is thrown.
6. **Persistence**:
   - The `ProjectAIService` iteratively delegates persistence to `taskService.createTask()`.
   - The `task.service.ts` inherently creates the corresponding `Task Created` activity logs for each new task.
7. **Return**: The controller returns the newly minted list of persisted tasks to the user.

## Architectural Boundaries

This flow maintains strict architectural boundaries:
- **No DB coupling in AI**: The `aiService` only returns plain JS objects validated by Zod. It has no concept of MongoDB, Mongoose, or repositories.
- **No HTTP coupling in AI**: All HTTP parsing and responding remain strictly in the controller.
- **Persistence Encapsulation**: The AI business orchestration (`ProjectAIService`) uses the same `taskService.createTask` method that manual UI creation uses. This guarantees all side effects (e.g., Activity logging) are identical between human-created tasks and AI-created tasks.

## Schemas & Prompts

- **Prompt Blueprint**: `src/ai/prompts/definitions/project-tasks.prompt.ts`. Explicitly forbids markdown, forces valid JSON, and prevents conversational filler.
- **Zod Schema**: `src/ai/schemas/project-tasks.schema.ts`. Enforces fields like title length, valid enum values for priority, and requires at least one task to be returned.
