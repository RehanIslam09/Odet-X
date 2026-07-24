# Phase 25 — Gate 1 Contract Review

## 1. Review Scope
This document presents the formal architectural review of the **Phase 25 — AI Project Planning Engine Contract** (`docs/phases/phase-25-ai-project-planning-engine/00-contract.md`). The review evaluates the proposed planning domain contracts, draft persistence models, dependency edge semantics, DAG validation rules, atomic commit workflows, API resource designs, and frontend state ownership against the existing Odet-X repository codebase.

---

## 2. Repository Baseline
- **Branch**: `feat/phase-25-ai-project-planning-engine`
- **Head Commit**: `4c84c7861731a2f584c99d1a9806cfce9ac72f89`
- **Working Tree Status**: Clean (0 uncommitted or untracked changes).
- **Node Environment**: Node `v20.20.2` | NPM `10.8.2`
- **Verification Pipeline**: `npm run verify` passing 100% (40/40 client unit tests, 22/22 server unit tests, 16/16 telemetry tests, 0 lint/typecheck errors).

---

## 3. Documents Reviewed
- `docs/roadmap.md`
- `docs/roadmapcontext.md`
- `docs/phases/phase-25-ai-project-planning-engine/investigation.md`
- `docs/phases/phase-25-ai-project-planning-engine/00-contract.md`

---

## 4. Source Files Re-Inspected
- Mongoose Models: `project.model.ts`, `task.model.ts`, `activity.model.ts`
- Domain Services: `project.service.ts`, `task.service.ts`, `project-ai.service.ts`, `activity.service.ts`
- AI Core Subsystem: `ai.service.ts`, `ai.router.ts`, `provider.factory.ts`, `prompt.registry.ts`, `project-tasks.prompt.ts`, `project-tasks.schema.ts`
- API Layer: `project.routes.ts`, `project.controller.ts`, `project.validator.ts`
- Frontend Infrastructure: `axios.ts`, `query-client.ts`, `auth.store.ts`, `GenerateTasksDialog.tsx`, `ProjectTasks.tsx`, `ProjectDetailPage.tsx`

---

## 5. Plan Lifecycle Verdict
- **Decision**: APPROVED.
- **Rationale**: The contract establishes an explicit 9-step lifecycle (`User Prompt` $\rightarrow$ `AI Generation` $\rightarrow$ `Zod Schema Validation` $\rightarrow$ `Domain DAG Validation` $\rightarrow$ `Persist PlanDraft` $\rightarrow$ `Human Review/Edit` $\rightarrow$ `Final Validation` $\rightarrow$ `Explicit Commit` $\rightarrow$ `Tasks + Milestones + Activity`). This satisfies the core safety invariant: **AI generation != permanent project mutation**.

---

## 6. PlanDraft Verdict
- **Decision**: APPROVED.
- **Rationale**: Persisting draft plans in a dedicated `PlanDraft` collection (`status`: `"draft"`, `"committed"`, `"discarded"`) allows multi-session review, asynchronous editing, and offline preservation across page refreshes.

---

## 7. Draft Cardinality Verdict
- **Decision**: APPROVED.
- **Rationale**: Enforcing **one active draft per project** eliminates user confusion, prevents stale draft accumulation, and keeps the query boundary simple (`GET /api/v1/projects/:id/plans/draft`). Requesting a new AI plan automatically sets existing active drafts to `"discarded"`.

---

## 8. Dependency Representation Verdict
- **Decision**: APPROVED.
- **Rationale**: Adding `dependencies: Types.ObjectId[]` to `Task` with a compound multikey index `{ owner: 1, dependencies: 1 }` fits the single-user project scale perfectly without the unnecessary join complexity of a separate graph edge collection.

---

## 9. Dependency Semantics Verdict
- **Decision**: APPROVED.
- **Rationale**: `Task B.dependencies = [Task A]` strictly means **Task B depends on Task A** (Task A is a prerequisite for Task B). Dependencies are strictly project-local. Cross-project dependencies are forbidden.

---

## 10. DAG Validation Verdict
- **Decision**: APPROVED.
- **Rationale**: Cycle detection and reference integrity checks are assigned to a pure domain utility (`server/src/domain/plan-validator.ts`) using Kahn's topological sort algorithm. Validation is enforced on initial generation, draft edit, and final commit.

---

## 11. Temporary ID Strategy Verdict
- **Decision**: APPROVED.
- **Rationale**: AI and draft payloads use string temporary IDs (`tempId`). `PlanCommitService` constructs a server-side translation map (`tempId` $\rightarrow$ `ObjectId`) before bulk database insertion. The AI model **never** controls permanent MongoDB ObjectIds.

---

## 12. Ordering Model Verdict
- **Decision**: APPROVED.
- **Rationale**: Adding `position: number` (integer starting at 1) to `Task` enables explicit, deterministic plan ordering.

---

## 13. Milestone Model Verdict
- **Decision**: APPROVED.
- **Rationale**: Creating a dedicated `Milestone` Mongoose collection (`owner`, `projectId`, `title`, `description`, `targetDate`, `position`) provides true project roadmap visualization and date boundary enforcement.

