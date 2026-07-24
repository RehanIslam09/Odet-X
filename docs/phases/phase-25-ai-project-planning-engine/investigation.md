# Phase 25 — AI Project Planning Engine Investigation

> **Phase**: Phase 25 — AI Project Planning Engine
> **Status**: Investigation / Discovery Pass Complete (READ-ONLY)
> **Branch**: `feat/phase-24-frontend-ai-integration`
> **Environment**: Node `v20.20.2` | NPM `10.8.2` | TypeScript `5.9.2` / `6.0.2`
> **Authoritative Baseline**: Codebase state following Phase 24 completion (Commit `4c84c7861731a2f584c99d1a9806cfce9ac72f89`).

---

## 1. Executive Summary

This document presents the comprehensive, repository-grounded architectural investigation for **Phase 25 — AI Project Planning Engine**.

The primary goal of Phase 25 is to transform the existing simple task generator (`POST /projects/:id/generate-tasks`) into a full, production-grade **AI-assisted Project Planning Engine**.

Instead of immediately persisting raw AI task outputs directly into MongoDB without user review, Phase 25 introduces a structured, human-in-the-loop workflow:

```text
Project Context + User Goals
             ↓
AI Plan Generation (AIService + Deep Context Prompt)
             ↓
Structured Plan Validation (Zod Schema)
             ↓
Domain & Dependency Validation (DAG & Cycle Detection)
             ↓
Persisted Draft Plan (PlanDraft Model / Draft State)
             ↓
Interactive Plan Preview & Human Review (Frontend Modal / Workspace)
             ↓
Human Editing (Add/Remove Tasks, Adjust Dependencies, Milestones)
             ↓
Explicit Approval & Commit Action
             ↓
Atomic Commit Service (Tasks + Milestones + Dependencies + Activity Audit Log)
```

This investigation verifies all technical prerequisites, evaluates Mongoose schema changes, analyzes MongoDB transaction constraints, audits current frontend/backend code paths, and defines the work package breakdown for Phase 25.

---

## 2. Repository State

- **Current Branch**: `feat/phase-24-frontend-ai-integration`
- **Head Commit**: `4c84c7861731a2f584c99d1a9806cfce9ac72f89`
- **Working Tree Status**: Clean (0 uncommitted or untracked changes).
- **Node.js**: `v20.20.2`
- **NPM**: `10.8.2`
- **Automated Verification Baseline**: `npm run verify` passes 100% (40/40 client unit tests, 22/22 server tests, 16/16 telemetry tests, 0 lint/typecheck errors, server smoke test passed).

---

## 3. Relevant Existing Architecture

### 3.1 Subsystem Architecture Overview
The repository is structured as a modular TypeScript monorepo (`client/` and `server/`):
- **Server**: Express 5 application (`server/src/app.ts`) utilizing Mongoose 9 ODM for MongoDB persistence.
- **Client**: Vite 8 + React 19 SPA (`client/src/app/`) using TanStack Query 5 for server state management and Zustand 5 for authentication session state (`auth.store.ts`).

### 3.2 Key Multi-Provider AI Infrastructure (Phases 20–23)
- **`AIService` (`server/src/ai/ai.service.ts`)**: Central orchestrator managing attempt timing, prompt construction, Zod response validation, fallback retries, and telemetry logging.
- **`AIRouter` (`server/src/ai/routing/ai.router.ts`)**: Pure, side-effect-free routing engine selecting initial provider targets based on requested `AIModelTier` (`FAST`, `SMART`, `REASONING`) and configured API keys.
- **`AIProviderFactory` (`server/src/ai/providers/provider.factory.ts`)**: Lazily instantiates and caches provider singletons (`GeminiProvider`, `AnthropicProvider`).
- **Prompt Registry (`server/src/ai/prompts/registry/prompt.registry.ts`)**: In-memory registry storing versioned prompt blueprints (`project-tasks`, `project-summary`, `task-labels`).
- **Telemetry (`server/src/ai/utils/logger.ts`)**: Event-driven `AILogger` recording privacy-safe execution metrics.

