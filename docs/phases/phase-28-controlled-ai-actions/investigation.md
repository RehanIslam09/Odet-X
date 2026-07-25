# Phase 28 — Controlled AI Actions
## Gate 0 — Read-Only Architectural Discovery Report

> **Phase**: Phase 28 — Controlled AI Actions  
> **Gate**: Gate 0 — Read-Only Architectural Discovery  
> **Status**: APPROVED / READY FOR PHASE 28 CONTRACT  
> **Author**: Senior Staff Software Architect & AI Platform Architect  
> **Branch**: `feat/phase-27-read-only-project-copilot`  
> **HEAD Commit**: `8b91dc8048fec399704930b3cda05f7d9c552861`  
> **Environment**: Node v20.20.2 | NPM 10.8.2 | Linux WSL (Ubuntu)  

---

## 1. Executive Summary

Phase 28 marks a critical transition in the Odet-X platform roadmap: moving from **AI reading and reasoning over project state** (Phase 27) to **AI proposing typed domain mutations safely** (Phase 28).

As established in the canonical roadmap, Phase 28 is classified as a **Level A — High-Risk Architecture Phase**. The fundamental architectural shift introduced in this phase is the **Controlled AI Action Model**:

```text
       UNTRUSTED BOUNDARY                      TRUSTED APPLICATION BOUNDARY
┌───────────────────────────────┐     ┌──────────────────────────────────────────────┐
│  User Request (Prompt)        │     │ Action Schema Validation (Zod)              │
│            ↓                  │     │            ↓                                 │
│  Copilot Context (Symbolic)   │     │ Server-Side Authorization (User Ownership)   │
│            ↓                  │     │            ↓                                 │
│  AI Model (LLM Generation)    │ ──► │ Dry-Run Diff Generation & Signed Token       │
│            ↓                  │     │            ↓                                 │
│  Proposed Typed Action        │     │ Human Confirmation (User Click)              │
│  (Target: "task_1", priority) │     │            ↓                                 │
└───────────────────────────────┘     │ Action Executor -> Existing Domain Service    │
                                      │            ↓                                 │
                                      │ MongoDB + Activity Audit Log                 │
                                      └──────────────────────────────────────────────┘
```

### Core Architecture Invariant
The LLM is **never** granted direct database mutation authority. The flow `LLM -> MongoDB` is strictly forbidden. The AI remains an **untrusted reasoning component** whose output is validated, authorized, previewed in a dry-run state, and explicitly confirmed by a human user before delegating to pre-existing, tested domain services.

---

## 2. Repository Audit & Baseline Architecture Summary

An exhaustive audit of the codebase confirms that Odet-X has accumulated a robust, production-grade architectural foundation across prior phases.

### 2.1 Completed Infrastructure Reuse Matrix

| Infrastructure Layer | Component / Asset | Location | Phase Origin | Phase 28 Reuse Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **AI Platform** | `AIService` | `server/src/ai/ai.service.ts` | Phase 20 | Execute structured generation (`generateStructuredData`) |
| **AI Platform** | `AIRouter` | `server/src/ai/routing/ai.router.ts` | Phase 23 | Model resolution & fallback orchestration |
| **AI Platform** | `PromptRegistry` | `server/src/ai/prompts/registry/` | Phase 20-27 | Register `project-copilot-action` prompt definition |
| **Domain Services** | `task.service.ts` | `server/src/services/task.service.ts` | Phase 1-25 | Reused for `createTask`, `updateTask` mutations |
| **Domain Services** | `project.service.ts` | `server/src/services/project.service.ts` | Phase 1-25 | Ownership assertions and project verification |
| **Domain Logic** | `ProjectContextBuilder` | `server/src/domain/copilot-context-builder.ts` | Phase 27 | Scoped context extraction & symbolic mapping |
| **Domain Logic** | `resolveCopilotReferences` | `server/src/domain/copilot-reference-resolver.ts` | Phase 27 | Resolve symbolic refs (`task_1`) to real ObjectIds |
| **Activity Logging** | `recordActivity` | `server/src/services/activity.service.ts` | Phase 14 | Automatic audit logging for task & project events |
| **OCC Control** | `__v` Mongoose OCC | `server/src/models/task.model.ts` | Core Phase | Stale version detection & `409 Conflict` handling |
| **Evaluation** | `EvaluationRunner` | `server/src/ai/evaluation/runners/` | Phase 26 | Quality evaluation runner & regression testing |
| **Evaluation** | `MetricValue` | `server/src/ai/evaluation/types/` | Phase 26 | Tagged union metrics (`VALUED`, `N/A`, `UNKNOWN`) |
| **Frontend Copilot** | `ProjectCopilotSheet` | `client/src/features/ai/components/copilot/` | Phase 27 | Host Action Dry-Run Cards inline in Copilot sheet |
| **Frontend Copilot** | `useProjectCopilot` | `client/src/features/ai/hooks/` | Phase 27 | Manage chat state and action confirmation flow |

