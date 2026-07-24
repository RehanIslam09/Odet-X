# Odet-X / AI Project Manager — Architectural Roadmap Context

This document provides a comprehensive, repository-grounded snapshot of the current state of the **Odet-X / AI Project Manager** codebase following the completion of **Phase 24 — Frontend Foundation & AI Integration**.

It serves as the authoritative, factual foundation for designing the future project roadmap (Phase 25+).

> [!IMPORTANT]
> **Reading Guidance for Roadmap Designers & AI System Architects:**
> - Every major claim in this document is labeled as **VERIFIED REPOSITORY FACT**, **DOCUMENTED HISTORICAL DECISION**, **INFERENCE**, or **OPEN QUESTION**.
> - All file paths refer directly to authoritative source files in this repository.
> - This document is purely analytical and context-providing. It does **not** prescribe final phase numbers, implementation order, or feature designs for future work.

---

## Section 1 — Repository Baseline

### 1.1 Source Control & Environment Baseline
- **Current Git Branch**: `feat/phase-24-frontend-ai-integration` (Verified via `git branch --show-current`)
- **Current Git Commit**: `4c84c7861731a2f584c99d1a9806cfce9ac72f89` (Verified via `git rev-parse HEAD`)
- **Working Tree Status**: Clean (0 unstaged or untracked changes)
- **Node.js Version**: `v20.20.2` (Verified via `node -v`)
- **NPM Version**: `10.8.2` (Verified via `npm -v`)

### 1.2 Repository Monorepo Structure
The repository is organized as a workspace-based TypeScript monorepo with distinct frontend (`client`) and backend (`server`) applications:

```
ai-project-manager/
├── client/                     # Frontend Vite + React SPA
│   ├── src/
│   │   ├── app/                # App entry, Providers, Router, Query Client
│   │   ├── components/         # Shared UI components & shadcn primitives
│   │   ├── config/             # Navigation & environment config
│   │   ├── features/           # Modular domain feature packages
│   │   │   ├── activity/       # Activity feed timeline
│   │   │   ├── ai/             # AI contracts, API module, TanStack Query hooks
│   │   │   ├── dashboard/      # Analytics overview & quick actions
│   │   │   ├── notifications/  # User notification center
│   │   │   ├── projects/       # Project management & workspace views
│   │   │   ├── settings/       # User profile, appearance, & notification settings
│   │   │   └── tasks/          # Task management & markdown notes workspace
│   │   ├── hooks/              # Shared utility hooks
│   │   ├── lib/                # Shared utilities & helpers
│   │   ├── routes/             # Public & Protected route guards
│   │   ├── store/              # Auth session state (Zustand)
│   │   ├── utils/              # API error handling & form error mappers
│   │   └── index.css           # Global CSS design system & Tailwind directives
│   └── package.json
├── server/                     # Backend Node.js + Express API server
│   ├── src/
│   │   ├── ai/                 # Core AI Subsystem (Services, Router, Providers, Prompts, Telemetry)
│   │   ├── config/             # Database connection & env validation
│   │   ├── constants/          # Domain constants (Status, Priority, Roles)
│   │   ├── controllers/        # Express request controllers
│   │   ├── jobs/               # Background cron jobs (Notifications)
│   │   ├── middleware/         # Auth, validation, error handling, rate limiting
│   │   ├── models/             # Mongoose schemas & domain document interfaces
│   │   ├── routes/             # Express API route declarations
│   │   ├── services/           # Domain business logic & AI orchestration
│   │   ├── tests/              # Automated unit, integration, & telemetry tests
│   │   ├── types/              # Express & API type definitions
│   │   ├── utils/              # JWT, hashing, app errors, response formatters
│   │   ├── validators/         # Zod API request payload validators
│   │   ├── app.ts              # Express application factory
│   │   ├── index.ts            # Server entry point
│   │   ├── smoke.ts            # Application initialization smoke test script
│   │   └── worker.ts           # Background worker process entry point
│   └── package.json
├── docs/                       # Architectural & Phase Documentation
│   └── phases/                 # Completed Phase Contracts, Audits, & Gate Reviews
└── package.json                # Root package configuration & script orchestrator
```

### 1.3 NPM Script Suite
*(Source: `package.json`, `client/package.json`, `server/package.json`)*

- **`npm run dev`**: Concurrently starts the client Vite dev server, backend Express API server, and background worker process.
- **`npm run lint`**: Executes `eslint` across both `client/` and `server/` packages.
- **`npm run typecheck`**: Runs `tsc -b` (client) and `tsc --noEmit` (server).
- **`npm run test`**: Runs Vitest unit tests for client (`vitest run`) and custom Node.js test runner for server (`tsx src/tests/run.ts`).
- **`npm run build`**: Builds production bundles for client (`vite build`) and compiles server TypeScript (`tsc`).
- **`npm run smoke`**: Executes server startup smoke test (`tsx src/smoke.ts`).
- **`npm run verify`**: Master CI verification pipeline (`lint` $\rightarrow$ `typecheck` $\rightarrow$ `test` $\rightarrow$ `build` $\rightarrow$ `smoke`).

### 1.4 Technology Stack Inventory

#### Frontend Technology Stack (`client/package.json`)
- **Core Framework**: React `19.2.7` + React DOM `19.2.7`
- **Language**: TypeScript `~6.0.2`
- **Build Tool**: Vite `8.1.1` (`@vitejs/plugin-react` `6.0.3`, `vite-tsconfig-paths` `6.1.1`)
- **Styling & CSS**: TailwindCSS `4.3.2` (`@tailwindcss/vite` `4.3.2`), `clsx` `2.1.1`, `tailwind-merge` `3.6.0`, `class-variance-authority` `0.7.1`, `@fontsource-variable/geist` `5.2.9`
- **Component UI Primitives**: `shadcn` `4.13.0`, Radix UI (`radix-ui` `1.6.2`, `@radix-ui/react-progress` `1.1.12`), `cmdk` `1.1.1`, `lucide-react` `1.24.0`
- **Server State Management**: TanStack Query `5.101.2` (`@tanstack/react-query`, `@tanstack/react-query-devtools`)
- **Client Auth/Session State**: Zustand `5.0.14`
- **Routing**: React Router `7.18.1` (`react-router-dom`)
- **Form & Validation**: React Hook Form `7.81.0` + Zod `4.4.3` (`@hookform/resolvers` `5.4.0`)
- **Animations**: Framer Motion `12.42.2`
- **HTTP Networking**: Axios `1.18.1`
- **Toast System**: Sonner `2.0.7`
- **Drag & Drop**: `@dnd-kit/core` `6.3.1`, `@dnd-kit/sortable` `10.0.0`, `@dnd-kit/utilities` `3.2.2`
- **Testing**: Vitest `4.1.10`, `@testing-library/react` `16.3.2`, `@testing-library/jest-dom` `6.9.1`, `axios-mock-adapter` `2.1.0`, `jsdom` `29.1.1`, Playwright `1.61.1`

#### Backend Technology Stack (`server/package.json`)
- **Runtime Environment**: Node.js `v20.20.2`
- **Application Server Framework**: Express `5.2.1`
- **Language**: TypeScript `5.9.2` (`tsx` `4.23.1` execution engine)
- **Database & ODM**: MongoDB / Mongoose `9.7.4`
- **Authentication & Security**: JWT (`jsonwebtoken` `9.0.2`), Password hashing (`bcrypt` `6.0.0`), Security headers (`helmet` `8.3.0`), Rate limiting (`express-rate-limit` `8.6.0`), Cookie parser (`cookie-parser` `1.4.7`), CORS (`cors` `2.8.6`)
- **Schema Validation**: Zod `4.4.3`
- **AI SDKs**: `@google/genai` `2.13.0` (Gemini API), `@anthropic-ai/sdk` `0.24.0` (Claude API)
- **Background Tasks & Scheduler**: `node-cron` `3.0.3`
- **HTTP Logging**: `morgan` `1.11.0`
- **Environment Management**: `dotenv` `17.4.2`, `cross-env` `10.1.0`
- **Testing Stack**: Custom Node.js test runner (`tsx src/tests/run.ts`) executing isolated Mongoose test suites against local MongoDB (`mongodb://127.0.0.1:27017/ai-project-manager-test`).

---

## Section 2 — Completed Phase History (Phases 20–24)

### Phase 20 — Multi-Provider AI Foundation + Gemini
- **Objective**: Establish a production-grade, multi-provider AI backend abstraction decoupled from specific vendor SDKs, with full support for structured schema generation, model tiering, and credential isolation.
- **Key Architectural Components**:
  - `AIProvider` Abstract Base Class (`server/src/ai/providers/base.provider.ts`): Standardizes provider capabilities (`generateStructured`, `getModelForTier`, `validateCredentials`).
  - Provider Implementations: `GeminiProvider` (`server/src/ai/providers/gemini.provider.ts`) and `AnthropicProvider` (`server/src/ai/providers/anthropic.provider.ts`).
  - `GeminiSchemaAdapter` (`server/src/ai/providers/gemini-schema.adapter.ts`): Translates Zod schemas into Gemini-compatible OpenAPI 3.0 schema objects.
  - `AIProviderFactory` (`server/src/ai/providers/provider.factory.ts`): Lazy, process-wide caching of provider instances.
  - `AIService` (`server/src/ai/ai.service.ts`): Central entry point for domain services.
  - Prompt Registry & Builder (`server/src/ai/prompts/`): Versioned prompt templates (`project-tasks`, `project-summary`, `task-labels`).
- **Durable Invariants**:
  - Raw provider response text must be validated against a Zod schema before domain layer consumption.
  - Providers do **not** interact with the database or HTTP controllers directly.
  - Model tiers (`FAST`, `SMART`, `REASONING`) decouple application code from explicit model strings (e.g., `gemini-2.5-flash`).
  - Automated tests execute with zero live AI network calls.

