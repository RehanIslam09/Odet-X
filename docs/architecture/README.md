---
title: "System Architecture Index"
description: "Index and directory of living system architecture specifications for AI Project Manager."
status: "active"
owner: "Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 1"
related_documents:
  - "docs/architecture.md"
  - "docs/README.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > Architecture Index

# Living System Architecture Specifications

This directory contains authoritative, living technical specifications for the **AI Project Manager** system architecture. Each document describes *how the system works today*.

---

## 📚 Section Directory

| Document | Primary Focus | Key Architectural Patterns |
|---|---|---|
| [`system-overview.md`](system-overview.md) | Request Lifecycle & Process Boundaries | 5-layer request flow, Express setup vs HTTP listener, worker process, smoke test |
| [`frontend-architecture.md`](frontend-architecture.md) | Client Architecture & State | React 19, feature-first structure, 4-tier state management, token isolation, bootstrap |
| [`backend-architecture.md`](backend-architecture.md) | Express Server & Layered Patterns | Express 5, thin controllers, domain services, global error handling (`AppError`) |
| [`database-design.md`](database-design.md) | Persistence & Data Mechanics | Mongoose models, indexing strategies, soft-delete (`isDeleted`), archiving, OCC (`__v`) |
| [`ai-subsystem.md`](ai-subsystem.md) | AI Facade & Execution Framework | `AIService` facade, `AIProvider` contract, Zod schema validation, XML tag injection defense |

---

## 🏛️ Architecture Governance Rules

1. **Living Specifications:** Documents in this folder describe active system behavior. Update them whenever code changes modify architectural behavior.
2. **No Temporal Drift:** Do not include point-in-time phase logs here. Historical logs belong in [`docs/history/`](../history/README.md).
3. **Single Source of Truth:** Code symbols, file paths, and method signatures must match the current codebase exactly.