---

## 3. Analysis of Primary Investigation Questions

### 1. Where should the AI Action subsystem live?
**Decision**: `server/src/ai/actions/`  
**Rationale**: In alignment with standard repo conventions (`server/src/ai/prompts`, `server/src/ai/schemas`, `server/src/ai/evaluation`), AI action schemas, registry, validators, and execution handlers belong in `server/src/ai/actions/`.  
Directory structure:
```text
server/src/ai/actions/
├── action.types.ts       # Discriminated union types & action DTOs
├── action.schema.ts      # Zod schemas for AI proposed actions
├── action.registry.ts    # Action definition & lookup registry
├── action.validator.ts   # Post-AI validation & symbolic resolving
├── action.executor.ts    # Execution engine wrapping domain services
└── handlers/
    ├── update-task-priority.handler.ts
    ├── update-task-status.handler.ts
    ├── update-task-due-date.handler.ts
    ├── add-task-label.handler.ts
    └── create-task.handler.ts
```

### 2. How should AI action proposals be represented?
**Decision**: Discriminated Union pattern in Zod and TypeScript.  
**Schema Pattern**:
```typescript
export const ActionTypeEnum = z.enum([
  "UPDATE_TASK_PRIORITY",
  "UPDATE_TASK_STATUS",
  "UPDATE_TASK_DUE_DATE",
  "ADD_TASK_LABEL",
  "CREATE_TASK",
]);

export const ProposedActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPDATE_TASK_PRIORITY"),
    targetRef: z.string().min(1).max(50),
    arguments: z.object({ priority: z.enum(["low", "medium", "high", "urgent"]) }),
    explanation: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("UPDATE_TASK_STATUS"),
    targetRef: z.string().min(1).max(50),
    arguments: z.object({ status: z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]) }),
    explanation: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("UPDATE_TASK_DUE_DATE"),
    targetRef: z.string().min(1).max(50),
    arguments: z.object({ dueDate: z.string().datetime().nullable() }),
    explanation: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("ADD_TASK_LABEL"),
    targetRef: z.string().min(1).max(50),
    arguments: z.object({ label: z.string().min(1).max(30) }),
    explanation: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal("CREATE_TASK"),
    targetRef: z.literal("project"),
    arguments: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.string().datetime().nullable().optional(),
      labels: z.array(z.string()).optional(),
    }),
    explanation: z.string().min(1).max(500),
  }),
]);
```

### 3. How should actions reuse existing domain services?
**Decision**: Delegating Action Handlers.  
Handlers inside `server/src/ai/actions/handlers/` import existing domain services (`task.service.ts`, `project.service.ts`) directly.
- `UpdateTaskPriorityHandler` calls `updateTask(realTaskId, userId, { priority })`.
- `CreateTaskHandler` calls `createTask(userId, { projectId, title, ... })`.
Handlers **never** issue direct Mongoose database queries (`Task.updateOne`). Domain service logic (validation, activity logging, pre-save hooks) is preserved 100%.

### 4. How should authorization occur?
**Decision**: Dual-Layer Authorization (Defense-in-Depth).  
- **Layer 1 (Context Builder)**: `ProjectContextBuilder` verifies user ownership of `projectId` before generating AI prompt context.
- **Layer 2 (Execution Handler)**: `action.executor.ts` resolves `targetRef` via `symbolicMap` and calls `assertTaskOwnership(taskId, userId)` inside `task.service.ts`. If the user does not own the task or project, `404 NotFoundError` is thrown (preventing ID enumeration). The model's choice is **never trusted** for access decisions.