### Phase 21 — AI Observability & Usage Intelligence
- **Objective**: Implement comprehensive operational telemetry, execution timing, token usage tracking, error classification, and strict privacy boundary controls across all AI requests.
- **Key Architectural Components**:
  - `AILogger` / Telemetry Observer (`server/src/ai/utils/logger.ts`): Event-driven telemetry emitter supporting synchronous and asynchronous observers (`onTelemetry`, `offTelemetry`).
  - Error Taxonomy (`server/src/ai/errors/ai.errors.ts`): Hierarchy of custom error classes (`AIBaseError`, `AIConfigurationError`, `AIProviderError`, `AITimeoutError`, `AIValidationError`, `AIFallbackExecutionError`).
  - Token Usage Extraction: Safe normalization of provider token metadata (`inputTokens`, `outputTokens`, `totalTokens`).
- **Durable Invariants**:
  - Privacy Boundary: Telemetry events **never** contain raw prompts, raw model outputs, API keys, or secret sentinels.
  - `UNKNOWN != ZERO`: Unreported token usage is recorded as `undefined`, **never** fabricated as `0`.
  - Observer Isolation: Telemetry observer failures are caught silently and **never** interrupt AI request execution.

### Phase 22 — Provider Fallback & Resilience
- **Objective**: Build automated, policy-driven fallback execution allowing requests to fail over from a primary AI provider to an alternate provider upon eligible failure.
- **Key Architectural Components**:
  - Fallback Policy Engine (`server/src/ai/utils/fallback-policy.ts`): `isFallbackEligible(error)` evaluates whether an error qualifies for fallback.
  - Fallback Orchestration in `AIService`: Attempts execution on Primary provider; if an eligible error occurs (e.g., timeout, 5xx server error, rate limit), lazily resolves Alternate provider and retries.
  - `AIFallbackExecutionError` (`server/src/ai/errors/ai.errors.ts`): Preserves composite error diagnostics (`primaryError`, `fallbackError`, `primaryProvider`, `fallbackProvider`).
- **Durable Invariants**:
  - Explicit Allowlist: Only infrastructure failures (timeouts, HTTP 500/503/429, network disconnects) trigger fallback.
  - Bounded Retries: Maximum 1 fallback attempt per request (total 2 execution attempts).
  - Safety & Validation Isolation: Prompt validation errors, Zod schema validation errors, and safety refusals **never** trigger fallback.

### Phase 23 — Intelligent AI Provider Routing
- **Objective**: Implement a deterministic, capability-aware routing layer (`AIRouter`) that selects the optimal initial provider based on requested model tier and provider credential availability.
- **Key Architectural Components**:
  - `AIRouter` (`server/src/ai/routing/ai.router.ts`): Evaluates capability tiers (`FAST`, `SMART`, `REASONING`) and candidate provider availability to produce a deterministic `AIRoutingDecision`.
  - Routing Strategy Taxonomy (`server/src/ai/routing/types.js`): `TIER_OPTIMAL`, `SINGLE_CONFIGURED_PROVIDER`, `FALLBACK_DEGRADED`.
  - Telemetry Integration: Enriches execution telemetry with `routingStrategy`, `routingReasonCode`, and `candidateProviders`.
- **Durable Invariants**:
  - `AIRouter` is a pure function operating on configuration snapshots without side effects.
  - `AIService` invokes `AIRouter.selectInitialProvider` on Attempt 1, then falls back via `AIProviderFactory.resolveAlternateProviderName` on Attempt 2.

### Phase 24 — Frontend Foundation & AI Integration
- **Objective**: Establish a production-grade frontend integration architecture and expose the three backend AI capabilities (`generate-tasks`, `generate-summary`, `generate-labels`) through polished UI interactions.
- **Key Architectural Components**:
  - AI Domain Module (`client/src/features/ai/`): Single source of truth for AI type contracts (`ai.types.ts`), API bindings (`ai.api.ts`), and TanStack Query mutation hooks (`useGenerateTasks`, `useGenerateProjectSummary`, `useGenerateTaskLabels`).
  - Product UI Integration:
    - `GenerateTasksDialog` (`client/src/features/projects/components/GenerateTasksDialog.tsx`): Requirement description input dialog with in-flight loading states.
    - `ProjectAISummaryCard` (`client/src/features/projects/components/ProjectAISummaryCard.tsx`): Workspace card rendering persisted `aiSummary` (`summary`, `highlights`, `risks`) with skeleton loaders and regeneration triggers.
    - `TaskPropertiesPanel` AI Labels Action (`client/src/features/tasks/components/TaskPropertiesPanel.tsx`): Auto-label generation trigger.
- **Durable Invariants**:
  - Server State Ownership: TanStack Query owns 100% of AI mutation state and cache invalidation. Zero AI server state exists in Zustand.
  - Centralized HTTP Client: All HTTP traffic flows strictly through `aiApi` $\rightarrow$ shared `apiClient` (`client/src/services/axios.ts`). Zero direct `fetch()` or raw Axios calls exist in components.
  - Placeholder Boundary: Generic "Ask AI" buttons (`QuickActions.tsx`, `AIDailyBrief.tsx`) remain disabled placeholders with *"The AI assistant is coming soon."* tooltips. Zero un-scoped AI chat drawers or streaming copilots were created.

---

## Section 3 — Current Backend Domain Model

### 3.1 Domain Model Entity Inventory

#### 1. `User` Entity (`server/src/models/user.model.ts`)
- **Fields**: `id`, `name`, `email` (unique index), `username` (unique index), `password` (hashed with bcrypt, hidden by default), `avatar`, `bio`, `refreshTokenHash` (hidden by default), `isEmailVerified`, `isActive`, `preferences` (`appearance`, `locale`, `notifications`), `createdAt`, `updatedAt`.
- **Tenancy Boundary**: Primary security owner of all workspace resources (`User` ID matches `owner` field on projects and tasks).

#### 2. `Project` Entity (`server/src/models/project.model.ts`)
- **Fields**:
  - `id`: Unique identifier (stringified ObjectId).
  - `owner`: `Schema.Types.ObjectId` referencing `User` (required).
  - `name`: String (required, max 100 chars).
  - `description`: String (default `""`, max 1000 chars).
  - `emoji`: String (default `"📁"`).
  - `color`: Hex color string (default `"#6366f1"`).
  - `archived`: Boolean (default `false`).
  - `isDeleted`: Soft delete flag (default `false`).
  - `aiSummary`: Embedded optional object:
    - `summary`: String (required).
    - `highlights`: Array of strings (default `[]`).
    - `risks`: Array of strings (default `[]`).
  - `createdAt`: Date.
  - `updatedAt`: Date.
- **Indexes**: Compound index `{ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 }`.

#### 3. `Task` Entity (`server/src/models/task.model.ts`)
- **Fields**:
  - `id`: Unique identifier.
  - `owner`: `Schema.Types.ObjectId` referencing `User` (required).
  - `projectId`: `Schema.Types.ObjectId` referencing `Project` (optional/nullable).
  - `title`: String (required, max 200 chars).
  - `description`: String (default `""`, max 2000 chars).
  - `notes`: Markdown string (default `""`, max 250,000 chars).
  - `status`: Enum string (`"todo"`, `"in_progress"`, `"done"`, default `"todo"`).
  - `priority`: Enum string (`"none"`, `"low"`, `"medium"`, `"high"`, `"urgent"`, default `"none"`).
  - `dueDate`: Date (optional/nullable).
  - `estimatedTime`: String (optional/nullable, e.g., `"2h 30m"`).
  - `labels`: Array of normalized strings (default `[]`).
  - `completedAt`: Date (managed automatically based on `status`).
  - `archived`: Boolean (default `false`).
  - `isDeleted`: Soft delete flag (default `false`).
  - `createdAt`: Date.
  - `updatedAt`: Date.
  - `version`: Number (Mongoose `__v` mapped to `version` for optimistic concurrency control).
- **Hooks**: Pre-save middleware automatically manages `completedAt` timestamp and deduplicates/trims `labels`.
- **Indexes**: Compound indexes covering owner, deletion, archival, project ID, status, priority, due date, and labels.

#### 4. `Activity` Entity (`server/src/models/activity.model.ts`)
- **Fields**: `owner`, `actorId`, `type` (`PROJECT_CREATED`, `TASK_CREATED`, `AI_TASKS_GENERATED`, `AI_SUMMARY_GENERATED`, `AI_LABELS_GENERATED`, etc.), `entityType` (`"project"` | `"task"`), `entityId`, `projectId`, `contextProjectIds` (array of ObjectIds for multi-project context), `taskId`, `metadata` (Mixed object), `createdAt`.

#### 5. `Notification` Entity (`server/src/models/notification.model.ts`)
- **Fields**: `recipientId`, `actorId`, `type`, `entityType`, `entityId`, `title`, `message`, `metadata`, `dedupeKey` (sparse unique index for cron idempotency), `readAt`, `createdAt`.

---

### 3.2 Domain Model Feature Readiness Audit

The following matrix documents the **exact current support** in backend Mongoose schemas and domain services for features often requested in PM platforms:

