---
title: "AI Feature Specification: Project Summary Generation"
description: "Detailed specification for AI-driven project status summaries, highlights, and risk extraction."
status: "active"
owner: "AI Feature Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19.7"
current_since: "Phase 19.7"
related_documents:
  - "docs/architecture/ai-subsystem.md"
  - "docs/api/ai-endpoints.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../../README.md) > [AI](../README.md) > Project Summary Generation

# AI Feature Specification: Project Summary Generation

This document defines the specification for **AI Feature 3: Project Summary Generation**.

---

## 📋 Overview
- **Endpoint:** `POST /api/v1/projects/:id/generate-summary`
- **Model Tier:** `deep-context` (`claude-3-5-sonnet-20240620`)
- **Prompt Name:** `project-summary`
- **Output Schema:** `GeneratedProjectSummarySchema`

---

## Behavior & Output Envelope

1. The service queries all active tasks (where `isDeleted: false` and `archived: false`) associated with the project.
2. `AIService` passes task statuses, priorities, and descriptions to `projectSummaryPrompt`.
3. The LLM extracts a high-level progress summary, a list of completed highlights, and flagged risk factors.
4. The output is stored on `Project.aiSummary` object with a `generatedAt` timestamp.
