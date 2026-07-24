# Phase 25 — AI Project Planning Engine Contract

> **Phase**: Phase 25 — AI Project Planning Engine
> **Governance Level**: Level A — Critical Architecture Phase (Contract & Governance Gate)
> **Status**: APPROVED CONTRACT (Gate 1 Passed)
> **Branch**: `feat/phase-25-ai-project-planning-engine`
> **Target Release**: Odet-X v1.2.0

---

## 1. Phase Objective
The objective of Phase 25 is to transform the existing simple AI task generator into a production-grade, human-in-the-loop **AI Project Planning Engine**. It introduces structured plan generation, Directed Acyclic Graph (DAG) task dependency validation, deterministic ordering, first-class milestones, draft plan persistence (`PlanDraft`), interactive frontend plan review, and an atomic commit service.

---

## 2. Problem Statement
In Phase 24, requesting AI task generation immediately created permanent `Task` documents in MongoDB without prior human preview, editing, or approval. Furthermore, the domain model lacked task dependencies, task ordering, milestones, and plan validation. Phase 25 resolves these limitations by introducing a strict boundary between AI generation, draft review, and permanent domain mutation.

---

## 3. Current Baseline
- **Backend**: Express 5 + Mongoose 9 + Node.js 20. `AIService`, `AIRouter`, and `AIProviderFactory` provide multi-provider AI execution (Gemini / Anthropic) with Zod schema validation and privacy-safe telemetry.
- **Frontend**: React 19 + TanStack Query 5 + Zustand 5 + React Hook Form + Zod + TailwindCSS + shadcn/ui.
- **Verification Policy**: 100% offline automated test suite executing zero live AI requests.

---

## 4. Product Definition of a Project Plan
A valid, reviewable, and committable Odet-X Project Plan MUST consist of:
1. An authorized `projectId` and `owner` (User ID).
2. An optional prompt description and AI-generated objective text.
3. A structured collection of proposed tasks, each containing a unique temporary string identifier (`tempId`), title, description, priority (`none`, `low`, `medium`, `high`, `urgent`), estimated time, position (integer $\ge 1$), milestone assignment (`milestoneTempId`), and an array of prerequisite task dependencies (`dependencies`).
4. An optional collection of proposed milestones, each containing a unique `tempId`, title, description, target date, and position.
5. **DAG Invariant**: The task dependency graph MUST form a valid Directed Acyclic Graph (DAG) with zero circular or self-referential dependencies.
6. **Reference Integrity**: All referenced `dependencies` and `milestoneTempId` values MUST exist within the plan's temporary ID map.

---

## 5. Planning Lifecycle
The planning subsystem MUST enforce the following strict 9-step lifecycle:

```text
1. User Requirements Prompt
            ↓
2. AI Structured Generation (AIService + Deep Context Tier)
            ↓
3. Zod Response Schema Validation (AI Response Layer)
            ↓
4. Domain Plan & DAG Validation (Domain Plan Validator)
            ↓
5. Draft Persistence (PlanDraft Mongoose Model, status: "draft")
            ↓
6. Interactive Human Review & Editing (Frontend Modal / Workspace)
            ↓
7. Pre-Commit Validation (Final DAG & Ownership Check)
            ↓
8. Atomic Commit Action (PlanCommitService translates tempIds → ObjectIds)
            ↓
9. Permanent Mutation & Audit (Task & Milestone Creation + Activity Log)
```

**Core Safety Invariant**: AI generation MUST NEVER directly mutate permanent `Task` or `Milestone` records. Permanent project state changes occur ONLY upon explicit, authenticated human commit.

---

## 6. PlanDraft Contract
Draft plans MUST be persisted in MongoDB using a dedicated `PlanDraft` collection (`server/src/models/plan-draft.model.ts`).