| Feature Capability | Current Support Status | Relevant Source File(s) | Architectural Evidence & Notes |
| :--- | :--- | :--- | :--- |
| **Task Dependencies** | **NOT FOUND** | `server/src/models/task.model.ts` | No `dependencies`, `blockedBy`, or `dependsOn` fields exist in `ITask`. |
| **Dependency Graph** | **NOT FOUND** | `server/src/models/task.model.ts` | Zero graph storage or adjacency representation in Mongoose models. |
| **Parent / Child Tasks** | **NOT FOUND** | `server/src/models/task.model.ts` | No `parentId` or `childIds` fields exist in `ITask`. |
| **Subtasks** | **NOT FOUND** | `server/src/models/task.model.ts` | Zero subtask schema or sub-document array. |
| **Milestones** | **NOT FOUND** | `server/src/models/project.model.ts` | No `Milestone` model or project milestone field. |
| **Project Phases / Stages** | **NOT FOUND** | `server/src/models/project.model.ts` | Projects have no concept of phases, sprints, or stages. |
| **Task Rank / Manual Order** | **NOT FOUND** | `server/src/models/task.model.ts` | Tasks are sorted strictly by `updatedAt`, `dueDate`, `title`, `priority`, or `status`. No `order` or `position` float/integer field exists. |
| **Task Sequencing** | **NOT FOUND** | `server/src/models/task.model.ts` | No explicit execution sequence field. |
| **Blockers / Impediments** | **NOT FOUND** | `server/src/models/task.model.ts` | No `isBlocked` or `blockerReason` fields. |
| **Task Assignees** | **NOT FOUND** | `server/src/models/task.model.ts` | Tasks have a single `owner: User` reference. No `assigneeId` or `assignees` array exists. |
| **Teams / Multi-User Workspaces** | **NOT FOUND** | `server/src/models/project.model.ts` | Projects are owned by a single `owner: User`. Multi-user collaboration/teams are not implemented. |
| **Project Goals** | **NOT FOUND** | `server/src/models/project.model.ts` | No `goals` or `objectives` field on `Project`. |
| **Structured Acceptance Criteria**| **NOT FOUND** | `server/src/models/task.model.ts` | Task has `notes` (markdown text) and `description`, but no array of structured acceptance criteria. |
| **Dependency Cycle Detection** | **NOT FOUND** | `server/src/services/task.service.ts` | Zero cycle detection algorithms or graph utilities in server code. |
| **Planning Metadata / Draft Plans** | **NOT FOUND** | `server/src/models/project.model.ts` | Generated tasks are written directly to MongoDB `Task` collection. No `DraftPlan` or `PlanProposal` model exists. |
| **Plan Versioning** | **NOT FOUND** | `server/src/models/project.model.ts` | No history or versioning of task generation requests or plan iterations. |
| **AI Plan Proposals** | **NOT FOUND** | `server/src/services/project-ai.service.ts` | `generateProjectTasks` converts AI items into Mongoose `Task` documents immediately without a review stage. |
| **Optimistic Concurrency Control** | **SUPPORTED** | `server/src/models/task.model.ts` | `taskSchema` sets `optimisticConcurrency: true`. Mongoose maps `__v` to `version`. |

---

## Section 4 — Current Backend API Surface

*(Source: `server/src/routes/*.ts`, `server/src/controllers/*.ts`)*

### 4.1 Route Inventory Matrix

| Domain | Method | Endpoint Path | Auth Required | Request Payload (Body / Query) | Response Envelope Data | Side Effects / Service Executed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | No | `{ name, email, username, password }` | `{ user, accessToken }` | Creates User document, sets HTTP-only refresh cookie. |
| **Auth** | `POST` | `/api/v1/auth/login` | No | `{ email, password }` | `{ user, accessToken }` | Verifies password, sets HTTP-only refresh cookie. |
| **Auth** | `POST` | `/api/v1/auth/refresh` | No | Refresh Cookie | `{ accessToken }` | Rotates JWT tokens. |
| **Auth** | `POST` | `/api/v1/auth/logout` | Yes | None | `{ success: true }` | Clears refresh token hash in DB and clears cookie. |
| **Auth** | `GET` | `/api/v1/auth/me` | Yes | None | `{ user }` | Returns authenticated User entity. |
| **User** | `GET` | `/api/v1/users/profile` | Yes | None | `{ user }` | Fetches full profile details. |
| **User** | `PATCH` | `/api/v1/users/profile` | Yes | `{ name?, username?, bio?, avatar? }` | `{ user }` | Updates profile fields in MongoDB. |
| **User** | `PATCH` | `/api/v1/users/preferences` | Yes | `{ appearance?, locale?, notifications? }` | `{ user }` | Deep-merges user preferences object. |
| **User** | `PATCH` | `/api/v1/users/password` | Yes | `{ currentPassword, newPassword }` | `{ success: true }` | Updates password hash, invalidates active sessions. |
| **Projects**| `GET` | `/api/v1/projects` | Yes | `?page&limit&search&archived&sort` | `{ items: Project[], pagination }` | Paginated project list retrieval. |
| **Projects**| `POST` | `/api/v1/projects` | Yes | `{ name, description?, emoji?, color? }` | `{ project: Project }` | Creates Project document and `PROJECT_CREATED` activity log. |
| **Projects**| `GET` | `/api/v1/projects/:id` | Yes | None | `{ project: Project }` | Fetches single project detail by ID. |
| **Projects**| `PATCH` | `/api/v1/projects/:id` | Yes | `{ name?, description?, emoji?, color? }` | `{ project: Project }` | Updates project metadata. |
| **Projects**| `DELETE`| `/api/v1/projects/:id` | Yes | None | `{ success: true }` | Soft deletes project (`isDeleted: true`) and associated tasks. |
| **Projects**| `PATCH` | `/api/v1/projects/:id/archive` | Yes | `{ archived: boolean }` | `{ project: Project }` | Toggles project archival state. |
| **Projects**| `GET` | `/api/v1/projects/:id/summary` | Yes | None | `{ summary: ProjectSummary }` | Aggregates task count metrics for project. |
| **Tasks** | `GET` | `/api/v1/tasks` | Yes | `?page&limit&search&status&priority&projectId&sort` | `{ items: Task[], pagination }` | Paginated task list filtering & retrieval. |
| **Tasks** | `POST` | `/api/v1/tasks` | Yes | `{ title, description?, status?, priority?, projectId?, dueDate?, estimatedTime?, labels? }` | `{ task: Task }` | Creates Task document and `TASK_CREATED` activity log. |
| **Tasks** | `GET` | `/api/v1/tasks/:id` | Yes | None | `{ task: Task }` | Fetches single task detail by ID. |
| **Tasks** | `PATCH` | `/api/v1/tasks/:id` | Yes | `{ title?, description?, status?, priority?, dueDate?, estimatedTime?, labels?, version }` | `{ task: Task }` | Updates task fields using optimistic concurrency check. |
| **Tasks** | `DELETE`| `/api/v1/tasks/:id` | Yes | None | `{ success: true }` | Soft deletes task (`isDeleted: true`). |
| **Tasks** | `PATCH` | `/api/v1/tasks/:id/archive` | Yes | `{ archived: boolean }` | `{ task: Task }` | Toggles task archival state. |
| **Tasks** | `PATCH` | `/api/v1/tasks/:id/notes` | Yes | `{ notes: string, version }` | `{ task: Task }` | Updates task markdown notes document. |
| **AI** | `POST` | `/api/v1/projects/:id/generate-tasks` | Yes | `{ description: string }` | `{ items: Task[] }` | Calls `ProjectAIService.generateProjectTasks`, creates tasks, logs activity. |
| **AI** | `POST` | `/api/v1/projects/:id/generate-summary` | Yes | `{}` | `{ project: Project }` | Calls `ProjectSummaryAIService.generateProjectSummary`, updates project `aiSummary`, logs activity. |
| **AI** | `POST` | `/api/v1/tasks/:id/generate-labels` | Yes | `{}` | `{ task: Task }` | Calls `TaskAIService.generateTaskLabels`, appends tags to task, logs activity. |
| **Dashboard**| `GET`| `/api/v1/dashboard/overview` | Yes | None | `{ overview: DashboardOverview }` | Aggregates workspace task/project metrics. |
| **Activity**| `GET`| `/api/v1/activity` | Yes | `?page&limit&projectId&taskId` | `{ items: Activity[], pagination }` | Paginated activity timeline feed. |
| **Notify** | `GET` | `/api/v1/notifications` | Yes | `?page&limit&unreadOnly` | `{ items: Notification[], pagination }` | Paginated notification center feed. |
| **Notify** | `GET` | `/api/v1/notifications/unread-count` | Yes | None | `{ unreadCount: number }` | Fetches total unread notification count. |

### 4.2 Non-Existent API Capabilities Audit
The repository was explicitly inspected for APIs supporting advanced AI or PM features. The following endpoint categories **do NOT exist** anywhere in the API router:
- No `/api/v1/plans` or `/api/v1/projects/:id/plan` endpoints.
- No `/api/v1/dependencies` or `/api/v1/tasks/:id/dependencies` endpoints.
- No `/api/v1/milestones` endpoints.
- No `/api/v1/chat` or `/api/v1/copilot` endpoints.
- No `/api/v1/ai/actions` or execution dry-run endpoints.
- No `/api/v1/search` or vector retrieval endpoints.
- No bulk task mutation endpoints (e.g., `POST /api/v1/tasks/bulk`).
- No Server-Sent Events (`text/event-stream`) or WebSocket endpoints for streaming responses.

---

## Section 5 — Current AI Architecture

### 5.1 Architecture Data Flow Diagram

```
[ Frontend Component / Hook ]
             │
             ▼  (HTTP POST JSON Payload)
[ Express Controller & Zod Request Validator ]
             │
             ▼  (Calls Domain AI Service)
[ Domain AI Service ] (e.g., ProjectAIService)
             │  - Assembles domain context (Project/Task DB records)
             │  - Loads Prompt Template from Prompt Registry
             │  - Loads Output Zod Schema
             ▼
[ AIService ] (Central AI Orchestrator)
             │
             ├──► Step 1: AIRouter.selectInitialProvider({ tier })
             │         └─► Evaluates capability tier & API keys ──► Returns Initial Provider (Attempt 1)
             │
             ├──► Step 2: AIProviderFactory.getProvider(selectedProvider)
             │         └─► Lazily constructs/caches Provider instance (GeminiProvider / AnthropicProvider)
             │
             ├──► Step 3: Provider.generateStructured(prompt, schema, options)
             │         ├─► [Gemini]  GeminiSchemaAdapter ──► @google/genai SDK ──► Gemini API
             │         └─► [Anthropic]  JSON Schema ──────► @anthropic-ai/sdk ─► Claude API
             │
             ├──► Step 4: AI Response Validation (validateAIResponse via Zod)
             │         ├─► [Success] ──► Emits Telemetry Event (AILogger) ──► Returns Result
             │         └─► [Eligible Failure] ──► Fallback Policy (isFallbackEligible)
             │                                        │
             │                                        ▼  (Attempt 2)
             │                                   AIProviderFactory.resolveAlternateProviderName()
             │                                        │
             │                                        ▼  Executes Alternate Provider
             │
             ▼
[ Domain AI Service ]
             │  - Extracts validated response payload
             │  - Performs domain business rules (deduplication, limits)
             │  - Executes Mongoose DB mutations (Task.create, Project.updateOne)
             │  - Creates Activity log entry
             ▼
[ Express Controller ] ──► Returns Envelope JSON ──► [ TanStack Query Cache Refresh ]
```