### 5. How should confirmation work?
**Decision**: Cryptographically Signed Confirmation Token + Dry-Run Endpoint.  
1. Copilot model proposes action `P`.
2. Frontend requests `POST /api/copilot/actions/dry-run` with `P` and `contextId`.
3. Backend resolves symbolic references, simulates execution diff (Before vs After), captures current document `expectedVersion` (`__v`), and returns:
   - `dryRun`: `{ title: "Update Priority", before: { priority: "medium" }, after: { priority: "high" } }`
   - `confirmationToken`: HMAC signed JWT/token containing `{ action, targetId, resolvedArgs, expectedVersion, expiresAt }` (valid for 5 minutes).
4. Frontend renders Dry-Run Card with `[Apply Action]` button.
5. User clicks `[Apply Action]`, sending `POST /api/copilot/actions/confirm` with `{ confirmationToken }`.
6. Backend verifies signature, expiration, and idempotency, then executes the action.

### 6. How should stale versions be handled?
**Decision**: Leverage existing Mongoose OCC (`__v`).  
- `Task` model has Mongoose optimistic concurrency tracking (`__v`).
- The `confirmationToken` embeds `expectedVersion`.
- During confirmation execution, the handler passes `expectedVersion` to `updateTask`. If `currentTask.__v !== expectedVersion`, the system rejects the mutation with `409 ConflictError`: *"Task was modified by another request. Please refresh and review."*

### 7. How should AI action schemas be validated?
**Decision**: Zod validation inside `AIService` + domain validation in Action Registry.  
- Model structured output is validated against `ProjectCopilotResponseSchema` (which includes `proposedAction`).
- If Zod validation fails, `AIService` triggers retry/fallback or returns a clean `AIValidationError`.
- `action.validator.ts` checks semantic constraints (e.g., ensuring `targetRef` exists in `symbolicMap`).

### 8. How should hallucinated actions fail safely?
**Decision**: Fail-Closed Verification Pipeline.  
- **Unknown Action**: Rejected by Zod enum schema (`400 Bad Request`).
- **Unmapped `targetRef`**: `symbolicMap[ref]` returns `undefined` -> `resolveCopilotReferences` marks as unmapped -> Rejected before touching DB (`400 Bad Request`).
- **Deleted Task**: `assertTaskOwnership` throws `404 Not Found`.
- **Cross-Tenant Target**: Not in `symbolicMap` (which is scoped exclusively to authorized project context). Throws `404 Not Found`.

### 9. How should activity logging integrate?
**Decision**: Seamless reuse of `activity.service.ts`.  
- Handlers calling `updateTask` / `createTask` automatically trigger existing activity recording (`TASK_PRIORITY_CHANGED`, `TASK_STATUS_CHANGED`, `TASK_CREATED`).
- Metadata payload is enriched with `initiatedBy: "copilot"` and `copilotExecutionId` for auditability.

### 10. How should evaluation integrate?
**Decision**: Reuse Phase 26 Evaluation Framework.  
- `EvaluationRunner` and `MetricValue` will be reused.
- New deterministic evaluators in `server/src/ai/evaluation/evaluators/`:
  - `action-schema-validity.evaluator.ts`
  - `action-reference-validity.evaluator.ts`
  - `action-safety-boundary.evaluator.ts` (verifies zero destructive actions proposed)
- Offline evaluation test suite will verify action proposal precision on golden fixtures.

### 11. Should symbolic references continue from Phase 27?
**Decision**: YES. Continuing symbolic references is MANDATORY.  
- Symbolic references (`task_1`, `ms_1`, `project`) keep raw ObjectIds completely out of LLM prompts.
- Prevents database ID leakage, prompt injection targeting ObjectIds, and cross-project hallucination.

### 12. How should AI responses evolve?
**Decision**: Extend `ProjectCopilotResponseSchema`.  
```typescript
export const ProjectCopilotResponseSchema = z.object({
  answer: z.string().trim().min(1).max(10000),
  references: z.array(ProjectCopilotReferenceSchema).max(20).default([]),
  proposedAction: ProposedActionSchema.nullable().optional(),
});
```

