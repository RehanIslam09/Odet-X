---
title: "AI Feature Specification: Project → Tasks Generation"
description: "Detailed specification for AI-driven project task breakdown, prompt templates, and schema validation."
status: "active"
owner: "AI Feature Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19.5"
current_since: "Phase 19.5"
related_documents:
  - "docs/architecture/ai-subsystem.md"
  - "docs/api/ai-endpoints.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../../README.md) > [AI](../README.md) > Project Task Generation

# AI Feature Specification: Project → Tasks Generation

This document defines the specification for **AI Feature 1: Project → Tasks Generation**.

---

## 📋 Overview
- **Endpoint:** `POST /api/v1/projects/:id/generate-tasks`
- **Model Tier:** `deep-context` (`claude-3-5-sonnet-20240620`)
- **Prompt Name:** `project-to-tasks`
- **Output Schema:** `GenerateTasksResponseSchema`

---

## Behavior & Workflow

1. The user clicks "Generate Tasks" on the Project Detail Workspace page (`/projects/:id`).
2. The domain service (`project-ai.service.ts`) fetches the project's name and description.
3. `AIService` constructs the XML prompt incorporating system guardrails and project description context.
4. The Anthropic API generates a JSON payload containing proposed tasks (title, description, status, priority, estimatedTime).
5. The raw JSON is validated against `GenerateTasksResponseSchema`.
6. Tasks are created through the standard `taskService.createTask()` pipeline, triggering identical side effects (Activity logging, soft-delete defaults, ownership assignment).