### 5.2 Core Subsystem Responsibilities

1. **`AIService` (`server/src/ai/ai.service.ts`)**:
   - Central orchestration engine.
   - Manages execution attempts, timer measurements, fallback retries, and telemetry event logging.
   - Decouples domain services from provider mechanics.

2. **`AIRouter` (`server/src/ai/routing/ai.router.ts`)**:
   - Pure, side-effect-free routing engine.
   - Evaluates requested `AIModelTier` (`FAST`, `SMART`, `REASONING`) and configured API keys (`aiConfig.anthropic.apiKey`, `aiConfig.gemini.apiKey`) to determine Attempt 1 provider target.

3. **`AIProviderFactory` (`server/src/ai/providers/provider.factory.ts`)**:
   - Instantiates `GeminiProvider` or `AnthropicProvider` lazily.
   - Caches provider instances in a process-wide Map.
   - Resolves alternate provider names for fallback mapping (`anthropic` $\leftrightarrow$ `gemini`).

4. **`AIProvider` Base Class (`server/src/ai/providers/base.provider.ts`)**:
   - Abstract boundary enforcing `generateStructured()`, `getModelForTier()`, and credential validation.

5. **`GeminiSchemaAdapter` (`server/src/ai/providers/gemini-schema.adapter.ts`)**:
   - Converts Zod schemas into Gemini-compliant OpenAPI 3.0 type definitions.

6. **Prompt Registry (`server/src/ai/prompts/registry/prompt.registry.ts`)**:
   - Immutable directory of prompt definitions (`project-tasks`, `project-summary`, `task-labels`).

7. **`AILogger` (`server/src/ai/utils/logger.ts`)**:
   - Event-driven telemetry publisher emitting execution metrics (duration, model, token usage, routing reason, fallback metadata, error category).

---

### 5.3 Answers to Architectural Boundary Questions

1. **What does `AIService` own?**
   - Timing, attempt orchestration, prompt building, response Zod validation, fallback retries, and telemetry emission.
2. **What does `AIRouter` own?**
   - Pure, deterministic selection of the Attempt 1 provider based on capability tier and credential availability.
3. **What does `AIProviderFactory` own?**
   - Lazy construction, process-wide caching, and alternate provider name resolution.
4. **What do providers own?**
   - Mapping model tiers to vendor model strings, translating prompts into vendor SDK calls, requesting JSON output, and returning normalized `AIProviderResponse` objects.
5. **What do domain AI services own?**
   - Assembling domain context from MongoDB, calling `AIService`, applying domain filtering/deduplication, mutating domain Mongoose models, and logging activity entries.
6. **Where does validation happen?**
   - In two distinct locations: (1) Prompt arguments are validated by Zod before provider execution; (2) Provider response payloads are validated by `validateAIResponse` (Zod `schema.parse()`) inside `AIService` before domain processing.
7. **Where does persistence happen?**
   - Strictly in the domain services (`ProjectAIService`, `ProjectSummaryAIService`, `TaskAIService`). `AIService` and providers **never** touch MongoDB.
8. **Can AI currently mutate project state directly?**
   - **No.** AI model output is pure data returned to domain services. Domain services execute explicit Mongoose mutations (`Task.create()`, `Project.updateOne()`).
9. **What prevents raw model output from reaching MongoDB?**
   - `validateAIResponse` in `AIService` throws an `AIValidationError` if raw output fails Zod schema validation. Domain processing further filters and sanitizes inputs.
10. **Which operations currently create persistent state?**
    - `generateProjectTasks` creates new `Task` documents.
    - `generateProjectSummary` updates `project.aiSummary`.
    - `generateTaskLabels` appends strings to `task.labels`.
    - All three create `Activity` documents.

---

## Section 6 — Current AI Capability Inventory

*(Source: Repository code inspection across `server/src/ai/`, `server/src/services/`, `client/src/features/ai/`)*

| AI Capability | Backend Implemented? | API Route Exposed? | Frontend Implemented? | Persisted in DB? | Unit Tested? | Manually Verified? | Architectural Status & Notes |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Task Generation** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | `POST /projects/:id/generate-tasks` $\rightarrow$ `GenerateTasksDialog`. Generates up to 10 tasks. |
| **Project Summary** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | `POST /projects/:id/generate-summary` $\rightarrow$ `ProjectAISummaryCard`. Updates `project.aiSummary`. |
| **Task Labeling** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | `POST /tasks/:id/generate-labels` $\rightarrow$ `TaskPropertiesPanel` button. Appends up to 5 labels. |
| **Provider Routing** | **YES** | N/A (Internal) | N/A (Internal) | N/A | **YES** | **YES** | `AIRouter` selects Attempt 1 target based on tier & credentials. |
| **Provider Fallback** | **YES** | N/A (Internal) | N/A (Internal) | N/A | **YES** | **YES** | Automatic failover to alternate provider on infrastructure error. |
| **Observability/Telemetry** | **YES** | N/A (Internal) | N/A (Internal) | No (Logged) | **YES** | **YES** | `AILogger` captures execution metadata, duration, tokens, error taxonomy. |
| **Token Usage Tracking** | **YES** | N/A (Internal) | N/A (Internal) | No (Logged) | **YES** | **YES** | Normalizes input, output, and total token usage without fabrication. |
| **Planning Engine** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Zero multi-step plan generation, dependency resolution, or draft proposal schema. |
| **Project Q&A** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Zero project context question-answering service. |
| **Workspace Q&A** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Zero global workspace context query service. |
| **Generic Copilot** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Placeholders exist on frontend (`Ask AI`), but backend is 100% non-existent. |
| **Conversational Chat** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Zero message history schemas, chat sessions, or conversation persistence. |
| **Controlled AI Actions** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | AI cannot update task status, archive items, or perform multi-entity mutations. |
| **Project Memory** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Zero memory storage or persistent AI context store. |
| **Vector Retrieval / RAG** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Zero vector DB, embedding generation, or semantic chunking infrastructure. |
| **Semantic Search** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Search relies strictly on regex/MongoDB text indexes. |
| **Evaluation Framework** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Zero eval fixtures, LLM-as-judge, golden datasets, or quality scoring. |
| **Proactive Recommendations**| **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Zero background AI analysis jobs or proactive suggestion engines. |
| **Streaming Responses** | **NO** | **NO** | **NO** | **NO** | **NO** | **NO** | Responses are returned as single synchronous JSON HTTP payloads. |

---

## Section 7 — Current Frontend Architecture

### 7.1 Client Subsystem Structure & Boundaries

```
client/src/
├── app/
│   ├── main.tsx                # React DOM root render
│   ├── App.tsx                 # Top-level application wrapper & router outlet
│   ├── providers.tsx           # QueryClientProvider & ThemeProvider wrapper
│   ├── query-client.ts         # Central TanStack QueryClient configuration
│   ├── router.tsx              # React Router browser router configuration
│   └── error-boundary.tsx      # Global React error boundary component
├── routes/
│   ├── ProtectedRoute.tsx      # Authenticated session guard (redirects to /login if unauthenticated)
│   └── PublicRoute.tsx         # Guest route guard (redirects to /dashboard if authenticated)
├── store/
│   └── auth.store.ts           # Zustand authentication store (User profile, accessToken, login, logout)
├── services/
│   └── axios.ts                # Centralized apiClient singleton (JWT injection & 401 refresh lock interceptor)
└── features/
    └── ai/                     # Dedicated AI Feature Module
        ├── types/ai.types.ts   # DTOs matching backend AI response shapes
        ├── services/ai.api.ts  # API functions calling apiClient
        ├── hooks/              # TanStack Query mutation hooks
        │   ├── useGenerateTasks.ts
        │   ├── useGenerateProjectSummary.ts
        │   └── useGenerateTaskLabels.ts
        └── index.ts            # Public feature export barrel
```

### 7.2 State Ownership Invariants
- **TanStack Query (`@tanstack/react-query`)**: Owns 100% of server state, mutation lifecycles, and cache invalidation.
- **Zustand (`zustand`)**: Owns authentication session state **only** (`auth.store.ts`: `user`, `accessToken`, `setAuth`, `clearAuth`). Zero server domain entities or AI states are stored in Zustand.
- **React Hook Form (`react-hook-form` + `zod`)**: Owns form input state, validation, and field error rendering.
- **Local React State (`useState`)**: Owns ephemeral UI interaction state (dialog open/closed, prompt textarea text, tab selections).

### 7.3 End-to-End AI Workflow Traces

#### Workflow A: Generate Project Tasks
1. **User Action**: Clicks "Generate Tasks" in `ProjectTasks.tsx` $\rightarrow$ Opens `GenerateTasksDialog.tsx`.
2. **Prompt Input**: User types description in textarea and submits form.
3. **Hook Execution**: `useGenerateTasks(projectId)` calls `aiApi.generateTasks(projectId, { description })`.
4. **HTTP Networking**: `apiClient.post('/projects/:id/generate-tasks', { description })`.
5. **Backend Processing**: `ProjectController` $\rightarrow$ `ProjectAIService.generateProjectTasks` $\rightarrow$ `AIService` $\rightarrow$ Gemini API $\rightarrow$ Validates Zod schema $\rightarrow$ `Task.create()` in MongoDB $\rightarrow$ Logs `Activity`.
6. **Response & Invalidation**: Response returns `{ items: Task[] }`. Mutation `onSuccess` invalidates `taskKeys.lists()`, `projectKeys.summary(projectId)`, `dashboardKeys.overview()`, and `activityKeys.all`.
7. **UI Update**: TanStack Query automatically refetches project tasks; table updates instantly. Sonner displays success toast (*"X tasks generated successfully."*). Dialog closes.