### Conceptual Schema Fields
- `owner`: `Schema.Types.ObjectId` (ref `User`, required, indexed).
- `projectId`: `Schema.Types.ObjectId` (ref `Project`, required, indexed).
- `status`: String enum (`"draft"`, `"committed"`, `"discarded"`, required, default `"draft"`).
- `promptDescription`: String (required, max 2000 chars).
- `tasks`: Array of `PlanDraftTask` objects.
- `milestones`: Array of `PlanDraftMilestone` objects.
- `expiresAt`: Date (required, indexed for TTL cleanup).
- `createdAt`: Date (managed by Mongoose).
- `updatedAt`: Date (managed by Mongoose).

---

## 7. Draft Cardinality & Lifecycle
- **Cardinality Invariant**: A project MUST have at most **ONE active draft plan** (`status: "draft"`) at any given time.
- **Replacement Behavior**: Requesting a new AI plan generation for a project that already possesses an active draft MUST automatically set the existing active draft's status to `"discarded"` before persisting the new draft.
- **Allowed States**: `"draft"`, `"committed"`, `"discarded"`.

---

## 8. Draft Task Contract
Each task inside a `PlanDraft` payload MUST adhere to:
- `tempId`: String (required, unique within draft, e.g. `"temp_task_1"`).
- `title`: String (required, 1–120 chars).
- `description`: String (default `""`, max 2000 chars).
- `priority`: Enum string (`"none"`, `"low"`, `"medium"`, `"high"`, `"urgent"`, default `"none"`).
- `estimatedTime`: String or null (max 50 chars).
- `position`: Number (integer $\ge 1$, required).
- `dependencies`: Array of strings (array of prerequisite task `tempId` values, default `[]`).
- `milestoneTempId`: String or null (optional reference to a milestone `tempId` in the same draft).

---

## 9. Draft Milestone Contract
Each milestone inside a `PlanDraft` payload MUST adhere to:
- `tempId`: String (required, unique within draft, e.g. `"temp_ms_1"`).
- `title`: String (required, 1–120 chars).
- `description`: String (default `""`, max 1000 chars).
- `targetDate`: Date string or null.
- `position`: Number (integer $\ge 1$, required).

---

## 10. Permanent Task Dependency Contract
The `Task` Mongoose model (`server/src/models/task.model.ts`) MUST be extended with:
```typescript
dependencies: Types.ObjectId[]; // Array of prerequisite Task IDs
position: number;               // Deterministic order integer
milestoneId: Types.ObjectId | null; // Optional reference to Milestone
```
- **Index**: A compound multikey index `{ owner: 1, dependencies: 1 }` MUST be created to optimize prerequisite graph lookups.

---

## 11. Dependency Edge Semantics
- **Prerequisite Definition**: `Task B.dependencies = [Task A]` MUST mean strictly that **Task B depends on Task A** (Task A is a prerequisite for Task B; Task A MUST precede Task B).
- **Project Boundary**: All dependency edges in Phase 25 MUST be project-local. Cross-project dependencies are strictly FORBIDDEN.

---

## 12. DAG & Reference Integrity Rules
The `PlanValidator` utility (`server/src/domain/plan-validator.ts`) MUST enforce:
1. **Self-Dependency Prohibition**: A task MUST NOT depend on itself (`task.tempId` $\notin$ `task.dependencies`).
2. **Normalized Duplicates**: Duplicate dependency entries MUST be deduplicated.
3. **Reference Integrity**: Every `tempId` listed in `dependencies` MUST exist in the draft's task list.
4. **Milestone Integrity**: Every `milestoneTempId` listed MUST exist in the draft's milestone list (or be null).
5. **Cycle Detection**: The dependency graph MUST be validated using Kahn's topological sort algorithm or Depth-First Search (DFS) node coloring. Any cycle (e.g. $A \rightarrow B \rightarrow A$ or $A \rightarrow B \rightarrow C \rightarrow A$) MUST cause validation to fail with a `BadRequestError`.

---

