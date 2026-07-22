---
title: "Current Project State (Living Technical Baseline)"
description: "Authoritative living technical baseline capturing the verified codebase state post-Phase 19."
status: "active"
owner: "Lead Architect"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 19"
related_documents:
  - "docs/README.md"
  - "docs/architecture.md"
  - "docs/roadmap/README.md"
superseded_by: null
review_frequency: "per-phase"
---

[Docs Wiki Portal](README.md) > Current Project State

# AI Project Manager — Current Project State (Pre-Phase 20)

> [!IMPORTANT]
> **Living Technical Baseline:** This document captures the verified technical state of the **AI Project Manager** codebase immediately following the completion of Phase 19 Engineering Hardening. It is updated at the conclusion of every engineering phase to serve as the primary baseline for future development.

---

## 📋 Table of Contents
1. [Executive Summary & Verification Health](#1-executive-summary--verification-health)
2. [Technology Stack & Dependencies](#2-technology-stack--dependencies)
3. [Monorepo & Directory Structure](#3-monorepo--directory-structure)
4. [Complete Implemented Feature Set](#4-complete-implemented-feature-set)
5. [Development Commands & Verification Pipeline](#5-development-commands--verification-pipeline)
6. [Known Technical Debt & Intentional Warnings](#6-known-technical-debt--intentional-warnings)
7. [Readiness for Phase 20](#7-readiness-for-phase-20)

---

## 1. Executive Summary & Verification Health

The application is in a fully verified, production-hardened state. The canonical root quality gate (`npm run verify`) executes 5 sequential stages and passes 100%:

- **Client Lint**: PASS (ESLint 9 Flat Config)
- **Server Lint**: PASS (0 errors, 88 accepted `@typescript-eslint/no-explicit-any` warnings)
- **Client Typecheck**: PASS (`tsc -b`)
- **Server Typecheck**: PASS (`tsc --noEmit`)
- **Client Tests**: PASS (26/26 Vitest unit/integration tests)
- **Server Tests**: PASS (13/13 test suite files, 100+ assertions via Node test runner)
- **Client Build**: PASS (Vite production bundle)
- **Server Build**: PASS (TypeScript compilation to `dist/`)
- **Smoke Verification**: PASS (`server/src/smoke.ts` application startup test)

---

## 2. Technology Stack & Dependencies

### Frontend Architecture (`client/`)
- **Framework**: React 19 + React Compiler (Vite 6 build tool)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS v4 + shadcn/ui primitive design tokens
- **Routing**: React Router v7 (nested layouts, ProtectedRoute, PublicRoute)
- **Server State**: TanStack Query v5 (caching, invalidation, retry policies)
- **Client State**: Zustand 5 (UI state: `user`, `isAuthenticated`, `isBootstrapping`)
- **Form Handling**: React Hook Form + Zod v4 schema validation
- **Animations**: Framer Motion
- **HTTP Client**: Axios (centralized client with in-memory access token storage & 401 refresh lock)

### Backend Architecture (`server/`)
- **Runtime**: Node.js 20 (NVM managed)
- **Framework**: Express 5 (TypeScript 5.9)
- **Database**: MongoDB 8 + Mongoose 9 ORM
- **Security**: JWT (access/refresh), bcrypt (password hashing), SHA-256 (refresh token hashing), HTTP-only cookies
- **Background Processing**: Node-cron independent worker process (`worker.ts`)
- **AI Integration**: `@anthropic-ai/sdk` v0.24, Anthropic Claude 3.5 Sonnet / Claude 3 Haiku models

---

## 3. Monorepo & Directory Structure

```
ai-project-manager/
├── client/                     # React 19 / Vite Frontend SPA
│   ├── src/
│   │   ├── app/                # App bootstrap (router, providers, QueryClient)
│   │   ├── components/         # Shared UI (shadcn primitives, layout shells)
│   │   ├── features/           # Feature modules (auth, projects, tasks, dashboard, activity, notifications, settings)
│   │   ├── routes/             # ProtectedRoute & PublicRoute guards
│   │   ├── services/           # Axios HTTP client & token manager (axios.ts)
│   │   ├── store/              # Zustand auth store (auth.store.ts)
│   │   └── utils/              # API error formatters & helper functions
│   ├── package.json            # Client dependencies & scripts
│   └── vite.config.ts          # Vite build configuration
│
├── server/                     # Express / TypeScript Backend API
│   ├── src/
│   │   ├── ai/                 # AI Subsystem (AIService, AnthropicProvider, PromptRegistry, prompts, schemas)
│   │   ├── config/             # Database connection & environment validation (env.ts, database.ts)
│   │   ├── constants/          # Auth, activity, and notification constants
│   │   ├── controllers/        # Thin HTTP request adapters
│   │   ├── jobs/               # Scheduled reminder jobs (notification.jobs.ts)
│   │   ├── middleware/         # Auth verification, Zod validation, error handler
│   │   ├── models/             # Mongoose schemas (User, Project, Task, Activity, Notification)
│   │   ├── routes/             # Express API route modules
│   │   ├── services/           # Core domain business logic
│   │   ├── tests/              # Server integration test suite (13 runner files)
│   │   ├── validators/         # Zod input validation DTO schemas
│   │   ├── app.ts              # Express application setup & module bootstrap
│   │   ├── index.ts            # Production HTTP server entry point
│   │   ├── smoke.ts            # Application startup smoke test script
│   │   └── worker.ts           # Background cron worker entry point
│   ├── eslint.config.js        # Server Flat Config (ESLint 10)
│   ├── package.json            # Server dependencies & scripts
│   └── tsconfig.json           # Server TypeScript configuration
│
├── docs/                       # Comprehensive documentation corpus & engineering wiki
├── .github/workflows/ci.yml    # GitHub Actions CI workflow
├── package.json                # Root package orchestrator
└── README.md                   # Repository public README
```

---

## 4. Complete Implemented Feature Set

1. **Authentication & Security System**:
   - Dual token strategy (15-min in-memory access token + 7-day HTTP-only refresh cookie).
   - SHA-256 refresh token database hashing.
   - Transparent 401 response interceptor with refresh lock in Axios.
   - Automatic token rotation & session invalidation on reuse detection.
   - Account settings: Profile editing, preferences (theme, locale, notifications), password updates.

2. **Project Management Domain**:
   - Project CRUD, soft-delete (`isDeleted: true`), archiving (`archived: true`).
   - Project dashboard grid view, search, filter, pagination.
   - Project Detail Workspace (`/projects/:id`) with task overview metrics.

3. **Task Management Domain & Workspace**:
   - Task CRUD with status (`todo`, `in_progress`, `done`, `cancelled`), priority (`low`, `medium`, `high`, `urgent`), due dates, estimates, and labels (max 10).
   - Task Detail workspace drawer with quick status/priority workflows.

4. **Task Notes & Optimistic Concurrency Control**:
   - Dedicated `/tasks/:taskId/notes` Markdown workspace (Write & Preview modes).
   - 1000ms debounced autosave (`useTaskNotesAutosave`).
   - Atomic optimistic locking using Mongoose version key (`__v`). Concurrent edits return `409 Conflict`.
   - Route leave navigation blocking (`useBlocker`) and browser `beforeunload` warning.

5. **Dashboard Analytics**:
   - Aggregated metrics endpoint (`GET /api/v1/dashboard/overview`).
   - Productivity overview grid, recent project progress bars, attention task alerts.

6. **Activity & Audit Subsystem**:
   - Append-only `Activity` ledger recording user/system events.
   - Best-effort async logging (failures never abort business transactions).
   - Cursor-paginated feed (`GET /api/v1/activities`).

7. **Notification System & Background Worker**:
   - `Notification` model with tenant isolation and BOLA protections.
   - Bell popover UI in navbar + `/notifications` center page with filters (`All`, `Unread`, `Read`).
   - Independent background worker process (`worker.ts`) evaluating `task.due_soon` and `task.overdue` reminders using a sparse `dedupeKey` MongoDB index.

8. **AI Subsystem Foundation & Capabilities**:
   - `AIService` orchestration facade + `AnthropicProvider` abstraction.
   - `PromptRegistry` & structural `PromptValidator` enforcing XML section boundaries (`<system>`, `<context>`, `<intent>`).
   - Strict LLM output validation against Zod schemas.
   - **Feature 1**: Project → Tasks generation (`POST /api/v1/projects/:id/generate-tasks`).
   - **Feature 2**: Task Auto-Labeling (`POST /api/v1/tasks/:id/generate-labels`).
   - **Feature 3**: Project Summary generation (`POST /api/v1/projects/:id/generate-summary`).

---

## 5. Development Commands & Verification Pipeline

```bash
# Development Process Commands (from Root)
npm run dev           # Starts server dev API, client Vite dev server, and worker process concurrently
npm run dev:client    # Starts client Vite dev server only
npm run dev:server    # Starts server Express API only
npm run dev:worker    # Starts server background cron worker only

# Individual Quality Gate Commands
npm run lint          # Runs client ESLint and server ESLint
npm run typecheck     # Runs client tsc -b and server tsc --noEmit
npm test              # Runs client Vitest suite and server Node test runner
npm run build         # Runs client production build and server TypeScript build
npm run smoke         # Runs server/src/smoke.ts application startup verification

# Canonical Pre-Commit / Pre-PR Gate
npm run verify        # Executes lint -> typecheck -> test -> build -> smoke sequentially
```

---

## 6. Known Technical Debt & Intentional Warnings

1. **Server ESLint `@typescript-eslint/no-explicit-any` Warnings**:
   - **Status**: 88 warnings remain in `server/src/**/*.ts`.
   - **Policy**: Accepted technical debt for Phase 19. Preserved as warning-level to keep linting clean of blocking errors without resorting to suppression comments.
2. **Vite Production Chunk Size Warning**:
   - **Status**: Client bundle outputs single main JS chunk (`~1.2MB`).
   - **Policy**: Non-blocking warning. Code-splitting via React `lazy()` dynamic imports is scheduled for future optimization phases.
3. **Mongoose Version Key (`__v`) in Tests**:
   - **Status**: Certain test setups instantiate mock documents without full Mongoose initialization.
   - **Policy**: Handled explicitly in test helpers.

---

## 7. Readiness for Phase 20

The repository is completely stabilized, tested, and documented. With Phase 19 successfully completed and verified through `npm run verify` and GitHub Actions CI, the project is 100% prepared for Phase 20 development.