#### Workflow B: Generate Project Summary
1. **User Action**: Clicks "Generate Summary" / "Regenerate" in `ProjectAISummaryCard.tsx`.
2. **Hook Execution**: `useGenerateProjectSummary(projectId)` calls `aiApi.generateSummary(projectId)`.
3. **HTTP Networking**: `apiClient.post('/projects/:id/generate-summary', {})`.
4. **Backend Processing**: `ProjectAIService` $\rightarrow$ `AIService` $\rightarrow$ Gemini API $\rightarrow$ Updates `project.aiSummary` in MongoDB $\rightarrow$ Logs `Activity`.
5. **Response & Invalidation**: Response returns `{ project: Project }`. Mutation `onSuccess` invalidates `projectKeys.detail(projectId)`, `projectKeys.lists()`, and `activityKeys.all`.
6. **UI Update**: Card transitions from skeleton loading state to rendering updated `summary`, `highlights`, and `risks`. Sonner displays success toast (*"Project summary generated successfully."*).

#### Workflow C: Generate Task Labels
1. **User Action**: Clicks "AI Labels" button in `TaskPropertiesPanel.tsx`.
2. **Hook Execution**: `useGenerateTaskLabels(taskId)` calls `aiApi.generateLabels(taskId)`.
3. **HTTP Networking**: `apiClient.post('/tasks/:id/generate-labels', {})`.
4. **Backend Processing**: `TaskAIService` $\rightarrow$ `AIService` $\rightarrow$ Gemini API $\rightarrow$ Appends tags to `task.labels` in MongoDB $\rightarrow$ Logs `Activity`.
5. **Response & Invalidation**: Response returns `{ task: Task }`. Mutation `onSuccess` invalidates `taskKeys.detail(taskId)`, `taskKeys.lists()`, and `activityKeys.all`.
6. **UI Update**: Properties panel updates label badges instantly. Sonner displays success toast (*"Labels generated and applied successfully."*).

---

## Section 8 — Frontend Product Surface Inventory

*(Source: Code inspection across `client/src/features/` and `client/src/components/`)*

### 8.1 Application Page & Surface Status

| Page / Surface | Route Path | Implementation Status | Features Present | Notes & Intentional Boundaries |
| :--- | :--- | :--- | :--- | :--- |
| **Login / Register** | `/login`, `/register` | **IMPLEMENTED** | Form validation, JWT auth, error alerts. | Production-ready auth flow. |
| **Dashboard Overview**| `/dashboard` | **IMPLEMENTED** | Metrics overview, recent projects, focus today. | Includes 2 Ask AI placeholders (see 8.2). |
| **Projects Dashboard**| `/projects` | **IMPLEMENTED** | Project list, search, filters, create/edit/delete dialogs. | Full CRUD project management. |
| **Project Workspace** | `/projects/:projectId` | **IMPLEMENTED** | Header, summary metrics, AI Summary card, task table, activity timeline. | Hosts AI Tasks & AI Summary actions. |
| **Tasks View** | `/tasks` | **IMPLEMENTED** | Global task table/board view, search, filters, pagination. | Displays AI-generated tasks & labels. |
| **Task Workspace** | `/tasks/:taskId` | **IMPLEMENTED** | Task header, properties panel, notes editor workspace. | Hosts AI Labels action & Markdown notes autosave. |
| **Notification Center**| `/notifications` | **IMPLEMENTED** | Paginated notifications, read/unread toggles. | Operates with background job notifications. |
| **User Settings** | `/settings` | **IMPLEMENTED** | Profile, security, appearance, notification preferences. | Manages user preferences. |

### 8.2 Inventory of AI Placeholders & Intentional Scope Boundaries

The codebase contains specific, intentional product placeholders reserved for future general AI assistant / copilot capabilities:

1. **Dashboard `QuickActions.tsx` (`client/src/features/dashboard/components/QuickActions.tsx`)**:
   - **Location**: Lines 75–85.
   - **UI Element**: "Ask AI" button with `Sparkles` icon.
   - **Observed State**: Button is explicitly `disabled` with a `Tooltip` displaying: *"The AI assistant is coming soon."*
   - **Reason**: Blocked by absence of a backend conversational AI / copilot endpoint.

2. **Dashboard `AIDailyBrief.tsx` (`client/src/features/dashboard/components/AIDailyBrief.tsx`)**:
   - **Location**: Lines 90–100.
   - **UI Element**: "Ask AI about your workspace" button.
   - **Observed State**: Button is explicitly `disabled` with a `Tooltip` displaying: *"The AI assistant is coming soon."*
   - **Reason**: Blocked by absence of a backend workspace Q&A / project retrieval engine.

---

## Section 9 — Current Project/Task Workflows

*(Source: `server/src/services/project.service.ts`, `server/src/services/task.service.ts`)*

### 9.1 Domain Service Mutation Boundaries

All human and AI user actions reuse standard domain service functions in `server/src/services/`:

```
Human User HTTP Request
          │
          ├──► Project Service (project.service.ts)
          │      ├── createProject()    ──► Validates inputs, saves to Mongo, logs PROJECT_CREATED Activity
          │      ├── updateProject()    ──► Checks ownership, saves changes, logs PROJECT_UPDATED Activity
          │      ├── archiveProject()   ──► Toggles archived flag, logs PROJECT_ARCHIVED Activity
          │      └── deleteProject()    ──► Soft deletes project & associated tasks, logs PROJECT_DELETED Activity
          │
          └──► Task Service (task.service.ts)
                 ├── createTask()       ──► Validates fields, saves to Mongo, logs TASK_CREATED Activity
                 ├── updateTask()       ──► Checks version (OCC), updates fields, manages completedAt, logs Activity
                 ├── updateTaskNotes()  ──► Saves markdown notes string, checks version (OCC)
                 ├── archiveTask()      ──► Toggles archived flag, logs TASK_ARCHIVED Activity
                 └── deleteTask()       ──► Soft deletes task (isDeleted: true), logs TASK_DELETED Activity
```

### 9.2 Key Invariants for Future Controlled AI Actions
- **Security Check**: Every service function requires `userId: string` (or `owner: ObjectId`) to enforce single-user multi-tenancy authorization.
- **Activity Logging**: All state mutations automatically record an `Activity` document specifying `actorId`, `type`, `entityType`, `entityId`, and `metadata`.
- **Optimistic Concurrency**: Task updates require passing the current `version` (`__v`). If the version does not match MongoDB, Mongoose throws a `VersionError` preventing lost updates.
- **Reversibility**: Project and Task deletions use soft deletion (`isDeleted: true`), allowing recovery if necessary.

---

## Section 10 — Planning Engine Readiness

The following 20 factual questions evaluate the current codebase's readiness for a future **Planning Engine** phase:

1. **Can AI currently generate multiple tasks?**
   - **VERIFIED REPOSITORY FACT**: **YES.** `ProjectAIService.generateProjectTasks` generates up to 10 tasks in a single request.
2. **What schema does it generate?**
   - **VERIFIED REPOSITORY FACT**: Array of objects matching `projectTasksOutputSchema` (`title`, `description`, `priority`, `estimatedTime`, `labels`).
3. **Are generated tasks immediately persisted?**
   - **VERIFIED REPOSITORY FACT**: **YES.** Tasks are written directly to MongoDB via `Task.create()` inside `ProjectAIService.ts`.
4. **Is there a preview/approval stage?**
   - **VERIFIED REPOSITORY FACT**: **NO.** Zero preview, staging, or approval UI/backend step exists.
5. **Can generated tasks express dependencies?**
   - **VERIFIED REPOSITORY FACT**: **NO.** Neither the AI schema nor the `Task` document has dependency fields.
6. **Can generated tasks express milestones?**
   - **VERIFIED REPOSITORY FACT**: **NO.** No milestone entity or field exists.
7. **Can generated tasks express ordering?**
   - **VERIFIED REPOSITORY FACT**: **NO.** Tasks receive default status `"todo"` without an order/position integer.
8. **Can generated tasks reference each other safely?**
   - **VERIFIED REPOSITORY FACT**: **NO.** Tasks are independent flat entities.
9. **Is cycle detection implemented anywhere?**
   - **VERIFIED REPOSITORY FACT**: **NO.** Zero graph cycle detection code exists.
10. **Is there a graph utility already installed/implemented?**
    - **VERIFIED REPOSITORY FACT**: **NO.** No graph libraries (e.g., `graphlib`, `dagre`) are installed in `package.json`.
11. **Can tasks be created transactionally/bulk?**
    - **VERIFIED REPOSITORY FACT**: `ProjectAIService` creates tasks using `Task.create(tasksToCreate)` array insertion, but does **not** wrap it in a MongoDB multi-document transaction session.
12. **What happens if task N succeeds but task N+1 fails?**
    - **VERIFIED REPOSITORY FACT**: Without a MongoDB transaction session, partial array insertions prior to an error remain in MongoDB while trailing tasks fail.
13. **Is rollback implemented?**
    - **VERIFIED REPOSITORY FACT**: **NO.** Zero rollback or saga mechanisms exist.
14. **Is idempotency implemented?**
    - **VERIFIED REPOSITORY FACT**: Deduplication prevents duplicate task titles within a single response, but zero request idempotency keys exist.