---

## 4. Current AI Architecture

The exact call flow for all AI requests is strictly uniform:

```text
Frontend Hook (e.g. useGenerateTasks)
      ↓
aiApi Module (client/src/features/ai/services/ai.api.ts)
      ↓
Shared apiClient (client/src/services/axios.ts) [Injects Bearer JWT]
      ↓
Express Route (server/src/routes/project.routes.ts)
      ↓
Express Controller (server/src/controllers/project.controller.ts)
      ↓
Domain AI Service (server/src/services/project-ai.service.ts)
      ↓
AIService.generateStructuredData (server/src/ai/ai.service.ts)
      │
      ├──► AIRouter.selectInitialProvider({ tier }) ──► Attempt 1 Provider
      ├──► AIProviderFactory.getProvider(providerName)
      ├──► Provider.generateStructured(prompt, schema, options)
      ├──► validateAIResponse(data, schema) ──► Validates via Zod
      └──► (On infrastructure failure) Fallback Policy ──► Attempt 2 Alternate Provider
      ↓
Domain AI Service (Applies domain filtering, deduplication, & Mongoose mutations)
      ↓
Express Controller (Returns HTTP 201 JSON response envelope)
```

---

## 5. Current Generate-Tasks End-to-End Flow

The 18 specific questions regarding the existing task generation flow:

1. **Frontend Initiation**: User clicks "Generate Tasks" in `ProjectTasks.tsx` $\rightarrow$ opens `GenerateTasksDialog.tsx`.
2. **Mutation Hook**: `useGenerateTasks(projectId)` (`client/src/features/ai/hooks/useGenerateTasks.ts`).
3. **API Module**: `aiApi.generateTasks(projectId, { description })` (`client/src/features/ai/services/ai.api.ts`).
4. **Backend Endpoint**: `POST /api/v1/projects/:id/generate-tasks` (`server/src/routes/project.routes.ts`).
5. **Controller**: `generateTasks` in `server/src/controllers/project.controller.ts`.
6. **AI Service**: `generateTasksForProject` in `server/src/services/project-ai.service.ts`.
7. **Prompt Registry Entry**: `project-to-tasks` blueprint (`server/src/ai/prompts/definitions/project-tasks.prompt.ts`).
8. **Zod Validation Schema**: `GenerateTasksResponseSchema` (`server/src/ai/schemas/project-tasks.schema.ts`).
9. **Generated Payload Structure**: `{ tasks: Array<{ title, description, priority, estimatedTime, suggestedOrder }> }`.
10. **Persistence Location**: MongoDB `tasks` collection via Mongoose `Task` model.
11. **Bulk/Individual Execution**: `generateTasksForProject` loops sequentially: `for (const taskData of validTasksToCreate) { await createTask(userId, taskData); }`.
12. **Halfway Failure Behavior**: No transaction wrapper exists. If task 3 of 5 fails, tasks 1 and 2 remain saved in MongoDB.
13. **Generation & Persistence Coupling**: **100% Coupled.** Generation immediately triggers persistence in the same request.
14. **Activity Records Created**: `createTask()` calls `recordActivity()` for each task, creating `TASK_CREATED` activity log documents.
15. **Ownership Checks**: `assertProjectOwnership(projectId, userId)` validates project existence, deletion status (`isDeleted: false`), and user ownership (`owner: userId`).
16. **Task Limits**: AI prompt requests a concise task list; domain code filters titles $> 120$ characters and deduplicates against existing titles.
17. **Validation Before Persistence**: Titles are trimmed, validated for length, deduplicated against existing database task titles, and deduplicated within the AI response array.
18. **Failure Handling**: Errors return standard API error envelopes. The frontend dialog stays open, preserves textarea text, and displays the error message via `getApiError(error)`.

---

## 6. Project Domain Findings

*(Source: `server/src/models/project.model.ts`)*

