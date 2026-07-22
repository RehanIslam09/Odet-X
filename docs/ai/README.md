---
title: "AI Subsystem Deep-Dives Index"
description: "Directory and index of prompt engineering guidelines, execution pipelines, competitive research, and feature specifications."
status: "active"
owner: "AI Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 19"
related_documents:
  - "docs/README.md"
  - "docs/architecture/ai-subsystem.md"
  - "docs/api/ai-endpoints.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > AI Index

# AI Subsystem Specifications & Feature Deep-Dives

This directory contains specifications, prompt engineering guidelines, execution pipelines, and feature-specific documentation for the **AI Subsystem**.

---

## 📚 Section Directory

### Architecture & Framework
- [`prompt-engineering.md`](prompt-engineering.md) — Prompt Template structure, XML delimiter strategy (`<system>`, `<context>`, `<intent>`), and injection defense.
- [`execution-pipeline.md`](execution-pipeline.md) — The 7-step request lifecycle executed by `AIService`.
- [`research-synthesis.md`](research-synthesis.md) — Industry research and competitive analysis synthesis (Linear, Notion AI, Cursor, Copilot Workspace).

### Implemented AI Features (`features/`)
- [`features/project-task-generation.md`](features/project-task-generation.md) — AI Feature 1: Project → Tasks generation specification.
- [`features/task-auto-labeling.md`](features/task-auto-labeling.md) — AI Feature 2: Task auto-labeling specification.
- [`features/project-summary-generation.md`](features/project-summary-generation.md) — AI Feature 3: Project summary & risk extraction specification.
