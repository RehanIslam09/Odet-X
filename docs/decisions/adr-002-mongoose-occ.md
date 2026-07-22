---
title: "ADR 002: Task Notes Concurrency Control via Mongoose __v Optimistic Locking"
description: "Architecture decision record for optimistic concurrency control on Task Notes using Mongoose version keys."
status: "accepted"
owner: "Backend Architecture Team"
last_updated: "2026-07-16"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 17.3"
current_since: "Phase 17.3"
related_documents:
  - "docs/architecture/database-design.md"
  - "docs/architecture/backend-architecture.md"
superseded_by: null
review_frequency: "annual"
---

[Docs Wiki Portal](../README.md) > [ADRs](README.md) > ADR 002

# ADR 002: Task Notes Concurrency Control via Mongoose `__v` Optimistic Locking

## Context & Problem Statement
Phase 17 introduced Task Notes — long-form Markdown documents up to 250,000 characters per task. Multiple browser tabs or concurrent users editing the same task notes run the risk of silent last-write-wins data loss.

## Decision Drivers
- Prevent silent data overwrites when editing notes across tabs or sessions.
- Avoid heavy pessimistic database locks or complex CRDT sync engines for V1.
- Provide a clear, actionable `409 Conflict` signal to the client.

## Considered Options
1. **Option 1:** Last-write-wins (unprotected `findOneAndUpdate`).
2. **Option 2:** Pessimistic locking (lock record on edit mode).
3. **Option 3:** Optimistic Concurrency Control (OCC) using Mongoose `__v` version key.

## Decision Outcome
**Chosen Option: Option 3 (OCC via `__v`)**.

### Rationale
- `PATCH /api/v1/tasks/:id/notes` requires an `expectedVersion` parameter.
- The update query combines `_id`, `owner`, and `__v: expectedVersion` in an atomic `Task.findOneAndUpdate` call.
- If another session updated the document in the interim, `__v` changes, causing zero documents to match. The server detects this and returns `409 Conflict`.

## Consequences
- **Positive:** Zero risk of silent overwrites; simple atomic database implementation.
- **Negative:** Client must handle `409 Conflict` gracefully by prompting user to refresh or review diffs.