---

## 14. Plan Limits Verdict
- **Decision**: APPROVED.
- **Rationale**: Limits (max 25 tasks, max 5 milestones, max 2,000 prompt characters) prevent response truncation and token overflow while maintaining fast execution within the 30-second AI timeout budget.

---

## 15. AI Authority Boundary Verdict
- **Decision**: APPROVED.
- **Rationale**: AI proposes content, priorities, estimates, positions, and dependencies. Server controls ObjectIds, owner/project IDs, security tokens, commit status, and timestamps.

---

## 16. Human Review Boundary Verdict
- **Decision**: APPROVED.
- **Rationale**: Users can edit titles, descriptions, priorities, estimates, positions, dependencies, milestones, and add/remove items before committing.

---

## 17. Commit Semantics Verdict
- **Decision**: APPROVED.
- **Rationale**: `PlanCommitService.commitPlan` executes an 11-step atomic translation sequence, converting temporary draft IDs to permanent MongoDB task and milestone records while updating draft status to `"committed"`.

---

## 18. Partial Failure Safety Verdict
- **Decision**: APPROVED.
- **Rationale**: In standalone MongoDB environments lacking replica set transactions, pre-commit dry-run validation guarantees 100% document schema validity before database writes. If a driver error occurs during write, application compensation cleans up inserted documents.

---

## 19. Idempotency Verdict
- **Decision**: APPROVED.
- **Rationale**: Attempting to commit an already committed (`status: "committed"`), discarded, or expired draft returns HTTP 400 `BadRequestError`.

---

## 20. Activity/Audit Verdict
- **Decision**: APPROVED.
- **Rationale**: Registers `AI_PLAN_GENERATED`, `AI_PLAN_COMMITTED`, and `AI_PLAN_DISCARDED` activity types with privacy-safe metadata (`draftId`, `taskCount`, `milestoneCount`).

---

## 21. Existing Generate Tasks Compatibility Verdict
- **Decision**: APPROVED.
- **Rationale**: `POST /api/v1/projects/:id/generate-tasks` and `GenerateTasksDialog` remain 100% operational for single-step generation without breaking existing Phase 24 functionality.

---

## 22. API Design Verdict
- **Decision**: APPROVED.
- **Rationale**: Resource-oriented routes under `/api/v1/projects/:projectId/plans` cleanly express draft generation, retrieval, update, commit, and discard operations.

---

## 23. Frontend Surface Verdict
- **Decision**: APPROVED.
- **Rationale**: Dedicated `PlanProjectDialog` modal hosts the interactive review workspace using existing installed shadcn primitives (`Dialog`, `Button`, `Badge`, `Card`, `Textarea`, `ScrollArea`, `Tabs`). Zero npm dependencies or shadcn additions required.

---

## 24. State Ownership Verdict
- **Decision**: APPROVED.
- **Rationale**: Server state (`PlanDraft`, `Task`, `Milestone`) is owned 100% by TanStack Query. Local editing forms use React Hook Form / local React state. Zero planning state is stored in Zustand.

---

## 25. Expiration Policy Verdict
- **Decision**: APPROVED.
- **Rationale**: Drafts expire after 7 days (`expiresAt`). Server checks expiration date and rejects commits on expired drafts. Mongoose TTL index handles physical background cleanup.

---

## 26. Concurrency Verdict
- **Decision**: APPROVED.
- **Rationale**: `PlanCommitService` re-verifies project existence, non-archival (`archived: false`), non-deletion (`isDeleted: false`), and draft `status === "draft"` before committing.

---

## 27. Dependency Deletion Semantics Verdict
- **Decision**: APPROVED.
- **Rationale**: Soft-deleting a task that is referenced as a dependency by other active tasks is blocked (`400 ConflictError: Cannot delete task because it is a prerequisite for X active task(s)`), preserving graph integrity.

---

## 28. Security & Privacy Verdict
- **Decision**: APPROVED.
- **Rationale**: Ownership checks (`owner: req.user._id`) are enforced on all routes and services. Telemetry strips raw prompts, outputs, and secrets. Provider API keys remain server-side.

---

## 29. Scope Boundary Verdict
- **Decision**: APPROVED.
- **Rationale**: Non-goals explicitly exclude chat assistants, vector RAG, autonomous actions, streaming, RBAC, and proactive background jobs.

---

## 30. Implementation Readiness
- **Decision**: APPROVED.
- **Rationale**: The contract eliminates all architectural ambiguities, defines exact data shapes, specifies validation layers, and establishes a clear 5-work-package implementation sequence.

---

## 31. Findings

- **BLOCKER Count**: 0
- **MAJOR Count**: 0
- **MINOR Count**: 0
- **NOTE Count**: 1 (All 26 architectural decisions evaluated and approved).

---

## 32. Required Corrections
- **None.** The contract `00-contract.md` accurately reflects the approved decisions.

---

## 33. Gate Verdict

```
============================================================
GATE VERDICT: GATE 1: APPROVED — READY FOR WP-01
============================================================
```

---

## 34. Exact Next Authorized Action
Proceed to execute **WP-01 — Planning Domain Foundation & Schema Extensions**.