- **Fields**: `id`, `owner` (ObjectId ref User), `name`, `description`, `emoji`, `color`, `archived` (boolean), `isDeleted` (boolean), `aiSummary` (`{ summary, highlights, risks }`), `createdAt`, `updatedAt`.
- **Indexes**: Compound index `{ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 }`.
- **Optimistic Concurrency**: None configured on `Project` (only on `Task`).
- **Context Available to Planning**: `name`, `description`, existing task list titles/statuses, and existing `aiSummary`.
- **Missing Planning Fields**: Zero `objective`, `milestone`, `planningState`, `deadline`, or `planningMetadata` fields exist on `Project`.

---

## 7. Task Domain Findings

*(Source: `server/src/models/task.model.ts`)*

- **Fields**: `id`, `owner` (ObjectId ref User), `projectId` (ObjectId ref Project), `title`, `description`, `notes` (markdown string), `status` (`todo`, `in_progress`, `done`), `priority` (`none`, `low`, `medium`, `high`, `urgent`), `dueDate`, `estimatedTime`, `labels` (string array), `completedAt`, `archived`, `isDeleted`, `createdAt`, `updatedAt`, `version` (`__v` via OCC).
- **Optimistic Concurrency**: Configured with `optimisticConcurrency: true`.
- **Domain Model Audit**:
  - Task Dependencies? **NOT FOUND.**
  - Deterministic Task Ordering (`position`)? **NOT FOUND.**
  - Milestone Membership (`milestoneId`)? **NOT FOUND.**
  - Parent / Child Tasks? **NOT FOUND.**
  - Blockers / Impediments? **NOT FOUND.**

---

## 8. Task Creation & Persistence Findings

- Manual task creation (`createTask` in `server/src/services/task.service.ts`) creates a single `Task` document and logs a `TASK_CREATED` `Activity`.
- AI task generation (`generateTasksForProject` in `server/src/services/project-ai.service.ts`) iterates over generated task payloads and calls `createTask()` sequentially.
- Bulk helper `recordActivities` in `activity.service.ts` supports `Activity.insertMany(docs, { ordered: false })`, but task creation currently operates item-by-item.

---

## 9. MongoDB Transaction Findings

- **MongoDB Config (`server/src/config/database.ts`)**: Standard single-server connection `mongoose.connect(env.MONGODB_URI)`.
- **Test DB (`server/src/tests/test-db.ts`)**: Standard local MongoDB instance `mongodb://127.0.0.1:27017/ai-project-manager-test`.
- **Transaction Search**: Zero `startSession()`, `withTransaction()`, or Mongoose transaction sessions exist anywhere in `server/src/`.
- **Standalone vs Replica Set Constraints**: Standalone MongoDB instances do **not** support multi-document transactions (`MongoServerError: Transaction numbers are only allowed on a replica set member or mongos`).
- **Phase 25 Implication**: Hard-requiring Mongo transactions would break local development and offline test execution. Phase 25 should implement an application-level failure-safe commit pattern with compensation or optional transaction support when replica sets are available.

---

## 10. Activity / Audit Findings

- **Activity Model (`server/src/models/activity.model.ts`)**: Append-only log supporting `owner`, `actorId`, `type`, `entityType`, `entityId`, `projectId`, `contextProjectIds`, `taskId`, `metadata`.
- **Current Activity Types (`server/src/constants/activity.ts`)**: `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_ARCHIVED`, `PROJECT_DELETED`, `TASK_CREATED`, `TASK_UPDATED`, `TASK_STATUS_CHANGED`, `TASK_ARCHIVED`, `TASK_DELETED`, `AI_TASKS_GENERATED`, `AI_SUMMARY_GENERATED`, `AI_LABELS_GENERATED`.
- **Readiness for Phase 25**: Easily supports new event types: `AI_PLAN_GENERATED`, `AI_PLAN_COMMITTED`, `AI_PLAN_DISCARDED`.

---

## 11. Frontend Workspace Findings