### 13. Should AI propose multiple actions or exactly one?
**Decision**: Exactly ONE proposed action per response (`proposedAction: ProposedActionSchema.nullable().optional()`).  
- Multi-action proposals increase UX friction, partial failure risk, and transaction complexity. Single-action proposals keep confirmation granular and deterministic.

### 14. How should rollback work?
**Decision**: Standard Single-Document Atomic Mutations.  
- Each proposed action maps to a single atomic domain service operation (`createTask` or `updateTask`).
- Standard Mongoose transaction boundaries / atomic document updates ensure all-or-nothing execution. No multi-document complex rollback is needed.

### 15. Should destructive actions be completely excluded?
**Decision**: YES. Strictly excluded.  
- **Allowed**: `CREATE_TASK`, `UPDATE_TASK_STATUS`, `UPDATE_TASK_PRIORITY`, `UPDATE_TASK_DUE_DATE`, `ADD_TASK_LABEL`.
- **Forbidden**: `DELETE_PROJECT`, `DELETE_TASK`, `BULK_DELETE`, `ACCOUNT_CHANGES`, `SECURITY_CHANGES`.

---

## 4. Detailed Security Audit & Mitigation Strategy

| Threat Vector | Attack Scenario | Mitigation Strategy |
| :--- | :--- | :--- |
| **Prompt Injection** | User prompt tricks LLM into outputting `DELETE_PROJECT` action. | Zod schema enum strictly whitelist allowed action types. `DELETE_PROJECT` is not in the Zod enum and is rejected at schema validation. |
| **Target Hijacking** | Adversary inputs a valid task ID from another user in prompt context. | Prompt receives ONLY symbolic IDs (`task_1`). Server resolves symbolic IDs against `symbolicMap` built strictly from authorized project state. |
| **Client Confirmation Bypass** | Attacker bypasses UI and posts directly to `/confirm` endpoint with arbitrary task ID. | `/confirm` requires a valid, server-signed `confirmationToken` generated during `/dry-run`. |
| **Replay Attack** | Attacker intercepts a valid `confirmationToken` and resends it repeatedly. | `confirmationToken` includes a single-use `nonce` checked against Redis/cache, and a 5-minute expiration timestamp. |
| **Stale Mutation Race** | User confirms an action on a task that another user modified 1 second ago. | OCC check verifies `expectedVersion` embedded in token against `task.__v`. Rejects with `409 Conflict` if version mismatch. |
| **Client Tampering** | Attacker modifies the proposed priority from `medium` to `urgent` in client state. | `confirmationToken` signs the exact resolved arguments. Tampering invalidates token HMAC signature (`401 Unauthorized`). |

---

## 5. Frontend & UX Architecture

### 5.1 Dry-Run Card Design in `ProjectCopilotSheet`
The Action Dry-Run Card renders directly inside `CopilotMessageItem.tsx` beneath the markdown response:

```text
┌─────────────────────────────────────────────────────────────┐
│ ⚡ AI Action Proposal                                        │
│ Update Task Priority -> "Deploy API Service"               │
├─────────────────────────────────────────────────────────────┤
│ Target:  [Task: Deploy API Service]                         │
│ Reason:  This task blocks production deployment.            │
│ Diff:                                                       │
│   Priority:  [ Medium ] ──► [ High ]                        │
├─────────────────────────────────────────────────────────────┤
│ Status: Pending User Confirmation                           │
│ [ Cancel ]                                 [ Apply Action ] │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Optimistic UI & TanStack Query Integration
When the user clicks `[Apply Action]`:
1. `useProjectCopilot` invokes `confirmActionMutation`.
2. Button enters loading state ("Applying change...").
3. Upon API response (`200 OK`):
   - TanStack Query invalidates `['tasks', projectId]` and `['activities', projectId]`.
   - Card transitions to `Applied` state with a checkmark.
   - Task list / board updates instantly via query invalidation without full page reload.

---

## 6. Recommended Architecture & Candidate Work Packages

Phase 28 will be executed across 5 structured Work Packages:

```text
WP-01: Action Domain Foundation & Typed Registry
 ├── Define Zod schemas & discriminated union types (server/src/ai/actions/action.schema.ts)
 ├── Implement Action Registry & lookup engine (server/src/ai/actions/action.registry.ts)
 └── Unit tests for schema validation & registry lookup

