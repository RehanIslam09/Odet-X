---
title: "AI Project Manager Architecture"
description: "Canonical high-level architecture overview and landing page for all system architecture deep-dives."
status: "active"
owner: "Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 1"
related_documents:
  - "docs/README.md"
  - "docs/architecture/system-overview.md"
  - "docs/architecture/frontend-architecture.md"
  - "docs/architecture/backend-architecture.md"
  - "docs/architecture/database-design.md"
  - "docs/architecture/ai-subsystem.md"
  - "docs/security/authentication.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](README.md) > Architecture Overview

# AI Project Manager — System Architecture Overview

Welcome to the canonical architecture landing page for **AI Project Manager**. This document outlines the core engineering philosophy, high-level design principles, subsystem boundaries, and serves as the gateway to detailed architectural specifications.

---

## 📋 Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [High-Level System Map](#high-level-system-map)
3. [Subsystem Architecture Deep-Dives](#subsystem-architecture-deep-dives)
4. [Process Boundaries & Server Entry Points](#process-boundaries--server-entry-points)
5. [Key Architectural Highlights](#key-architectural-highlights)
6. [Navigating Architecture Documentation](#navigating-architecture-documentation)

---

## 1. Core Philosophy

The **AI Project Manager** is architected as a production-quality SaaS application designed for long-term maintainability, strict security, and deterministic reliability:

- **Scalability** — The layered architecture handles feature growth without requiring structural refactoring.
- **Maintainability** — Clear single-responsibility boundaries ensure any part of the system is understandable six months later.
- **Security by Default** — Dual-token authentication, SHA-256 refresh hashing, and module-memory token isolation treat security as a first-class concern.
- **Untrusted AI Integration** — The AI layer treats LLM output strictly as untrusted data, validating every response against Zod schemas before database persistence.

---

## 2. High-Level System Map

```mermaid
flowchart TD
    Client[React 19 Frontend SPA] -->|HTTPS REST /api/v1| Axios[Centralized Axios Client]
    Axios -->|Bearer Access Token| Express[Express 5 Backend API]
    
    subgraph Server Boundary
        Express --> Val[Validation Middleware]
        Val --> Auth[Auth Middleware]
        Auth --> Ctrl[Thin Controllers]
        Ctrl --> Svc[Domain Services]
        Svc --> Mongoose[Mongoose ORM]
        Svc --> AI[AIService Facade]
    end

    Mongoose --> DB[(MongoDB 8 Database)]
    Worker[Background Cron Worker] --> DB
    
    AI --> Provider[AnthropicProvider]
    Provider --> SDK[@anthropic-ai/sdk]
    SDK --> Claude[Anthropic Claude API]
```

---

## 3. Subsystem Architecture Deep-Dives

Detailed technical documentation is organized into specialized deep-dive specifications:

| Subsystem | Document | Key Topics Covered |
|---|---|---|
| **System Overview** | [`docs/architecture/system-overview.md`](architecture/system-overview.md) | End-to-end request flow, process boundaries (`app.ts`, `index.ts`, `worker.ts`, `smoke.ts`) |
| **Frontend Architecture** | [`docs/architecture/frontend-architecture.md`](architecture/frontend-architecture.md) | Feature-first organization, 4-tier state management, token isolation, bootstrap flow |
| **Backend Architecture** | [`docs/architecture/backend-architecture.md`](architecture/backend-architecture.md) | Express 5-layer pattern, thin controllers, domain services, global error handling |
| **Database Design** | [`docs/architecture/database-design.md`](architecture/database-design.md) | Mongoose models, indexes, soft-delete (`isDeleted`), archiving, OCC (`__v`) |
| **AI Subsystem** | [`docs/architecture/ai-subsystem.md`](architecture/ai-subsystem.md) | `AIService` facade, `AIProvider` contract, prompt registry, Zod response validation |
| **Security Architecture** | [`docs/security/authentication.md`](security/authentication.md) | Dual-token auth, SHA-256 refresh hashing, rotation, cookie scoping, reuse detection |

---

## 4. Process Boundaries & Server Entry Points

The backend codebase decouples Express module setup from runtime process execution across four entry points:

| Entry Point | Path | Role | DB Connection? | HTTP Listener? |
|---|---|---|:---:|:---:|
| **App Boundary** | `server/src/app.ts` | Configures Express, routes, error handlers & AI prompts | No | No |
| **HTTP Production** | `server/src/index.ts` | Connects to MongoDB & binds Express listener on port 5000 | Yes | Yes |
| **Background Worker** | `server/src/worker.ts` | Runs independent `node-cron` scheduled reminder jobs | Yes | No |
| **Smoke Verification**| `server/src/smoke.ts` | Validates app startup & prompt registry without DB/HTTP | No | No |

---

## 5. Key Architectural Highlights

### A. Token Isolation Security
Access tokens live exclusively in module-level memory inside `client/src/services/axios.ts`. Tokens are **never** stored in `localStorage`, `sessionStorage`, Zustand, or React component state. Refresh tokens are stored exclusively as HTTP-only cookies and hashed with SHA-256 in MongoDB.

### B. Task Notes Optimistic Concurrency Control
Task Notes (Markdown workspace up to 250,000 characters) are protected against concurrent tab edits using Mongoose's `__v` version key. Updates via `PATCH /api/v1/tasks/:id/notes` perform atomic version checks; mismatches yield an explicit `409 Conflict`.

### C. Untrusted AI Pipeline & Prompt Injection Defense
All AI prompt templates encapsulate context in XML tags (`<system>`, `<context>`, `<intent>`) to prevent injection attacks. Responses are parsed and checked against strict Zod schemas before reaching business logic.

---

## 6. Navigating Architecture Documentation

- For API endpoints and response envelopes, see [REST API Reference](api/rest-api-reference.md).
- For coding standards and linter rules, see [Engineering Standards](standards/coding-guidelines.md).
- For local and CI quality gates (`npm run verify`), see [Verification & Testing](operations/verification-and-testing.md).
- For complete chronological phase history (Phases 1–19), see [Project Evolution](history/project-evolution.md).