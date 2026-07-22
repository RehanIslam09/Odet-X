---
title: "Architecture Decision Records (ADRs) Index"
description: "Directory and index of formal Architecture Decision Records for key architectural choices."
status: "active"
owner: "Architecture Board"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 1"
related_documents:
  - "docs/README.md"
  - "docs/architecture.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > ADR Index

# Architecture Decision Records (ADRs)

This directory contains formal Architecture Decision Records (ADRs) capturing key technical decisions, context, trade-offs evaluated, and consequences.

---

## 📚 ADR Index

| ADR ID | Title | Status | Date | Primary Focus |
|---|---|:---:|---|---|
| [`ADR-001`](adr-001-dual-token-auth.md) | Dual-Token Authentication with In-Memory Access Tokens & SHA-256 Refresh Hashing | Accepted | 2026-07-05 | XSS mitigation & session security |
| [`ADR-002`](adr-002-mongoose-occ.md) | Task Notes Concurrency Control via Mongoose `__v` Optimistic Locking | Accepted | 2026-07-16 | Concurrency control for large Markdown documents |
| [`ADR-003`](adr-003-ai-facade.md) | AIService Facade, Provider Abstraction & Zod Output Validation Boundary | Accepted | 2026-07-21 | Untrusted LLM output validation & vendor decoupling |