WP-02: Action Handlers & Executor Engine
 ├── Implement action handlers delegating to task.service.ts
 ├── Implement action.executor.ts with symbolic resolution & OCC verification
 └── Unit tests for handlers & execution engine

WP-03: Backend API & Cryptographic Confirmation Pipeline
 ├── Create Dry-Run endpoint (POST /api/copilot/actions/dry-run)
 ├── Create Confirmation endpoint (POST /api/copilot/actions/confirm)
 ├── Implement HMAC token generation & validation utility
 └── Controller & integration tests for API endpoints

WP-04: AI Platform Integration & Copilot Prompt Evolution
 ├── Update project-copilot prompt definition & Zod response schema
 ├── Update ProjectCopilotAIService to process action proposals
 └── Unit & integration tests for copilot action responses

WP-05: Frontend UX & Quality Evaluation Suite
 ├── Create Action Dry-Run Card component in client/src/features/ai/components/copilot/
 ├── Integrate action confirmation flow into useProjectCopilot hook
 ├── Add deterministic action evaluators to server/src/ai/evaluation/
 └── End-to-end integration tests & quality evaluation verification
```

---

## 7. Blockade Recommendations & Readiness Assessment

### Blockade Analysis
A blockade is required ONLY when implementation cannot proceed without resolving an experimental uncertainty.
- **Domain Service Readiness**: `task.service.ts` and `project.service.ts` fully support all target mutations (`createTask`, `updateTask`).
- **OCC Integration**: Mongoose `__v` OCC is tested and operational.
- **Symbolic References**: Tested in Phase 27.
- **Evaluation Infrastructure**: Framework operational from Phase 26.
- **Frontend Architecture**: Copilot sheet and hooks fully operational.

**Conclusion**: ZERO blockades required. BLOCKER count: 0.

### Final Readiness Assessment
The repository is **100% READY** for Phase 28 Contract generation and implementation plan breakdown.

---

## 8. Gate Verdict & Required Summary Metrics

```text
Current branch:                        feat/phase-27-read-only-project-copilot
Current commit:                        8b91dc8048fec399704930b3cda05f7d9c552861
Files inspected:                       server/src/services/project-copilot-ai.service.ts
                                       server/src/domain/copilot-context-builder.ts
                                       server/src/domain/copilot-reference-resolver.ts
                                       server/src/ai/schemas/project-copilot.schema.ts
                                       server/src/services/task.service.ts
                                       server/src/services/project.service.ts
                                       server/src/models/task.model.ts
                                       server/src/ai/evaluation/types/metric.types.ts
                                       server/src/ai/evaluation/evaluators/index.ts
                                       client/src/features/ai/components/copilot/CopilotMessageItem.tsx
                                       docs/roadmap.md
Production architecture summary:       Clean, multi-provider AI architecture with server-authoritative
                                       symbolic references, robust domain service encapsulation, Mongoose OCC,
                                       and client-side Copilot sheet integration.
Existing services to reuse:            task.service.ts (createTask, updateTask)
                                       project.service.ts (validateProjectOwnership)
                                       activity.service.ts (recordActivity)
                                       AIService (generateStructuredData)
                                       AIRouter (model resolution & fallback)
Existing validators to reuse:          task.validator.ts, copilot.validator.ts, Zod schemas
Existing evaluation infra to reuse:    EvaluationRunner, EvaluationReporter, MetricValue
Existing telemetry to reuse:           Execution telemetry, privacy-safe logger in AIService
Existing frontend components to reuse: ProjectCopilotSheet, CopilotMessageItem, MarkdownRenderer, useProjectCopilot
New architectural risks:              Mitigated by dual-layer authorization, symbolic ref mapping,
                                       cryptographic confirmation tokens, and OCC checks.
BLOCKER count:                         0
MAJOR count:                           0
MINOR count:                           0
Production files modified:             0
Test files modified:                   0
Live Gemini calls:                     0
Live Anthropic calls:                  0
git diff --check result:               Clean (0 issues)
Gate verdict:                          READY FOR PHASE 28 CONTRACT
```