## 13. Task Ordering Contract
- Tasks MUST feature an explicit `position: number` (integer starting at 1).
- Mongoose queries and frontend views SHOULD sort tasks by `position ASC` as the primary sort key.
- Reordering tasks on the frontend draft editor MUST update `position` values sequentially.

---

## 14. Milestone Domain Contract
A new first-class `Milestone` Mongoose model MUST be created (`server/src/models/milestone.model.ts`):
- `owner`: ObjectId (ref User, required, indexed).
- `projectId`: ObjectId (ref Project, required, indexed).
- `title`: String (required, max 120 chars).
- `description`: String (default `""`, max 1000 chars).
- `targetDate`: Date or null.
- `position`: Number (integer $\ge 1$, required).
- `isDeleted`: Boolean (default `false`).
- `timestamps`: `createdAt`, `updatedAt`.

---

## 15. AI Output Authority Boundary
- **AI Controls**: Title, description, priority, estimatedTime, suggestedOrder, suggestedDependencies (`tempId` array), and suggestedMilestones.
- **Server Controls (AI Forbidden)**: Permanent MongoDB ObjectIds, User owner IDs, Project IDs, Activity actor IDs, Commit status, DB timestamps, and JWT security context. Server re-generates and validates all temporary IDs.

---

## 16. Human Review & Edit Contract
Before committing a draft plan, the human user MUST be able to edit:
1. Task titles, descriptions, priorities, estimated times, and positions.
2. Task dependency connections (adding or removing prerequisites).
3. Milestone assignments, titles, descriptions, and target dates.
4. Adding new tasks or removing AI-generated tasks.
5. Adding new milestones or removing AI-generated milestones.

Edits are validated against `PlanValidator` upon submission to `PATCH /api/v1/projects/:projectId/plans/draft`.

---

## 17. Plan Validation Layers
1. **HTTP Layer**: Zod validator schemas for request bodies.
2. **AI Output Layer**: Zod response schema (`GeneratePlanResponseSchema`) validated via `validateAIResponse`.
3. **Domain Layer**: `PlanValidator` enforcing DAG cycle detection, reference integrity, and plan cardinality.
4. **Persistence Layer**: Mongoose schema types, enums, string max lengths, and OCC versioning.

---

## 18. Commit Semantics
`PlanCommitService.commitPlan` (`server/src/services/plan-commit.service.ts`) MUST execute the following atomic sequence:
1. Authorize user ownership of `projectId` and `draftId`.
2. Assert `draft.status === "draft"` and `draft.expiresAt > new Date()`.
3. Perform final structural and DAG validation on draft payload.
4. Allocate real `Types.ObjectId` instances for all milestones and tasks in the draft.
5. Construct a translation map (`tempId` $\rightarrow$ `ObjectId`).
6. Translate all task `dependencies` arrays and `milestoneId` references using the translation map.
7. Insert `Milestone` documents (`Milestone.insertMany`).
8. Insert `Task` documents (`Task.insertMany`).
9. Update draft status to `"committed"` (`status: "committed"`).
10. Record `AI_PLAN_COMMITTED` activity log.
11. Return created tasks, milestones, and summary metrics.

---

## 19. Partial Failure / Compensation Contract
In standalone MongoDB environments lacking multi-document replica set transactions:
- `PlanCommitService` MUST execute pre-commit dry-run validation guaranteeing 100% Mongoose schema validity across all documents before performing database writes.
- If an unexpected database driver failure occurs during bulk insertion, the service MUST execute application compensation (cleaning up inserted milestones/tasks for that commit attempt) and return an HTTP 500 error.
- **Invariant**: A failed commit attempt MUST NEVER leave a `PlanDraft` marked as `"committed"`.

---

## 20. Idempotency Contract
- Submitting a commit request for an already committed draft (`status: "committed"`) MUST return an HTTP 400 `BadRequestError` (*"Draft plan has already been committed."*).
- Submitting a commit request for a discarded or expired draft MUST return an HTTP 400 `BadRequestError`.

---

