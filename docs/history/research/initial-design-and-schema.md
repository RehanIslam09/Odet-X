---
title: "Initial Product Vision & Schema Architecture Specification (Pre-Implementation Draft)"
description: "Immutable historical specification capturing the initial pre-implementation product vision, design principles, and early domain models."
status: "archived"
owner: "Product Architecture Team"
last_updated: "2026-07-01"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 1"
current_since: "Phase 1"
related_documents:
  - "docs/product/domain-model.md"
  - "docs/architecture/database-design.md"
superseded_by: "docs/product/domain-model.md"
review_frequency: "annual"
---

[Docs Wiki Portal](../../README.md) > [History](../README.md) > Initial Design & Schema Spec

# Initial Product Vision & Schema Architecture Specification (Pre-Implementation Draft)

> **Document Type:** Historical Pre-Implementation Specification  
> **Status:** Archived Draft (Living product specs moved to [`docs/product/domain-model.md`](../../product/domain-model.md))

---

## 1. Product Vision

### The Coordination Tax
Every project management tool sells "organize your work." Teams already know what they need to do — the pain is the **coordination tax**: constant manual bookkeeping required to keep a shared picture of reality up to date (writing tickets, breaking epics, updating statuses, writing standups).

**AI Project Manager's actual job**: absorb the coordination tax. The software maintains an accurate, current, honest picture of the project with as little manual human bookkeeping as possible, surfacing only decisions that require a human.

---

## 2. Core Philosophy & Design Principles

1. **Effort test** — Reduce total human effort across the team.
2. **Zero-setup test** — Delivers value with default configuration.
3. **Reversibility test** — Any AI-initiated change must be visibly undoable.
4. **Single-truth test** — No secondary parallel sources of truth.
5. **"What do I do next" test** — Makes the next required human decision obvious.
6. **Fallback test** — Manual data entry is always possible, but never required.
7. **Actionable notification test** — Notifications that don't invite a decision belong in a digest.
8. **One-sentence test** — Value can be explained in one sentence to a non-technical user.
9. **Progressive disclosure test** — Layer complexity, never flatten it.
10. **Show-your-work test** — Every AI suggestion must be traceable to input signals.