15. **Can a project plan currently be represented independently of persisted tasks?**
    - **VERIFIED REPOSITORY FACT**: **NO.** Project plans exist only as the aggregate of active `Task` documents in MongoDB.
16. **Is there a concept of draft plan?**
    - **VERIFIED REPOSITORY FACT**: **NO.**
17. **Is there plan versioning?**
    - **VERIFIED REPOSITORY FACT**: **NO.**
18. **Is there human approval before persistence?**
    - **VERIFIED REPOSITORY FACT**: **NO.**
19. **What frontend surface would logically host planning based on CURRENT UI?**
    - **INFERENCE**: The Project Workspace (`ProjectDetailPage.tsx` / `ProjectTasks.tsx`) or a new tab/dialog within the project feature module.
20. **Which existing components/hooks/APIs could potentially be reused?**
    - **VERIFIED REPOSITORY FACT**: `useGenerateTasks`, `GenerateTasksDialog`, `ProjectAISummaryCard`, `ProjectAIService`, `AIService`, `apiClient`.

---

## Section 11 — Copilot Readiness

- **Chat / Message Models**: **NOT FOUND.** No `Message`, `Thread`, or `ChatSession` Mongoose models exist.
- **Streaming Infrastructure**: **NOT FOUND.** Neither Express nor `apiClient` supports Server-Sent Events (SSE) or WebSockets. All AI responses are synchronous JSON.
- **Context Aggregator**: **PARTIALLY SUPPORTED.** `ProjectSummaryAIService` aggregates active project tasks into a text prompt context, but zero multi-project or workspace-wide context aggregators exist.
- **Search & Retrieval Infrastructure**: **NOT FOUND.** Search relies on basic regex matching (`$regex`). No vector database, embedding generation (`@google/genai` text-embedding or OpenAI embeddings), or RAG retrieval layers exist.
- **Copilot UI Surfaces**: **PLACEHOLDERS PRESENT.** "Ask AI" buttons in `QuickActions.tsx` and `AIDailyBrief.tsx` exist as disabled UI controls reserved for future implementation.

---

## Section 12 — Controlled AI Actions Readiness

- **Action System Readiness**: **NOT FOUND.** AI models currently act strictly as data generators (returning text, tasks, or labels). AI cannot execute domain actions (e.g., updating task status, archiving projects, reassigning due dates).
- **Command / Action Abstraction**: **NOT FOUND.** No `Command` pattern, action proposal schema, or dry-run execution engine exists.
- **Audit & Reversibility**: **PARTIALLY SUPPORTED.** The `Activity` model logs all human mutations and AI generations, providing a foundation for auditing future AI actions. Soft deletion (`isDeleted`) provides reversibility for deletion actions.

---

## Section 13 — Memory & Retrieval Readiness

- **Vector Database**: **NOT FOUND.** No vector database client (`Pinecone`, `Qdrant`, `Chroma`, `Weaviate`, `pgvector`) or MongoDB Atlas Vector Search index is configured.
- **RAG / Embeddings**: **NOT FOUND.** No embedding pipeline or document chunking code exists in `server/src/ai/`.
- **Structured Context Retrieval**: **SUPPORTED.** Mongoose compound indexes efficiently query projects, tasks, and activity logs by `owner`, `projectId`, `status`, and `priority` without requiring vector infrastructure for structural data retrieval.

---

## Section 14 — Evaluation / Quality Infrastructure

- **Current AI Tests**: **SUPPORTED.** 16 offline telemetry tests, 4 provider routing tests, 3 fallback orchestration tests, 4 AI API tests, 3 AI hook tests, and 7 AI UI interaction tests exist.
- **Eval Fixtures & Quality Benchmarks**: **NOT FOUND.** No golden datasets, LLM-as-judge scoring scripts, prompt regression benchmarks, or cost/token tracking databases exist. All tests verify structural compliance and mock responses.

---

## Section 15 — Observability & Operations Readiness

- **Telemetry Event Structure**: **SUPPORTED.** `AILogger` captures `executionId`, `timestamp`, `provider`, `tier`, `model`, `promptName`, `promptVersion`, `durationMs`, `success`, `errorCategory`, `tokenUsage`, `routingStrategy`, `routingReasonCode`, and `fallback` metadata.
- **Operational Infrastructure**: **NOT FOUND.** Telemetry events are logged to console/winston loggers. Zero persistent telemetry storage in MongoDB, metrics dashboards, per-user AI rate limiting, or OpenTelemetry tracing exists.

---

## Section 16 — Security, Privacy & Authorization Boundaries

- **User Authentication Flow**: `auth.middleware.ts` extracts JWT from `Authorization: Bearer <token>` header, verifies signature, attaches `req.user`, and enforces `401 Unauthorized` if invalid.
- **Multi-Tenancy Security Boundary**: Domain controllers and services enforce `owner: req.user._id` on all MongoDB queries. Users cannot view or modify projects/tasks belonging to other users.
- **AI Telemetry Privacy Boundary**: `AILogger` explicitly sanitizes events to ensure raw prompts, user PII, model outputs, API keys, and secret sentinels are **never** logged to stdout or log files.
- **Credential Exposure Protection**: Provider API keys (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) reside exclusively in server environment variables. Zero AI keys are exposed to the client bundle.

---

## Section 17 — Database & Data Integrity Characteristics

- **Soft Deletion**: `Project` and `Task` schemas implement `isDeleted: boolean` (default `false`). Queries filter `{ isDeleted: false }`.
- **Optimistic Concurrency Control**: `Task` schema specifies `optimisticConcurrency: true`. Mongoose validates `__v` (`version`) on updates, preventing concurrent overwrites.
- **Cascading Soft Delete**: Deleting a project automatically sets `isDeleted: true` on all associated tasks inside `project.service.ts`.
- **Activity Feed Integrity**: `Activity` documents are append-only (`timestamps: { createdAt: true, updatedAt: false }`).

---

## Section 18 — Testing & CI Baseline

- **Master CI Pipeline**: `npm run verify` executes linting, typechecking, unit tests, production builds, and server smoke test across all monorepo packages.
- **Zero-Live-AI-Call Guarantee**: All automated unit and integration tests run entirely offline using `axios-mock-adapter`, Vitest mocks, and provider test doubles. Live Gemini/Anthropic API calls are strictly forbidden during CI.
- **Test Inventory Summary**:
  - Client Unit Tests: **40/40 passed** (Vitest + React Testing Library).
  - Server Unit & Integration Tests: **22/22 passed** (Node.js test runner + Mongoose test DB).
  - Phase 21 AI Telemetry Tests: **16/16 passed**.
  - Server Smoke Test: **Passed**.

---

## Section 19 — Current Technical Debt & Limitations

1. **`GenerateTasksDialog.tsx` State Reset Callback**:
   - **Location**: `client/src/features/projects/components/GenerateTasksDialog.tsx`.
   - **Condition**: Form state reset is handled inside `handleOpenChange` callback to comply with `eslint-plugin-react-hooks` (`set-state-in-effect` rule).
   - **Impact**: Clean, but requires consumer components to pass `onOpenChange` consistently.
2. **Non-Transactional Bulk Task Insertion**:
   - **Location**: `server/src/services/project-ai.service.ts`.
   - **Condition**: Generated tasks are inserted via `Task.create(tasksToCreate)` without a MongoDB replica set session transaction.
   - **Impact**: In a multi-document database failure, partial task arrays could be written.
3. **Legacy Single-Project Context Index in Activity Model**:
   - **Location**: `server/src/models/activity.model.ts`.
   - **Condition**: Retains legacy `projectId` alongside `contextProjectIds` array for backward compatibility.
   - **Impact**: Minor schema redundancy.

---

## Section 20 — Future Capability Gap Matrix

| System Capability | Current Support Level | Repository Evidence | Missing Infrastructure Building Blocks | Technical Prerequisites |
| :--- | :--- | :--- | :--- | :--- |
| **Structured Task Generation** | **COMPLETE** | `ProjectAISummaryCard.tsx`, `ProjectAIService.ts` | None | Phase 20 / Phase 24 |
| **Planning Engine** | **NOT STARTED** | No planning schemas or preview steps | Draft plan model, plan preview UI, dependency graph, cycle detection | Domain schema updates |
| **Task Dependencies** | **NOT STARTED** | `ITask` interface has no dependency fields | `dependencies` schema field, DAG validation, graph utilities | Task model update |
| **Milestones / Sprints** | **NOT STARTED** | No milestone models | `Milestone` schema, date boundary validation, UI timeline | Domain model update |
| **Project Copilot / Q&A** | **NOT STARTED** | Placeholders in `QuickActions.tsx` | Chat models, context aggregator, SSE/WebSocket streaming, Copilot UI | Backend API & streaming |
| **Controlled AI Actions** | **NOT STARTED** | AI output is data-only | Command pattern, dry-run proposal schema, human approval UI, undo framework | Domain service commands |
| **Memory / Retrieval (RAG)** | **NOT STARTED** | Basic MongoDB regex search | Embedding pipeline, vector database, document chunker, semantic index | Infrastructure addition |
| **Evaluation Framework** | **NOT STARTED** | Unit tests pass offline | Golden datasets, LLM-as-judge scoring, prompt regression benchmarks | Testing harness |
| **Proactive Intelligence** | **NOT STARTED** | No background AI cron jobs | Background AI worker, recommendation queue, notification triggers | Scheduler expansion |

---

## Section 21 — Architectural Invariants to Preserve