## 21. Activity & Audit Contract
Three new activity types MUST be registered in `server/src/constants/activity.ts`:
- `AI_PLAN_GENERATED`: Metadata `{ draftId, taskCount, milestoneCount, durationMs }`.
- `AI_PLAN_COMMITTED`: Metadata `{ draftId, committedTaskCount, committedMilestoneCount }`.
- `AI_PLAN_DISCARDED`: Metadata `{ draftId }`.
- **Privacy Boundary**: Activity metadata MUST NEVER contain raw prompts, raw model outputs, or credentials.

---

## 22. Authorization Contract
- All planning routes MUST require authentication via `auth.middleware.ts`.
- Service functions MUST assert `owner: req.user._id` for both project and draft records. Accessing a draft belonging to another user or project MUST return HTTP 404 `NotFoundError`.

---

## 23. Draft Expiration Contract
- `PlanDraft` documents MUST include `expiresAt: Date` set to 7 days from creation (`Date.now() + 7 * 24 * 60 * 60 * 1000`).
- Mongoose TTL index `{ expiresAt: 1 }` with `{ expireAfterSeconds: 0 }` SHOULD be set on `PlanDraft`.
- Service logic MUST explicitly check `draft.expiresAt < new Date()` and reject requests on expired drafts.

---

## 24. Concurrency / Stale Context Contract
- During commit, `PlanCommitService` MUST re-verify that the parent `Project` exists, is not soft-deleted (`isDeleted: false`), and is not archived (`archived: false`).
- If the project was archived or deleted while the draft was being reviewed, commit MUST be rejected with HTTP 400 `BadRequestError`.

---

## 25. Existing Generate Tasks Compatibility
- The existing `POST /api/v1/projects/:id/generate-tasks` endpoint and `GenerateTasksDialog` UI MUST remain fully operational for backward compatibility.
- Phase 24 single-step task generation and Phase 25 multi-step plan generation coexist without conflict.

---

## 26. Backend API Contract
- `POST /api/v1/projects/:projectId/plans` $\rightarrow$ Generates AI draft plan, saves `PlanDraft`, returns `PlanDraft`.
- `GET /api/v1/projects/:projectId/plans/draft` $\rightarrow$ Fetches active `PlanDraft` for project.
- `PATCH /api/v1/projects/:projectId/plans/draft` $\rightarrow$ Saves user edits to active `PlanDraft`.
- `POST /api/v1/projects/:projectId/plans/draft/commit` $\rightarrow$ Validates DAG and commits draft tasks/milestones to MongoDB.
- `DELETE /api/v1/projects/:projectId/plans/draft` $\rightarrow$ Discards active `PlanDraft`.

---

## 27. Frontend Architecture Contract
- Feature module located at `client/src/features/planning/`.
- UI interactions hosted inside `PlanProjectDialog.tsx` (dedicated interactive modal using existing shadcn `Dialog`, `Button`, `Badge`, `Card`, `Textarea`, `ScrollArea`, `Tabs` primitives).
- TanStack Query owns 100% of planning server state (`usePlanDraft`, `useGeneratePlan`, `useCommitPlan`, `useDiscardPlan`).

---

## 28. State Ownership Contract
- Server state (`PlanDraft`, `Task`, `Milestone`) MUST be managed by TanStack Query.
- Draft editing forms MUST use React Hook Form / local React state.
- **Invariant**: Zero `PlanDraft` or planning state is permitted in Zustand stores.

---

## 29. Limits & Resource Bounds
- Maximum generated tasks per plan: **25 tasks**.
- Maximum milestones per plan: **5 milestones**.
- Maximum user requirement prompt length: **2,000 characters**.
- AI Execution Model Tier: `AIModelTier.DEEP_CONTEXT`.
- AI Request Timeout: **30,000ms**.

---

## 30. Security & Privacy Invariants
- API keys MUST NEVER be transmitted to or stored on the client.
- Telemetry logs MUST NEVER contain raw prompts, model outputs, or secret sentinels.
- Users MUST NEVER be allowed to access or commit draft plans belonging to other tenants.