- **Location**: `ProjectDetailPage.tsx` host workspace; `ProjectTasks.tsx` manages task toolbar, task list, and `GenerateTasksDialog`.
- **Recommended Planning Surface**: A dedicated `PlanProjectDialog` modal or dedicated Planning Workspace tab within `ProjectDetailPage.tsx`.
- **Rationale**: Evolving `GenerateTasksDialog` into a full plan review experience would overload a simple prompt modal. A dedicated planning workspace/modal provides space for interactive preview, dependency graph visualization, milestone grouping, and human review before committing.

---

## 12. Frontend State Ownership Findings

- **Server State**: Owned 100% by TanStack Query.
- **Client Session State**: Owned 100% by Zustand (`auth.store.ts`).
- **Form & Ephemeral State**: React Hook Form + local React `useState`.
- **Draft Plan Representation**: Server-persisted `PlanDraft` document fetched via TanStack Query (`usePlanDraft(projectId)`). Local changes during editing are managed via React Hook Form / local state before calling mutation hooks (`useCommitPlan`, `useUpdatePlanDraft`).

---

## 13. Authorization Findings

- **Middleware**: `auth.middleware.ts` verifies JWT Bearer tokens and attaches `req.user`.
- **Service Level**: Domain services enforce `owner: new Types.ObjectId(userId)` on all database queries.
- **Planning Authorization Flow**:
  - `POST /api/v1/projects/:id/plan` $\rightarrow$ verifies user owns `projectId`.
  - `GET /api/v1/projects/:id/plan/draft` $\rightarrow$ verifies user owns `projectId` and `draftId`.
  - `POST /api/v1/projects/:id/plan/commit` $\rightarrow$ verifies user owns `projectId` and `draftId` before writing tasks.

---

## 14. Validation Findings

- **Layer 1 (HTTP Request)**: Zod validators in `server/src/validators/`.
- **Layer 2 (AI Structured Output)**: Zod schemas in `server/src/ai/schemas/` validated via `validateAIResponse` in `AIService`.
- **Layer 3 (Domain Plan Validation)**: Dedicated Domain Plan Validator (`server/src/domain/plan-validator.ts`) validating DAG rules, cycle detection, reference integrity, and date constraints.
- **Layer 4 (Mongoose Schema)**: Schema field types, enums, string max lengths, and OCC versioning.

---

## 15. Dependency / Graph Findings

