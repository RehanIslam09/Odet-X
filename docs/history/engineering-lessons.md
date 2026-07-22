---
title: "Engineering Hardening Principles & Lessons Learned"
description: "15 engineering hardening principles and incident post-mortems learned during Phases 1 through 19."
status: "archived"
owner: "Architecture Board"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 1"
related_documents:
  - "docs/standards/coding-guidelines.md"
  - "docs/history/project-evolution.md"
superseded_by: null
review_frequency: "annual"
---

[Docs Wiki Portal](../README.md) > [History](README.md) > Engineering Lessons

# Engineering Hardening Principles & Lessons Learned

This document records the 15 core engineering hardening principles derived from real incidents, bug fixes, and architectural iterations across Phases 1 through 19 of the **AI Project Manager** repository.

---

## 📋 Table of Contents
1. [Core Principles Summary](#core-principles-summary)
2. [15 Hardening Lessons Learned](#15-hardening-lessons-learned)

---

## Core Principles Summary

1. **Compile-time correctness is not runtime correctness.** `tsc` passing proves types line up, not that the app boots — which is why smoke verification exists as its own stage.
2. **CI should execute the exact same contract developers run locally.** Divergent scripts cause "works on my machine" failures in `main`.
3. **AI output is untrusted input.** Every LLM response is Zod-validated before any domain service is allowed to touch it.
4. **Concurrent writes require explicit conflict handling.** Task Notes resolves version mismatches with an explicit `409 Conflict`.
5. **Background jobs require idempotency.** The notification worker's `dedupeKey` guarantees duplicate-free reminders.

---

## 15 Hardening Lessons Learned

### 1. Compile-Time vs Runtime Bootstrap Safety
*Incident:* An AI prompt template that violated `PromptRegistry`'s structural contract passed `tsc` and unit tests, then crashed the server on boot.  
*Lesson:* Introduce offline startup smoke verification (`server/src/smoke.ts`) into the canonical verification pipeline.

### 2. Local / CI Parity
*Incident:* Client build failed in CI because `VITE_API_URL` was missing from the workflow step environment block.  
*Lesson:* CI must execute the exact same command (`npm run verify`) with identical environment variables.

### 3. Preserving Side Effects During Refactoring
*Incident:* Unused variable removal deleted a `createTask()` call that performed necessary DB seeds.  
*Lesson:* When removing unused variable bindings, preserve the statement call (`await createTask(...)`).

### 4. Error Causality Chain
*Incident:* Low-level provider errors re-thrown as generic errors lost root-cause stack traces.  
*Lesson:* Re-thrown errors MUST use ES2021 error cause chaining: `{ cause: error }`.

### 5. Explicit `_arg` Unused Parameters
*Incident:* Linters flagged Express middleware `(req, res, next)` signatures when parameters were unread.  
*Lesson:* Prefix unread framework parameters with underscores (`_req`, `_next`).

### 6. Optional Catch Binding
*Incident:* Code contained dummy catch parameters `catch (_e)` purely to satisfy linters.  
*Lesson:* Use ES2019 optional catch binding (`catch { ... }`) when error instances are unread.

### 7. Thin Controllers
*Incident:* Validation and ownership rules crept into controller handlers.  
*Lesson:* Controllers handle HTTP adapter logic only; services own domain logic and DB calls.

### 8. Token Storage Isolation
*Incident:* Access tokens accidentally written to localStorage expose session hijacking vectors.  
*Lesson:* Access tokens live strictly in module-level memory (`services/axios.ts`).

### 9. Optimistic Concurrency Control
*Incident:* Concurrent tab edits on long Markdown notes caused silent last-write-wins overwrites.  
*Lesson:* Enforce version checking (`__v`) on large documents, returning `409 Conflict` on mismatch.

### 10. Background Worker Idempotency
*Incident:* Cron worker re-evaluation caused duplicate reminder notifications.  
*Lesson:* Enforce unique sparse MongoDB indexes on deterministic `dedupeKey` strings.

### 11. Async Best-Effort Audit Logging
*Incident:* Activity log database error aborted primary user transaction.  
*Lesson:* Activity logging must execute asynchronously in best-effort mode.

### 12. Structural XML Delimiters for Prompts
*Incident:* User text containing prompt commands attempted to override AI guardrails.  
*Lesson:* Encapsulate dynamic context in XML tags (`<system>`, `<context>`, `<intent>`).

### 13. Zod Response Schema Boundary
*Incident:* LLM returning unstructured text broke frontend components expecting JSON arrays.  
*Lesson:* Parse all LLM outputs through Zod schemas before returning data to services.

### 14. Preserving Parent Component Layout Contracts
*Incident:* Refactoring PageHeader into a sub-component added flex-shrink properties that collapsed title layouts.  
*Lesson:* Sub-components must inherit and preserve parent flex/grid layout constraints.

### 15. Visible Technical Debt Tracking
*Incident:* Inline `@ts-ignore` comments hid blocking type errors.  
*Lesson:* Track accepted technical debt as linter warnings (`no-explicit-any`), keeping compilation clean.