1. **Frontend Credential Isolation**: Frontend applications must **never** receive or store vendor AI API keys (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`). All AI network requests originate from the Express backend. *(Source: `server/src/config/env.ts`)*
2. **Backend Provider Selection**: Provider routing and fallback decisions belong strictly to the backend (`AIRouter` + `AIService`). The client never requests specific AI providers or model names. *(Source: `client/src/features/ai/services/ai.api.ts`)*
3. **Structured Schema Validation**: All AI responses must be validated against Zod schemas before being consumed by domain services or persisted in MongoDB. *(Source: `server/src/ai/ai.service.ts`)*
4. **Domain Persistence Ownership**: Providers and `AIService` do **not** write to MongoDB. Persistence is owned exclusively by domain services (`ProjectAIService`, `TaskAIService`). *(Source: `server/src/services/`)*
5. **Bounded Fallback & Isolation**: Maximum 1 fallback attempt per request. Infrastructure errors qualify for fallback; validation errors, prompt errors, and safety refusals do **not**. *(Source: `server/src/ai/utils/fallback-policy.ts`)*
6. **Telemetry Privacy Boundary**: Telemetry events must **never** log raw prompts, model output payloads, user credentials, or secret sentinels. *(Source: `server/src/ai/utils/logger.ts`)*
7. **No Token Fabrication**: Unreported token counts must remain `undefined` and **never** be fabricated as `0`. *(Source: `server/src/ai/providers/`)*
8. **Offline Automated Verification**: Automated CI tests (`npm run verify`) must execute with **zero** live AI network requests. *(Source: `package.json`)*
9. **Server State Ownership**: Frontend server state is owned 100% by TanStack Query. Zero server or AI state is stored in Zustand stores. *(Source: `client/src/store/auth.store.ts`)*
10. **Centralized HTTP Client**: All client HTTP requests must flow through `apiClient` (`client/src/services/axios.ts`). Direct `fetch()` or raw Axios calls are forbidden. *(Source: `client/src/services/axios.ts`)*

---

## Section 22 — Architectural Decision Pressure Points

Future roadmap design must resolve the following 12 explicit decision pressure points:

### Decision Pressure Point 1 — Draft Plan Persistence vs. Direct Task Creation
- **CURRENT FACTS**: `ProjectAISummaryCard` and `ProjectAIService` currently create `Task` documents in MongoDB immediately upon AI generation.
- **WHY FUTURE WORK CANNOT IGNORE IT**: A multi-task Planning Engine requires human review/editing before polluting the task database.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Introduce a `DraftPlan` Mongoose model for review before committing to `Task` collection.
  - *Option B*: Keep tasks as transient client state in a preview modal prior to bulk `Task.create()`.
- **EVIDENCE NEEDED**: Plan size expectations and multi-session draft requirements.

### Decision Pressure Point 2 — Task Dependency Storage Model
- **CURRENT FACTS**: `Task` model currently has zero dependency fields.
- **WHY FUTURE WORK CANNOT IGNORE IT**: Project planning requires ordering and predecessor/successor relationships.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Embedded array of ObjectIds on `Task` (`dependencies: ObjectId[]`).
  - *Option B*: Separate `TaskDependency` edge collection (`predecessorId`, `successorId`, `type`).
- **EVIDENCE NEEDED**: Graph query frequency and cycle detection complexity requirements.

### Decision Pressure Point 3 — First-Class Milestones vs. Synthetic Attributes
- **CURRENT FACTS**: No `Milestone` model exists; tasks have optional `dueDate`.
- **WHY FUTURE WORK CANNOT IGNORE IT**: High-level project roadmapping requires tracking major target dates separate from individual task due dates.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Create a dedicated `Milestone` entity referenced by `Task.milestoneId`.
  - *Option B*: Tag specific tasks with a `"milestone"` label or priority.
- **EVIDENCE NEEDED**: UX requirements for milestone visualization.

### Decision Pressure Point 4 — Evaluation Framework Timing vs. Copilot Execution
- **CURRENT FACTS**: Zero eval fixtures or LLM-as-judge infrastructure exist today.
- **WHY FUTURE WORK CANNOT IGNORE IT**: Building a conversational Copilot without eval tooling makes measuring response quality and regression prevention difficult.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Build an evaluation & benchmarking harness prior to Copilot implementation.
  - *Option B*: Build Copilot v1 first and retroactively add evaluation logging.
- **EVIDENCE NEEDED**: System quality thresholds and tolerance for response drift.

### Decision Pressure Point 5 — Grounded Context: Vector Search (RAG) vs. Structured Mongo Aggregation
- **CURRENT FACTS**: No vector DB or embedding pipeline exists; Mongoose indexes efficiently query project/task structures.
- **WHY FUTURE WORK CANNOT IGNORE IT**: Copilot Q&A requires feeding relevant workspace context to the LLM.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Implement MongoDB Atlas Vector Search / Pinecone embeddings pipeline.
  - *Option B*: Use structured Mongoose queries to build context prompts (sufficient for small/medium projects).
- **EVIDENCE NEEDED**: Project task volume and unstructured document search requirements.

### Decision Pressure Point 6 — Controlled AI Action Mutation Framework
- **CURRENT FACTS**: AI models currently return data only; human domain services execute mutations.
- **WHY FUTURE WORK CANNOT IGNORE IT**: Allowing AI to perform actions (e.g., updating task status) requires safety controls.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Implement an explicit `Command` pattern with dry-run proposal schema and human confirmation UI.
  - *Option B*: Expose direct API endpoints to AI with automated undo logging.
- **EVIDENCE NEEDED**: User trust requirements and action destructiveness risk.

### Decision Pressure Point 7 — Streaming (SSE/WebSocket) Architecture
- **CURRENT FACTS**: HTTP networking uses standard JSON request-response via Axios and Express.
- **WHY FUTURE WORK CANNOT IGNORE IT**: Conversational chat requires low-latency token streaming for good UX.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Add Server-Sent Events (SSE) route handlers to Express and EventSource/fetch readers to client.
  - *Option B*: Keep synchronous JSON responses for v1 chat.
- **EVIDENCE NEEDED**: Response length and latency expectations for chat responses.

### Decision Pressure Point 8 — Persistent Conversations vs. Ephemeral Sessions
- **CURRENT FACTS**: No chat session models exist in MongoDB.
- **WHY FUTURE WORK CANNOT IGNORE IT**: Users may expect chat history to persist across browser reloads.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Create `Conversation` and `ChatMessage` Mongoose collections.
  - *Option B*: Maintain chat history in ephemeral React local state.
- **EVIDENCE NEEDED**: Product requirements for multi-session chat history.

### Decision Pressure Point 9 — Project-Scoped vs. Workspace-Scoped Copilot Context
- **CURRENT FACTS**: `Project` is the primary container for tasks; `User` is the workspace owner.
- **WHY FUTURE WORK CANNOT IGNORE IT**: Q&A scope dictates prompt assembly complexity and authorization checks.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Scope Copilot strictly to a single `projectId` at a time.
  - *Option B*: Support cross-project workspace queries.
- **EVIDENCE NEEDED**: User query patterns and token context window limits.

### Decision Pressure Point 10 — Transactional Bulk Task Creation Safeguards
- **CURRENT FACTS**: `Task.create()` inserts task arrays without MongoDB transaction sessions.
- **WHY FUTURE WORK CANNOT IGNORE IT**: Large plan import/generation failures can leave orphaned tasks.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Require MongoDB Replica Set transaction sessions for bulk AI operations.
  - *Option B*: Implement client-side rollback or saga cleanup handlers.
- **EVIDENCE NEEDED**: MongoDB deployment environment (Single-node vs. Replica Set).

### Decision Pressure Point 11 — Proactive AI Recommendations Architecture
- **CURRENT FACTS**: `node-cron` background scheduler exists for notifications (`server/src/jobs/notification.jobs.ts`).
- **WHY FUTURE WORK CANNOT IGNORE IT**: Proactive intelligence (e.g., risk detection, stale task alerts) requires background execution.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Extend `node-cron` worker process (`server/src/worker.ts`) to run periodic AI analysis jobs.
  - *Option B*: Execute proactive analysis lazily on user dashboard load.
- **EVIDENCE NEEDED**: API cost constraints and analysis latency tolerances.

### Decision Pressure Point 12 — Activation of Existing "Ask AI" Placeholders
- **CURRENT FACTS**: Buttons exist in `QuickActions.tsx` and `AIDailyBrief.tsx` with disabled tooltips.
- **WHY FUTURE WORK CANNOT IGNORE IT**: Frontend entry points are already placed in the user interface.
- **OPTIONS IMPLIED BY ARCHITECTURE**:
  - *Option A*: Enable placeholders as entry points for the future Copilot feature.
  - *Option B*: Replace placeholders with specific task/project AI action triggers.
- **EVIDENCE NEEDED**: Final roadmap decision on Copilot UX design.

---

## Section 23 — Possible Future Frontend Integration Points

| Current Component / Page | Current Purpose | Current Placeholder / UI | Backend Capability Required |
| :--- | :--- | :--- | :--- |
| `QuickActions.tsx` | Dashboard quick actions | Disabled "Ask AI" button | Workspace Copilot / Q&A endpoint |
| `AIDailyBrief.tsx` | Dashboard AI overview | Disabled "Ask AI about workspace" button | Workspace summary & proactive intelligence |
| `ProjectDetailPage.tsx` | Project Workspace header/tabs | `ProjectAISummaryCard` present | Planning Engine / Plan Preview modal |
| `ProjectTasks.tsx` | Task list section in project | "Generate Tasks" button present | Interactive Plan Editor / Dependency View |
| `TaskPropertiesPanel.tsx` | Task properties sidebar | "AI Labels" button present | Controlled AI Actions (Status, Priority, Estimate) |
| `TaskNotesWorkspacePage.tsx` | Markdown notes editor | Auto-saving notes editor | AI Notes Enhancer / Summary / Formatting |
| `NotificationsPage.tsx` | User notification center | Notification item feed | Proactive AI Alert Notifications |

---

## Section 24 — File Map for Future Roadmap Design

### AI Core & Infrastructure
- `server/src/ai/ai.service.ts`: Central AI orchestration service managing execution, fallback, and telemetry.
- `server/src/ai/routing/ai.router.ts`: Deterministic provider routing engine based on model tiers.
- `server/src/ai/providers/provider.factory.ts`: Lazy provider instance construction and fallback mapping.
- `server/src/ai/providers/base.provider.ts`: Abstract base class enforcing provider interface contracts.
- `server/src/ai/providers/gemini.provider.ts`: Google Gemini API integration module.
- `server/src/ai/providers/anthropic.provider.ts`: Anthropic Claude API integration module.
- `server/src/ai/prompts/registry/prompt.registry.ts`: Registry of application prompt definitions.
- `server/src/ai/utils/logger.ts`: Event-driven telemetry and privacy logging module.

### Domain AI Services
- `server/src/services/project-ai.service.ts`: Task breakdown generation service.
- `server/src/services/project-summary-ai.service.ts`: Project progress summary generation service.
- `server/src/services/task-ai.service.ts`: Auto-label generation service.

### Domain Models & Controllers
- `server/src/models/project.model.ts`: Project Mongoose schema and `aiSummary` definition.
- `server/src/models/task.model.ts`: Task Mongoose schema, OCC versioning, and pre-save hooks.
- `server/src/models/activity.model.ts`: Activity audit log schema.
- `server/src/controllers/project.controller.ts`: Express controllers for project endpoints.
- `server/src/controllers/task.controller.ts`: Express controllers for task endpoints.

### Frontend AI Feature Module
- `client/src/features/ai/types/ai.types.ts`: TypeScript DTOs for AI request/response payloads.
- `client/src/features/ai/services/ai.api.ts`: API bindings calling `apiClient`.
- `client/src/features/ai/hooks/useGenerateTasks.ts`: Mutation hook for AI task breakdown.
- `client/src/features/ai/hooks/useGenerateProjectSummary.ts`: Mutation hook for AI project summary.
- `client/src/features/ai/hooks/useGenerateTaskLabels.ts`: Mutation hook for AI task labels.

### Frontend Product Integration
- `client/src/features/projects/components/GenerateTasksDialog.tsx`: Dialog UI for AI task generation.
- `client/src/features/projects/components/ProjectAISummaryCard.tsx`: Card UI for AI project summary rendering.
- `client/src/features/tasks/components/TaskPropertiesPanel.tsx`: Task properties panel hosting AI labels action.
- `client/src/features/dashboard/components/QuickActions.tsx`: Dashboard quick actions hosting Ask AI placeholder.
- `client/src/features/dashboard/components/AIDailyBrief.tsx`: Dashboard hero hosting workspace Ask AI placeholder.

---

## Section 25 — Final Current-State Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       BROWSER / CLIENT SPA                                       │
│                                                                                                  │
│  [ React Components ] ──► [ TanStack Query Hooks ] ──► [ aiApi Module ] ──► [ apiClient Singleton ] │
│  (GenerateTasksDialog)    (useGenerateTasks)           (ai.api.ts)         (axios.ts + Auth JWT) │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼  HTTP POST /api/v1/projects/:id/generate-tasks
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      EXPRESS API SERVER                                          │
│                                                                                                  │
│  [ Auth Middleware ] ──► [ Express Controller ] ──► [ Domain AI Service ]                        │
│  (Verify Bearer JWT)     (project.controller.ts)   (project-ai.service.ts)                        │
│                                                              │                                   │
│                                                              ▼                                   │
│                                                    [ AIService Orchestrator ]                    │
│                                                    (server/src/ai/ai.service.ts)                 │
│                                                              │                                   │
│                          ┌───────────────────────────────────┼────────────────────────────────┐  │
│                          │                                   │                                │  │
│                          ▼                                   ▼                                ▼  │
│                 [ AIRouter Engine ]               [ AIProviderFactory ]             [ AILogger ] │
│                 (Selects Provider)                (Gets/Caches Provider)            (Telemetry)  │
│                          │                                   │                                │  │
│                          └─────────────────┬─────────────────┘                                │  │
│                                            │                                                  │  │
│                                            ▼                                                  │  │
│                                  [ Provider Instance ]                                        │  │
│                             (GeminiProvider / AnthropicProvider)                              │  │
└────────────────────────────────────────────┼───────────────────────────────────────────────────┘
                                             │
                                             ▼  HTTPS External Vendor SDK Request
                             ┌───────────────────────────────┐
                             │    EXTERNAL AI PROVIDERS      │
                             │  - Google Gemini API          │
                             │  - Anthropic Claude API       │
                             └───────────────┬───────────────┘
                                             │
                                             ▼  Validated Structured JSON Response
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   DOMAIN PERSISTENCE & CACHE                                     │
│                                                                                                  │
│  [ AIService Zod Validation ] ──► [ Domain Service ] ──► [ Mongoose Models ] ──► [ MongoDB ]     │
│  (validateAIResponse)             (Creates Tasks)        (Task.create())        (Database)   │
│                                                                                                  │
│  Response ──► [ TanStack Query Invalidation ] ──► UI Automatically Refreshes                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Section 26 — Verified Open Questions for Roadmap Design

1. **Plan Representation**: Should future Planning Engine outputs be persisted immediately as `Task` documents, or stored in a new `DraftPlan` entity for human review?
2. **Dependency Schema**: Should task dependencies be modeled as an embedded array of ObjectIds (`Task.dependencies`) or a separate `TaskDependency` adjacency collection?
3. **Milestone Abstraction**: Should milestones be represented as a dedicated `Milestone` Mongoose model or synthetic task tags?
4. **Evaluation Ordering**: Should evaluation/benchmarking infrastructure be built before or alongside the Copilot feature?
5. **Context Grounding for Copilot**: Is structured MongoDB aggregation sufficient for Copilot v1 context grounding, or is a vector database (RAG) required from the start?
6. **Streaming Architecture**: Should conversational Copilot responses use Server-Sent Events (SSE) or synchronous JSON responses for v1?
7. **Action Safety & Approvals**: What command abstraction and dry-run preview mechanism is required before enabling Controlled AI Actions?
8. **Memory Scope**: Should AI project memory be explicit and user-editable (e.g., Project Instructions) or implicit in chat logs?
9. **Placeholder Activation**: Which future phase should activate the existing "Ask AI" placeholders in `QuickActions.tsx` and `AIDailyBrief.tsx`?
10. **Multi-Task Transactions**: Should bulk task creation be refactored to require MongoDB Replica Set transaction sessions?

---

## Section 27 — Executive Handoff to Roadmap Designer

### 27.1 What Odet-X is Capable of Today
Odet-X possesses a fully functional, multi-provider backend AI subsystem (`AIService`, `AIRouter`, `AIProviderFactory`) supporting Google Gemini and Anthropic Claude. It features automated infrastructure fallback, deterministic model-tier routing, event-driven telemetry with privacy boundaries, and structured Zod schema validation. On the frontend, it has a production-grade React 19 / TanStack Query foundation that cleanly exposes task breakdown generation, project summary generation, and task label auto-generation with zero live AI calls in automated CI testing.

### 27.2 Mature Architectural Foundations
- Multi-provider AI abstraction (`AIProvider`, `GeminiProvider`, `AnthropicProvider`).
- Deterministic routing (`AIRouter`) and fallback policy (`isFallbackEligible`).
- Telemetry & error taxonomy (`AILogger`, `AIBaseError`).
- Centralized HTTP client (`apiClient`) with JWT injection & 401 refresh lock.
- Single source of truth AI feature module (`client/src/features/ai/`).
- Optimistic concurrency control on tasks (`optimisticConcurrency: true`).

### 27.3 Product Capabilities Still Absent
- Multi-step Planning Engine with draft preview.
- Task dependencies, DAG validation, or graph cycle detection.
- Milestones, sprints, or project phases.
- Conversational Copilot / Q&A assistant (placeholders present, backend non-existent).
- Controlled AI Actions (AI mutating task status, archiving, updating fields).
- Vector retrieval / RAG / embeddings pipeline.
- AI evaluation fixtures, LLM-as-judge, or prompt quality scoring.
- Response streaming (SSE / WebSockets).

### 27.4 Invariants the Next Roadmap Must Preserve
- Frontend never receives provider API keys.
- Client never selects concrete providers or models directly.
- All AI responses must be validated via Zod schemas before domain persistence.
- Providers and `AIService` do not write to MongoDB; domain services own persistence.
- Telemetry must never log prompts, model outputs, or credentials.
- Automated CI tests (`npm run verify`) must perform zero live AI requests.
- Server state is owned 100% by TanStack Query; zero AI server state in Zustand.

### 27.5 Key Decisions the Next Roadmap Must Make
- Persistence strategy for generated plans (Immediate vs. Draft entity).
- Dependency schema representation (Embedded array vs. Edge collection).
- Context grounding strategy for Copilot (Structured Mongo aggregation vs. Vector RAG).
- Streaming strategy for chat (Synchronous JSON vs. SSE).
- Action safety controls for Controlled AI Actions (Command pattern + Dry run).

### 27.6 Highest-Risk Future Boundaries (Unranked by Phase Number)
1. **Multi-Entity Task Dependency & Cycle Detection**: High risk of data corruption or infinite loops without robust DAG validation.
2. **Controlled AI Action Execution**: High risk of accidental data mutation without dry-run preview and confirmation boundaries.
3. **Conversational Context Window Management**: High risk of token limit overflow or high latency without context truncation rules.
4. **Vector Retrieval Pipeline Operational Complexity**: High risk of infrastructure complexity if vector DB is added prematurely.

### 27.7 Repository Evidence Confidence Ratings
- **Core AI Architecture (Phases 20–23)**: **HIGH CONFIDENCE** (100% verified via code inspection and passing unit/telemetry test suite).
- **Frontend Integration (Phase 24)**: **HIGH CONFIDENCE** (100% verified via code inspection, passing Vitest suite, and manual browser verification).
- **Domain Models & API Surface**: **HIGH CONFIDENCE** (100% verified via Mongoose schema and Express route inspection).
- **Future Feature Readiness**: **HIGH CONFIDENCE** (Factual absence of planning, dependencies, copilot, vector DB, and eval code verified via codebase-wide grep).