- **Grep Search Results**: Zero dependency fields, DAG structures, topological sort functions, or cycle detection utilities exist in the repository today.
- **Required Utility**: A pure, standalone Directed Acyclic Graph (DAG) validator utility (`server/src/domain/plan-validator.ts` or `server/src/utils/dag-validator.ts`) utilizing topological sort (Kahn's algorithm) or Depth-First Search (DFS) node coloring.

---

## 16. Task Ordering Findings

- Tasks are currently sorted by `updatedAt DESC` or `dueDate ASC`. No `position` or `order` integer field exists on the `Task` model.
- **Phase 25 Requirement**: Add `position: number` (integer starting at 1) to `Task` model for deterministic plan ordering.

---

## 17. Milestone Findings

- Zero `Milestone` Mongoose models exist.
- **Recommendation**: Create a first-class `Milestone` Mongoose model (`owner`, `projectId`, `title`, `description`, `targetDate`, `position`) and reference it via `milestoneId?: Types.ObjectId` on `Task`.

---

## 18. Prompt Architecture Findings

- `promptRegistry` manages prompt blueprints.
- **Recommendation**: Create a dedicated new prompt blueprint `project-planning.prompt.ts` (`project-plan` in registry) rather than overloading `project-tasks.prompt.ts`. This allows explicit generation of task dependencies, ordering, and milestones.

---

## 19. AI Size / Context Limits

- AI requests use `AIModelTier.DEEP_CONTEXT` (`gemini-2.5-pro` / `claude-3-5-sonnet-20241022`).
- Default execution timeout: 30,000ms (30 seconds).
- **Recommended Plan Limits**:
  - Maximum generated tasks per plan: **25 tasks**.
  - Maximum milestones per plan: **5 milestones**.
  - Maximum user requirement prompt length: **2,000 characters**.

---

## 20. Testing Architecture Findings

- Server tests run offline using Node test runner against local Mongoose test database.
- Client tests run offline using Vitest + React Testing Library + `axios-mock-adapter`.
- Zero live AI calls policy is strictly enforced.
- **Phase 25 Test Coverage Plan**:
  - Unit tests for DAG cycle detection & plan validator (valid DAG, self-cycle, transitive cycle, missing tempId reference).
  - Unit tests for `PlanDraft` model & schema validation.
  - Integration tests for `POST /projects/:id/plan` draft generation (mocked `AIService`).
  - Integration tests for `POST /projects/:id/plan/commit` atomic commit.
  - Component unit tests for frontend Plan Review modal.

---

## 21. Answers to the 15 Roadmap Questions

1. **What constitutes a valid project plan?** An authorized project context containing an optional objective, an array of structured tasks with temporary IDs (`tempId`), titles, descriptions, priorities, estimates, positions, valid `dependencies` forming a acyclic DAG, and optional `milestones` with valid target dates.
2. **Which planning concepts belong in the permanent domain model?** `Task.dependencies` (array of task ObjectIds), `Task.position` (integer), `Task.milestoneId` (optional ObjectId), `Milestone` model, and `PlanDraft` collection.
3. **Should draft plans persist in MongoDB?** **YES.** A persisted `PlanDraft` collection allows multi-session review, editing, and offline preservation across page refreshes.
4. **How should task dependencies be represented?** As an embedded array of ObjectIds (`dependencies: Types.ObjectId[]`) on the `Task` model with a multikey index.
5. **How should dependency cycles be detected?** By a pure topological sort / DFS cycle detection validator in `server/src/domain/plan-validator.ts`.
6. **Should milestones become first-class entities in Phase 25?** **YES.** Dedicated `Milestone` Mongoose model.
7. **How should deterministic task ordering work?** `position: number` field on `Task` sorted `position ASC`.
8. **How should temporary AI-generated IDs map to MongoDB IDs?** `PlanCommitService` constructs a `Map<string, Types.ObjectId>` (`tempId` $\rightarrow$ real ObjectId) before bulk database insertion.
9. **What should happen if plan commitment partially fails?** The commit service executes pre-validation to guarantee document validity, and cleans up inserted documents upon failure if non-transactional.
10. **Can the CURRENT MongoDB environment support transactions?** **NO.** Standalone local MongoDB instances throw errors on `startSession()`. Commit logic must work safely without requiring MongoDB replica set transactions.
11. **What should happen to the existing `generate-tasks` capability?** Preserve it for backward compatibility; internally route simple task generation through the new task creation service.
12. **Evolve `GenerateTasksDialog` or create a dedicated surface?** Create a dedicated `PlanProjectDialog` / `ProjectPlannerModal` surface.
13. **What plan size limits should exist?** Max 25 tasks, max 5 milestones, max 2,000 prompt characters.
14. **Which planning data can users edit before approval?** Task titles, descriptions, priorities, estimates, positions, dependencies, milestone dates, task additions/deletions.
15. **Which activity/audit events should planning create?** `AI_PLAN_GENERATED`, `AI_PLAN_COMMITTED`, `AI_PLAN_DISCARDED`.

---

## 22. Additional Architectural Questions

- **Stale Draft Handling**: Add `expiresAt: Date` (e.g. 7 days TTL index) to `PlanDraft` collection.
- **Concurrent Project Edits**: Verify project ownership and archival state when committing a plan.

---

## 23. Recommended Phase 25 Architecture

### 23.1 Draft Plan Generation Flow
```text
POST /api/v1/projects/:projectId/plan
           ↓
assertProjectOwnership(projectId, userId)
           ↓
Load Project Context & Existing Tasks
           ↓
AIService.generateStructuredData(projectPlanPrompt, ProjectPlanResponseSchema)
           ↓
Validate Raw Output via Zod
           ↓
Domain Plan Validator (Validate DAG & Cycle Detection)
           ↓
Save to PlanDraft Collection (status: "draft")
           ↓
Log AI_PLAN_GENERATED Activity
           ↓
Return PlanDraft JSON to Client
```

### 23.2 Plan Commit Flow
```text
POST /api/v1/projects/:projectId/plan/commit
           ↓
assertProjectOwnership(projectId, userId)
           ↓
Fetch PlanDraft (verify status === "draft" or payload review)
           ↓
Validate Final Plan State (DAG Check + Field Schemas)
           ↓
PlanCommitService:
  1. Generate real ObjectIds for all Milestones & Tasks.
  2. Map tempId → ObjectId in dependencies and milestoneId references.
  3. Insert Milestones (Milestone.insertMany).
  4. Insert Tasks (Task.insertMany).
  5. Update PlanDraft (status: "committed").
           ↓
Log AI_PLAN_COMMITTED Activity
           ↓
Return Created Tasks & Milestones JSON Envelope
```

---

## 24. Recommended Data Model

### 24.1 `PlanDraft` Model (`server/src/models/plan-draft.model.ts`)
```typescript
export interface IPlanDraftTask {
  tempId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  estimatedTime: string | null;
  position: number;
  dependencies: string[]; // references tempId of other tasks in draft
  milestoneTempId: string | null;
}

export interface IPlanDraftMilestone {
  tempId: string;
  title: string;
  description: string;
  targetDate: Date | null;
  position: number;
}

export interface IPlanDraft {
  owner: Types.ObjectId;
  projectId: Types.ObjectId;
  status: "draft" | "committed" | "discarded";
  promptDescription: string;
  tasks: IPlanDraftTask[];
  milestones: IPlanDraftMilestone[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 24.2 `Milestone` Model (`server/src/models/milestone.model.ts`)
```typescript
export interface IMilestone {
  owner: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description: string;
  targetDate: Date | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 24.3 `Task` Model Extension (`server/src/models/task.model.ts`)
```typescript
// New fields added to ITask interface:
dependencies: Types.ObjectId[]; // Array of prerequisite Task IDs
position: number;               // Deterministic order integer
milestoneId: Types.ObjectId | null; // Optional reference to Milestone
```

---

## 25. Recommended API Surface

- `POST /api/v1/projects/:id/plan` $\rightarrow$ Generates AI draft plan and saves `PlanDraft`.
- `GET /api/v1/projects/:id/plan/draft` $\rightarrow$ Retrieves active `PlanDraft` for project.
- `PATCH /api/v1/projects/:id/plan/draft` $\rightarrow$ Updates draft plan task/dependency edits.
- `POST /api/v1/projects/:id/plan/commit` $\rightarrow$ Validates DAG and commits draft tasks/milestones to MongoDB.
- `DELETE /api/v1/projects/:id/plan/draft` $\rightarrow$ Discards draft plan.

---

## 26. Recommended Frontend Architecture

- **Feature Directory**: `client/src/features/planning/`
  - `types/planning.types.ts`
  - `services/planning.api.ts`
  - `hooks/useGeneratePlan.ts`, `usePlanDraft.ts`, `useCommitPlan.ts`
  - `components/PlanProjectDialog.tsx` (Interactive review modal)
  - `components/DependencyGraphPreview.tsx` (Visual DAG/dependency list)
  - `components/MilestoneSection.tsx`

---

## 27. Recommended Work Packages

- **Gate 1**: Planning Engine Contract & Governance Approval
- **WP-01**: Planning Domain Foundation & Schema Extensions (`Task` dependencies/position, `Milestone` model, `PlanDraft` model, DAG Validator).
- **WP-02**: AI Plan Generation Subsystem (Prompt blueprint, Zod AI response schema, `ProjectPlanningAIService`).
- **WP-03**: Plan Commitment & Audit Service (`PlanCommitService`, ID mapper, activity logging).
- **WP-04**: Backend API Routes & Controllers (Express routes, controllers, integration tests).
- **WP-05**: Frontend Planning Experience (`client/src/features/planning/`, `PlanProjectDialog`, TanStack Query hooks, UI tests).
- **Gate 2**: Implementation Review & Final Verification

---

## 28. Expected File Impact Map

### NEW FILES
- `server/src/models/milestone.model.ts`
- `server/src/models/plan-draft.model.ts`
- `server/src/domain/plan-validator.ts`
- `server/src/services/plan-commit.service.ts`
- `server/src/services/project-planning-ai.service.ts`
- `server/src/ai/prompts/definitions/project-planning.prompt.ts`
- `server/src/ai/schemas/project-planning.schema.ts`
- `server/src/routes/planning.routes.ts`
- `server/src/controllers/planning.controller.ts`
- `server/src/tests/plan-validator.test.ts`
- `server/src/tests/planning.test.ts`
- `client/src/features/planning/types/planning.types.ts`
- `client/src/features/planning/services/planning.api.ts`
- `client/src/features/planning/hooks/useGeneratePlan.ts`
- `client/src/features/planning/hooks/useCommitPlan.ts`
- `client/src/features/planning/components/PlanProjectDialog.tsx`
- `client/src/features/planning/components/planning.ui.test.tsx`

### MODIFIED FILES
- `server/src/models/task.model.ts` (Add `dependencies`, `position`, `milestoneId`).
- `server/src/constants/activity.ts` (Add `AI_PLAN_GENERATED`, `AI_PLAN_COMMITTED`, `AI_PLAN_DISCARDED`).
- `server/src/routes/index.ts` (Register planning routes).
- `server/src/ai/prompts/registry/prompt.registry.ts` (Register `project-planning` prompt).
- `client/src/features/projects/components/ProjectTasks.tsx` (Add "Plan Project with AI" button).
- `client/src/features/tasks/types/tasks.types.ts` (Add `dependencies`, `position`, `milestoneId`).

---

## 29. Risk Register

| Risk | Severity | Cause | Consequence | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Dependency Cycle** | **HIGH** | AI or user introduces circular dependency | Infinite UI loops or invalid execution order | Mandatory DAG validation via `PlanValidator` before saving draft or committing |
| **Partial Bulk Commit Failure** | **MEDIUM**| Standalone Mongo lacks multi-document transactions | Orphaned tasks if commit fails midway | Pre-validate all documents before insertion; use clean sequential compensation if insertion fails |
| **Invalid TempId References** | **HIGH** | AI references non-existent `tempId` | Unhandled lookup error during ID translation | Strict reference integrity check in `PlanValidator` |
| **Stale Draft Plans** | **LOW** | User abandons draft plan | Database clutter in `PlanDraft` collection | 7-day TTL index on `PlanDraft.expiresAt` |

---

## 30. Blockades / Experiments Required

- **None.** The repository analysis has confirmed that Phase 25 can proceed cleanly without external prototypes or blockades.

---

## 31. Phase 25 Non-Goals

- NO generic chat or conversational assistant.
- NO vector database or RAG infrastructure.
- NO autonomous AI task execution without human approval.
- NO multi-user team permissions / RBAC.
- NO Server-Sent Events (SSE) or WebSocket streaming.

---

## 32. Proposed Exit Criteria

- AI generates structured project plans with tasks, dependencies, positions, and milestones.
- Generated plans persist as `PlanDraft` for human review prior to task creation.
- Dependency cycle validation prevents circular dependencies from entering MongoDB.
- Human review UI allows editing tasks, dependencies, and milestones before committing.
- Commit action atomically creates `Task` and `Milestone` documents and updates `PlanDraft` status.
- Automated test suite executes with zero live AI calls.
- `npm run verify` passes 100%.

---

## 33. Open Decisions Requiring Approval

1. Approval of `PlanDraft` collection model for human-in-the-loop review.
2. Approval of `Task.dependencies` embedded ObjectId array representation.
3. Approval of first-class `Milestone` Mongoose model.
4. Approval of `PlanProjectDialog` modal frontend surface.

---

## 34. Final Recommendation

Proceed to **Phase 25 — Gate 1 (Contract & Governance Approval)** using the architectural findings and work package plan defined in this investigation document.
