---
title: "Engineering Standards Index"
description: "Directory and index of coding guidelines, linter standards, and conventions enforced across the codebase."
status: "active"
owner: "Architecture Standards Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 1"
related_documents:
  - "docs/README.md"
  - "docs/standards/coding-guidelines.md"
  - "docs/operations/verification-and-testing.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > Standards Index

# Engineering Standards & Conventions

This directory contains authoritative specifications for coding standards, TypeScript conventions, error causality rules, and linter enforcement across **AI Project Manager**.

---

## 📚 Section Directory

| Document | Primary Focus | Key Rules Enforced |
|---|---|---|
| [`coding-guidelines.md`](coding-guidelines.md) | Engineering Standards & Coding Guidelines | Zero guesses, strict return types, `_arg` unused parameters, optional catch binding, error cause preservation `{ cause }`, side-effect safety |

---

## 📐 Core Engineering Principles

1. **Zero Guesses:** Inspect authoritative source code before invoking methods or data structures.
2. **Layered Responsibility:** Keep controllers thin, put business rules in services, restrict database calls to Mongoose models.
3. **Preserve Side Effects:** When refactoring to clean up unused variables, never delete function calls that perform mutations or database seeds.
4. **Canonical Quality Gate:** All code contributions must pass `npm run verify` without disabling or weakening tests.