---

## 31. Observability Requirements
- `AIService` telemetry emits duration, provider, model, token usage, routing strategy, and error taxonomy for plan generation.
- `AILogger` captures `AI_PLAN_GENERATED` and `AI_PLAN_COMMITTED` events.

---

## 32. Testing Requirements
- **100% Offline Test Guarantee**: Zero live Gemini or Anthropic calls during automated CI execution.
- DAG Validator unit tests (valid linear graph, branching DAG, self-dependency failure, 2-node cycle failure, 3-node cycle failure, missing tempId reference failure).
- PlanDraft model & schema unit tests.
- Service integration tests for plan generation, draft update, and atomic commit.
- Frontend component unit tests for `PlanProjectDialog`.

---

## 33. Backward Compatibility Requirements
- Zero breaking changes to `Task` or `Project` MongoDB models. Existing tasks receive default `dependencies: []`, `position: 1`, `milestoneId: null`.
- Existing Phase 24 `generate-tasks` endpoint remains 100% operational.

---

## 34. Explicit Non-Goals
- NO generic conversational AI or chat drawers.
- NO vector database or RAG infrastructure.
- NO autonomous AI task execution without human approval.
- NO multi-user team permissions or RBAC.
- NO Server-Sent Events (SSE) or WebSocket response streaming.

---

## 35. Work Package Boundaries
- **WP-01**: Planning Domain Foundation & Schema Extensions (`Task` fields, `Milestone` model, `PlanDraft` model, `PlanValidator` DAG engine).
- **WP-02**: AI Plan Generation Subsystem (Prompt blueprint, Zod AI schema, `ProjectPlanningAIService`).
- **WP-03**: Plan Commitment & Audit Service (`PlanCommitService`, ID translation map, activity logging).
- **WP-04**: Backend API Routes & Controllers (Express routes, controllers, request validators, integration tests).
- **WP-05**: Frontend Planning Experience (`client/src/features/planning/`, `PlanProjectDialog`, TanStack Query hooks, UI tests).

---

## 36. Gate Structure
- **Gate 1**: Contract & Governance Review (**APPROVED**).
- **WP-01 to WP-05**: Implementation Work Packages.
- **Gate 2**: Final Implementation Verification & Phase Closure.

---

## 37. Phase Exit Criteria
1. AI generates structured project plans (`PlanDraft`) containing tasks, dependencies, positions, and milestones.
2. Draft plans persist in MongoDB for human review without mutating permanent task state.
3. `PlanValidator` prevents circular dependencies and invalid references from reaching MongoDB.
4. Interactive `PlanProjectDialog` UI allows editing tasks, dependencies, and milestones before committing.
5. `PlanCommitService` translates temporary IDs and commits tasks and milestones atomically.
6. `npm run verify` passes 100% with zero live AI calls.

---

## 38. Approved Architectural Decisions
1. Persisted `PlanDraft` collection for human-in-the-loop plan review.
2. Embedded `dependencies: Types.ObjectId[]` array on `Task` with multikey index.
3. Dedicated `Milestone` Mongoose collection (`owner`, `projectId`, `title`, `description`, `targetDate`, `position`).
4. Pure `PlanValidator` domain utility for DAG topological sort cycle detection.
5. Dedicated `PlanProjectDialog` modal frontend workspace.

---

## 39. Rejected Alternatives
1. *Rejected*: Immediate task creation without human draft review (Phase 24 legacy behavior).
2. *Rejected*: Transient in-memory client draft (lost on page refresh).
3. *Rejected*: Separate `TaskDependency` graph edge collection (over-engineering for single-user project scale).
4. *Rejected*: Milestones implemented as synthetic task tags or labels.

---

## 40. Open Questions
- **None.** All architectural decisions have been evaluated, resolved, and documented in this approved contract.
