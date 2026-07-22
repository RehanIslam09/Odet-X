---
title: "AI Feature Specification: Task Auto-Labeling"
description: "Detailed specification for AI-driven task auto-labeling, prompt templates, and label array normalization."
status: "active"
owner: "AI Feature Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19.6"
current_since: "Phase 19.6"
related_documents:
  - "docs/architecture/ai-subsystem.md"
  - "docs/api/ai-endpoints.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../../README.md) > [AI](../README.md) > Task Auto-Labeling

# AI Feature Specification: Task Auto-Labeling

This document defines the specification for **AI Feature 2: Task Auto-Labeling**.

---

## 📋 Overview
- **Endpoint:** `POST /api/v1/tasks/:id/generate-labels`
- **Model Tier:** `fast-json` (`claude-3-haiku-20240307`)
- **Prompt Name:** `task-auto-label`
- **Output Schema:** `GeneratedLabelsSchema`

---

## Behavior & Rules

1. The user triggers label generation from the Task Detail Workspace or drawer.
2. `task-ai.service.ts` fetches task title, description, and project context.
3. `AIService` executes `taskAutoLabelPrompt` using the `fast-json` model tier.
4. Output labels are normalized (trimmed, deduplicated, converted to lowercase).
5. New labels are appended to existing task labels up to the domain cap of 10 labels per task.
