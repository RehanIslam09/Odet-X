---
title: "Operations & CI/CD Index"
description: "Directory and index of verification pipelines, testing strategies, application smoke tests, and CI/CD infrastructure."
status: "active"
owner: "DevOps & Infrastructure Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 4"
related_documents:
  - "docs/README.md"
  - "docs/operations/verification-and-testing.md"
  - "docs/operations/ci-cd-infrastructure.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > Operations Index

# Operations, Verification & CI/CD Infrastructure

This directory contains specifications for local quality gates, automated testing, application startup verification, and GitHub Actions CI pipelines for **AI Project Manager**.

---

## 📚 Section Directory

| Document | Primary Focus | Key Commands & Concepts |
|---|---|---|
| [`verification-and-testing.md`](verification-and-testing.md) | Quality Gate & Testing Strategy | `npm run verify`, Vitest 4.1, Node native test runner, `smoke.ts` startup test |
| [`ci-cd-infrastructure.md`](ci-cd-infrastructure.md) | Continuous Integration Setup | `.github/workflows/ci.yml`, Local/CI parity, `mongo:8.0` container, dummy secrets |

---

## 🚀 The Canonical Quality Contract

Both local developer workstations and the GitHub Actions CI pipeline execute the exact same 5-stage quality gate:

```bash
npm run verify
```

```mermaid
flowchart LR
    Lint[npm run lint] --> Typecheck[npm run typecheck] --> Test[npm test] --> Build[npm run build] --> Smoke[npm run smoke]
```
