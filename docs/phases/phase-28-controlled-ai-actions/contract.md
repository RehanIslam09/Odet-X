# Phase 28 — Controlled AI Actions
## Gate 1 — Architecture Contract

> **Phase**: Phase 28 — Controlled AI Actions  
> **Gate**: Gate 1 — Architecture Contract  
> **Status**: FROZEN / APPROVED FOR IMPLEMENTATION  
> **Author**: Senior Staff Software Architect & AI Platform Architect  
> **Branch**: `feat/phase-27-read-only-project-copilot`  
> **HEAD Commit**: `8b91dc8048fec399704930b3cda05f7d9c552861`  
> **Environment**: Node v20.20.2 | NPM 10.8.2 | Linux WSL (Ubuntu)  

---

## 1. Executive Summary & Purpose

This contract freezes all architectural decisions for **Phase 28 — Controlled AI Actions**.

Phase 28 expands the Odet-X Read-Only Project Copilot (Phase 27) into a **Controlled Mutation System**. The LLM is permitted to propose typed, domain-validated actions in response to user requests. However, the model is granted **ZERO direct database mutation authority**.

### 1.1 Non-Negotiable Safety Boundary

```text
       UNTRUSTED MODEL BOUNDARY                       TRUSTED SERVER / APPLICATION BOUNDARY
┌───────────────────────────────┐     ┌────────────────────────────────────────────────────────┐
│  User Request (Chat Prompt)   │     │ Action Schema Validation (Zod Discriminated Union)    │
│            ↓                  │     │            ↓                                           │
│  Copilot Context (Symbolic)   │     │ Server Authorization (User Ownership Check)           │
│            ↓                  │     │            ↓                                           │
│  AI Model (Structured Gen)    │ ──► │ Dry-Run Diff Simulation & Cryptographic Token Sign    │
│            ↓                  │     │            ↓                                           │
│  Proposed Action DTO          │     │ Human Confirmation (User Click in Dry-Run Card)        │
│  (Target: "task_1", priority) │     │            ↓                                           │
└───────────────────────────────┘     │ Action Executor -> Existing Domain Service             │
                                      │            ↓                                           │
                                      │ Database (MongoDB) + Activity Audit Trail              │
                                      └────────────────────────────────────────────────────────┘
```

The flow `LLM -> MongoDB` is strictly forbidden. Every mutation must pass through Zod schema validation, server-side authorization, dry-run diff generation, cryptographic token signing, explicit human confirmation, optimistic concurrency control (OCC) verification, and execution via pre-existing domain services.

---

## 2. Frozen AI Action Hierarchy

### 2.1 Allowed Action Enum
```typescript
export const AllowedActionType = z.enum([
  "CREATE_TASK",
  "UPDATE_TASK_STATUS",
  "UPDATE_TASK_PRIORITY",
  "UPDATE_TASK_DUE_DATE",
  "ADD_TASK_LABEL",
]);

export type AllowedActionType = z.infer<typeof AllowedActionType>;
```

### 2.2 Zod Schemas & TS Interfaces

```typescript
import { z } from "zod";

// --- Individual Action Payload Schemas ---

export const UpdateTaskPriorityPayloadSchema = z.object({
  action: z.literal("UPDATE_TASK_PRIORITY"),
  targetRef: z.string().min(1).max(50),
  arguments: z.object({
    priority: z.enum(["low", "medium", "high", "urgent"]),
  }),
  explanation: z.string().min(1).max(500),
});

export const UpdateTaskStatusPayloadSchema = z.object({
  action: z.literal("UPDATE_TASK_STATUS"),
  targetRef: z.string().min(1).max(50),
  arguments: z.object({
    status: z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]),
  }),
  explanation: z.string().min(1).max(500),
});

export const UpdateTaskDueDatePayloadSchema = z.object({
  action: z.literal("UPDATE_TASK_DUE_DATE"),
  targetRef: z.string().min(1).max(50),
  arguments: z.object({
    dueDate: z.string().datetime().nullable(),
  }),
  explanation: z.string().min(1).max(500),
});

export const AddTaskLabelPayloadSchema = z.object({
  action: z.literal("ADD_TASK_LABEL"),
  targetRef: z.string().min(1).max(50),
  arguments: z.object({
    label: z.string().min(1).max(30).trim(),
  }),
  explanation: z.string().min(1).max(500),
});

export const CreateTaskPayloadSchema = z.object({
  action: z.literal("CREATE_TASK"),
  targetRef: z.literal("project"),
  arguments: z.object({
    title: z.string().min(1).max(200).trim(),
    description: z.string().max(2000).optional().default(""),
    status: z.enum(["todo", "in_progress", "in_review", "done"]).optional().default("todo"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
    dueDate: z.string().datetime().nullable().optional().default(null),
    labels: z.array(z.string().min(1).max(30)).optional().default([]),
  }),
  explanation: z.string().min(1).max(500),
});

// --- Discriminated Union Schema ---

export const ProposedActionSchema = z.discriminatedUnion("action", [
  UpdateTaskPriorityPayloadSchema,
  UpdateTaskStatusPayloadSchema,
  UpdateTaskDueDatePayloadSchema,
  AddTaskLabelPayloadSchema,
  CreateTaskPayloadSchema,
]);

export type ProposedAction = z.infer<typeof ProposedActionSchema>;
```

---

## 3. Allowed vs. Forbidden Actions

### 3.1 Allowed Actions (Strictly Whitelisted)
1. `CREATE_TASK`: Create a single task in the active project.
2. `UPDATE_TASK_STATUS`: Move a task across workflow stages (`todo`, `in_progress`, `in_review`, `done`, `cancelled`).
3. `UPDATE_TASK_PRIORITY`: Adjust urgency/priority (`low`, `medium`, `high`, `urgent`).
4. `UPDATE_TASK_DUE_DATE`: Set or clear a target completion date.
5. `ADD_TASK_LABEL`: Append a single taxonomy label to a task.

### 3.2 Forbidden Actions (Strictly Blacklisted)
The system will **NEVER** allow or execute the following actions under any circumstances:
- `DELETE_PROJECT` / `ARCHIVE_PROJECT`: Permanent or soft deletion of projects.
- `DELETE_TASK` / `BULK_DELETE`: Task deletion operations.
- `USER_MANAGEMENT`: Modifying user roles, permissions, invitations, or assignments.
- `SECURITY_OPERATIONS`: Password resets, API key generation/revocation, session termination.
- `BILLING_OPERATIONS`: Subscription tier changes or payment processing.
- `BATCH_MUTATIONS`: Multi-task or multi-project bulk updates in a single action.

---

## 4. Action Registry Architecture

The Action Registry provides a centralized, type-safe lookup mechanism for validating and executing proposed actions.

- **Location**: `server/src/ai/actions/action.registry.ts`
- **Handler Directory**: `server/src/ai/actions/handlers/`

### 4.1 Handler Interface Contract
```typescript
export interface ActionContext {
  userId: string;
  projectId: string;
  symbolicMap: Record<string, SymbolicEntityMapItem>;
}

export interface DryRunResult {
  actionType: AllowedActionType;
  target: {
    id: string;
    label: string;
    type: "task" | "project";
  };
  diff: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  explanation: string;
  expectedVersion: number | null;
}

export interface ActionHandler<T extends ProposedAction = ProposedAction> {
  readonly actionType: T["action"];
  dryRun(context: ActionContext, action: T): Promise<DryRunResult>;
  execute(context: ActionContext, action: T, expectedVersion: number | null): Promise<any>;
}
```

### 4.2 Registry Implementation Contract
```typescript
export class ActionRegistry {
  private handlers = new Map<AllowedActionType, ActionHandler<any>>();

  register(handler: ActionHandler<any>): void {
    this.handlers.set(handler.actionType, handler);
  }

  get(actionType: AllowedActionType): ActionHandler<any> {
    const handler = this.handlers.get(actionType);
    if (!handler) {
      throw new BadRequestError(`Unsupported or unregistered AI action type: ${actionType}`);
    }
    return handler;
  }
}

export const actionRegistry = new ActionRegistry();
```

---

## 5. Action Executor Pipeline

The Action Executor coordinates validation, authorization, resolution, concurrency checking, and domain service delegation.

### 5.1 Pipeline Sequence
```text
1. Express Route Handler (auth.middleware)
   └── Validates JWT session (req.user.id)

2. Dry-Run Phase (POST /api/copilot/actions/dry-run)
   ├── Validate request body (projectId, proposedAction, contextId)
   ├── Validate project ownership (validateProjectOwnership)
   ├── Lookup Action Handler in actionRegistry
   ├── Resolve targetRef via symbolicMap (resolveSymbolicRef)
   ├── Verify target ownership (assertTaskOwnership)
   ├── Compute Before vs After state diff
   ├── Capture current document version (__v)
   └── Generate & return HMAC-SHA256 signed confirmationToken (5 min expiry)

3. Confirmation Phase (POST /api/copilot/actions/confirm)
   ├── Verify confirmationToken HMAC signature & expiration
   ├── Check idempotency nonce in Redis / in-memory cache
   ├── Validate project ownership again (defense-in-depth)
   ├── Verify Optimistic Concurrency Control (__v === expectedVersion)
   ├── Invoke Domain Service (task.service.ts updateTask / createTask)
   ├── Record Activity (recordActivity with initiatedBy: "copilot")
   └── Invalidate idempotency nonce & return updated domain entity
```

---

## 6. Symbolic Reference Rules

Phase 28 **continues 100% of the Phase 27 symbolic reference model**.

### 6.1 Rules
- Models receive **ONLY** symbolic IDs in prompts: `task_1`, `task_2`, `ms_1`, `project`.
- Models return `targetRef: "task_1"` or `targetRef: "project"`.
- Raw MongoDB `ObjectId`s are **prohibited** in AI prompts and model structured outputs.
- Symbolic resolution maps `targetRef` against the server-maintained `symbolicMap` generated by `ProjectContextBuilder`.
- If `targetRef` is unmapped or invalid, resolution fails immediately (`400 Bad Request`). No database query is executed.

---

## 7. Confirmation Architecture Selection

### 7.1 Selection
**OPTION A — Cryptographically Signed Confirmation Token** (FROZEN)

### 7.2 Rejected Alternatives & Tradeoff Rationale
- **Option B (Persisted PendingCopilotAction MongoDB Documents)**: REJECTED. Introduces state accumulation in MongoDB, requires cleanup cron jobs, and adds unnecessary DB write overhead for transient unconfirmed proposals.
- **Option C (Pure Client State Confirmation)**: REJECTED. Insecure. Allows client-side tampering of parameters (e.g. changing priority from `medium` to `urgent` or switching target task ID before sending to execute).

### 7.3 Option A Cryptographic Token Specification
- **Payload Contents**:
  ```typescript
  export interface CopilotActionTokenPayload {
    actionType: AllowedActionType;
    projectId: string;
    userId: string;
    targetId: string;
    expectedVersion: number | null;
    arguments: Record<string, any>;
    nonce: string; // Random UUID v4
    iat: number;   // Timestamp (seconds)
    exp: number;   // Timestamp (iat + 300 seconds / 5 minutes)
  }
  ```
- **Signing Key**: `process.env.COPILOT_ACTION_SECRET || process.env.JWT_SECRET`
- **Alg**: `HS256`

---

## 8. Optimistic Concurrency Control (OCC) Strategy

To prevent race conditions where a task is edited by another user or tab while the AI action is pending confirmation:

1. **Version Capture**: During `/dry-run`, the current document version `task.__v` is captured as `expectedVersion`.
2. **Version Embedding**: `expectedVersion` is embedded inside the signed `confirmationToken`.
3. **Version Check**: During `/confirm`, `task.service.ts` updates the task using conditional query:
   ```typescript
   const query = { _id: taskId, owner: userId, isDeleted: false, __v: expectedVersion };
   ```
4. **Version Conflict Handling**: If `__v` has incremented, `task.service.ts` throws `ConflictError` (`409 Conflict`).
5. **API Response**: Returns `409 Conflict`:
   ```json
   {
     "success": false,
     "error": {
       "code": "CONCURRENCY_CONFLICT",
       "message": "Task was modified by another user after this proposal was created. Please review the updated task state."
     }
   }
   ```

---

## 9. Authorization & Execution Sequence

```text
User Request
  │
  ▼
[ 1. Authenticate Session ] ──► Validates JWT (req.user.id). Throws 401 if unauthenticated.
  │
  ▼
[ 2. Project Ownership ]   ──► Project.findOne({ _id: projectId, owner: userId, isDeleted: false }).
  │                            Throws 404 if not found.
  ▼
[ 3. Symbolic Ref Resolve ] ──► Map targetRef ("task_1") to targetId via symbolicMap.
  │                            Throws 400 if unmapped.
  ▼
[ 4. Target Ownership ]    ──► Task.findOne({ _id: targetId, owner: userId, isDeleted: false }).
  │                            Throws 404 if not found.
  ▼
[ 5. Zod Argument Check ]   ──► Validate action arguments against specific Action Payload Schema.
  │                            Throws 400 if schema invalid.
  ▼
[ 6. OCC Concurrency Check] ──► Verify task.__v === expectedVersion.
  │                            Throws 409 if version mismatch.
  ▼
[ 7. Domain Service Call ]  ──► taskService.updateTask(targetId, userId, data).
                                Executes save & records Activity log.
```

---

## 10. Dry-Run API Specification

### 10.1 Endpoint
`POST /api/copilot/actions/dry-run`

### 10.2 Request Payload
```json
{
  "projectId": "65b2f1a9e4b0a1c2d3e4f5a6",
  "proposedAction": {
    "action": "UPDATE_TASK_PRIORITY",
    "targetRef": "task_1",
    "arguments": { "priority": "high" },
    "explanation": "This task blocks deployment."
  },
  "contextId": "ctx_987654321"
}
```

### 10.3 Response Payload (200 OK)
```json
{
  "success": true,
  "data": {
    "dryRun": {
      "actionType": "UPDATE_TASK_PRIORITY",
      "target": {
        "id": "65b2f2b1e4b0a1c2d3e4f5b7",
        "label": "Deploy API Service",
        "type": "task"
      },
      "diff": {
        "before": { "priority": "medium" },
        "after": { "priority": "high" }
      },
      "explanation": "This task blocks deployment.",
      "expectedVersion": 2
    },
    "confirmationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-07-25T18:00:00.000Z"
  }
}
```

---

## 11. Confirmation API Specification

### 11.1 Endpoint
`POST /api/copilot/actions/confirm`

### 11.2 Request Payload
```json
{
  "confirmationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 11.3 Response Payload (200 OK)
```json
{
  "success": true,
  "data": {
    "actionType": "UPDATE_TASK_PRIORITY",
    "targetId": "65b2f2b1e4b0a1c2d3e4f5b7",
    "executedAt": "2026-07-25T17:55:30.000Z",
    "updatedTask": {
      "id": "65b2f2b1e4b0a1c2d3e4f5b7",
      "title": "Deploy API Service",
      "priority": "high",
      "version": 3
    }
  }
}
```

---

## 12. Telemetry & Observability Specification

Every action proposal and execution emits execution telemetry through the existing AI platform telemetry infrastructure (`server/src/ai/utils/logger.ts`).

### 12.1 Tracked Telemetry Fields
```typescript
export interface CopilotActionTelemetryEvent {
  executionId: string;
  projectId: string;
  userId: string;
  provider: string;
  model: string;
  actionType: AllowedActionType;
  dryRunSuccess: boolean;
  confirmed: boolean;
  executionSuccess: boolean;
  latencyMs: number;
  failureReason?: string;
}
```

### 12.2 Telemetry Privacy Invariant
Telemetry MUST NEVER log prompts, user questions, AI textual answers, task titles, task descriptions, notes, or user PII.

---

## 13. Activity & Audit Integration

Domain mutations executed via AI action handlers reuse the existing `activity.service.ts` pipeline.

### 13.1 Metadata Enrichment
Activity records created by Copilot actions will include:
```json
{
  "initiatedBy": "copilot",
  "copilotExecutionId": "exec_12345",
  "actionType": "UPDATE_TASK_PRIORITY"
}
```
Existing activity types (`TASK_PRIORITY_CHANGED`, `TASK_STATUS_CHANGED`, `TASK_CREATED`, `TASK_UPDATED`, `TASK_PROJECT_CHANGED`) are preserved without schema fragmentation.

---

## 14. Prompt Evolution & AI Schema Response

### 14.1 Updated Copilot Response Schema
```typescript
export const ProjectCopilotResponseSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(1, "Copilot answer cannot be empty")
    .max(10000, "Copilot answer cannot exceed 10,000 characters"),
  references: z.array(ProjectCopilotReferenceSchema).max(20, "Maximum 20 references allowed").default([]),
  proposedAction: ProposedActionSchema.nullable().optional().default(null),
});
```

---

## 15. Quality Evaluation Strategy

Phase 28 adds 4 deterministic evaluators to `server/src/ai/evaluation/evaluators/`:

1. `action-schema-validity.evaluator.ts`: Evaluates whether proposed action strictly validates against `ProposedActionSchema`.
2. `action-reference-validity.evaluator.ts`: Evaluates whether `targetRef` exists in context `symbolicMap`.
3. `action-safety-boundary.evaluator.ts`: Evaluates that zero forbidden or destructive actions (`DELETE_*`) are ever proposed.
4. `action-groundedness.evaluator.ts`: Evaluates that action arguments match the explicit intent of the user prompt.

---

## 16. Frontend UX & State Management Architecture

```text
ProjectCopilotSheet (client/src/features/ai/components/copilot/ProjectCopilotSheet.tsx)
  │
  ├── CopilotMessageItem
  │     │
  │     └── Action Dry-Run Card (Rendered if message.proposedAction exists)
  │           ├── Target Entity Header & AI Explanation
  │           ├── Diff Viewer (Before: Medium ──► After: High)
  │           ├── [ Cancel ] button ──► Marks card as Cancelled
  │           └── [ Apply Action ] button ──► Triggers confirmActionMutation
  │
  └── useProjectCopilot hook
        └── On confirm success:
              ├── Invalidates TanStack Query keys: ['tasks', projectId], ['activities', projectId]
              └── Updates message card state to 'Applied'
```

---

## 17. Responsive & Accessibility Specifications

- **Drawer Width**: 440px on Desktop (`lg`), 100% full-screen drawer on Mobile (`< sm`).
- **Diff Layout**: Side-by-side flex row on Desktop; stacked vertical column on Mobile.
- **Accessibility**:
  - `aria-live="polite"` status announcements for dry-run loading and apply action completion.
  - Keyboard navigation support (`Tab`, `Enter` to confirm, `Escape` to cancel).
  - High-contrast visual focus indicators for buttons and diff chips.

---

## 18. Work Package Breakdown (WP-01 to WP-05)

### WP-01: Action Domain Foundation & Typed Registry
- **Goal**: Define Action Zod schemas, discriminated union types, and Action Registry.
- **Expected Files**:
  - `server/src/ai/actions/action.types.ts`
  - `server/src/ai/actions/action.schema.ts`
  - `server/src/ai/actions/action.registry.ts`
  - `server/src/tests/action-registry.test.ts`
- **Exit Criteria**: 100% unit test coverage for schema validation and registry lookup.

### WP-02: Action Handlers & Execution Engine
- **Goal**: Implement action handlers and executor engine.
- **Expected Files**:
  - `server/src/ai/actions/action.executor.ts`
  - `server/src/ai/actions/handlers/*.handler.ts`
  - `server/src/tests/action-executor.test.ts`
- **Exit Criteria**: Handlers call `task.service.ts` / `project.service.ts` with OCC and symbolic resolution.

### WP-03: Backend Dry-Run & Cryptographic Confirmation API
- **Goal**: Build Express API routes, controllers, validators, and token generator.
- **Expected Files**:
  - `server/src/controllers/copilot-action.controller.ts`
  - `server/src/routes/copilot-action.routes.ts`
  - `server/src/validators/copilot-action.validator.ts`
  - `server/src/utils/copilot-action-token.ts`
  - `server/src/tests/copilot-action-api.test.ts`
- **Exit Criteria**: End-to-end integration tests for `/dry-run` and `/confirm` endpoints passing.

### WP-04: AI Platform Integration & Copilot Prompt Evolution
- **Goal**: Integrate action proposals into Copilot prompt and `ProjectCopilotAIService`.
- **Expected Files**:
  - `server/src/ai/prompts/definitions/project-copilot.prompt.ts`
  - `server/src/ai/schemas/project-copilot.schema.ts`
  - `server/src/services/project-copilot-ai.service.ts`
  - `server/src/tests/project-copilot-action-prompt.test.ts`
- **Exit Criteria**: Copilot generates structured action proposals in responses.

### WP-05: Frontend Dry-Run UX & Quality Evaluation Suite
- **Goal**: Build Action Dry-Run UI component, hook integration, and Phase 28 quality evaluators.
- **Expected Files**:
  - `client/src/features/ai/components/copilot/CopilotActionCard.tsx`
  - `client/src/features/ai/components/copilot/CopilotMessageItem.tsx`
  - `client/src/features/ai/hooks/useProjectCopilot.ts`
  - `server/src/ai/evaluation/evaluators/action-*.evaluator.ts`
  - `server/src/tests/copilot-action-eval.test.ts`
- **Exit Criteria**: Visual dry-run card operational with query invalidation; evaluation suite passing.

---

## 19. Comprehensive Testing Strategy

1. **Unit Testing**: 100% coverage on Action schemas, token signing, symbolic resolution, and handlers.
2. **Integration Testing**: API route testing for `/dry-run` and `/confirm`, OCC conflict rejection, invalid token handling.
3. **Quality Evaluation**: Offline evaluation runs against golden fixtures evaluating action schema validity and groundedness.
4. **Security Testing**: Adversarial tests attempting prompt injection of `DELETE_PROJECT`, forged tokens, expired tokens, and cross-tenant target IDs.
5. **Manual Verification**: Browser testing of Copilot sheet action cards and optimistic UI state sync.

---

## 20. Frozen Architectural Invariants

1. **Inviolable AI Safety Boundary**: The AI model NEVER mutates the database directly. All mutations flow through human confirmation.
2. **Typed Proposals Only**: The model may only propose typed actions defined in `AllowedActionType`.
3. **Explicit Human Confirmation**: Every domain mutation requires explicit user confirmation via signed token.
4. **Cryptographic Tokens**: Confirmation tokens are HMAC signed with 5-minute expiration and single-use nonces.
5. **Domain Service Encapsulation**: Action handlers must reuse pre-existing domain services (`task.service.ts`, `project.service.ts`).
6. **Symbolic References Only**: Models work strictly with symbolic IDs (`task_1`). Raw ObjectIds are prohibited in prompts.
7. **Dual-Layer Authorization**: User ownership is verified before context generation AND before action execution.
8. **Optimistic Concurrency Control**: All task updates verify `expectedVersion === task.__v` and reject conflicts (`409`).
9. **Zero Destructive Actions**: Destructive actions (`DELETE_*`) are strictly blacklisted.
10. **Auditable Activity Log**: Every executed action creates an activity log entry enriched with `initiatedBy: "copilot"`.

---

## 21. Summary of Gate 1 Verification

- **Branch**: `feat/phase-27-read-only-project-copilot`
- **Commit**: `8b91dc8048fec399704930b3cda05f7d9c552861`
- **Files Inspected**:
  - `docs/phases/phase-28-controlled-ai-actions/investigation.md`
  - `docs/roadmap.md`
  - `server/src/services/project-copilot-ai.service.ts`
  - `server/src/domain/copilot-context-builder.ts`
  - `server/src/domain/copilot-reference-resolver.ts`
  - `server/src/services/task.service.ts`
- **Final Allowed Actions**: `CREATE_TASK`, `UPDATE_TASK_STATUS`, `UPDATE_TASK_PRIORITY`, `UPDATE_TASK_DUE_DATE`, `ADD_TASK_LABEL`
- **Final Forbidden Actions**: `DELETE_PROJECT`, `DELETE_TASK`, `BULK_DELETE`, `USER_MANAGEMENT`, `SECURITY_OPERATIONS`, `BILLING_OPERATIONS`, `BATCH_MUTATIONS`
- **Final API Strategy**: Dual-stage `POST /api/copilot/actions/dry-run` and `POST /api/copilot/actions/confirm`
- **Final Execution Strategy**: Action Registry -> Delegating Handlers -> `task.service.ts` / `project.service.ts`
- **Final Security Model**: Dual-layer authorization + HMAC signed tokens + symbolic references + OCC check
- **Final Evaluation Model**: 4 deterministic evaluators (`action-schema-validity`, `action-reference-validity`, `action-safety-boundary`, `action-groundedness`)
- **Final Frontend Model**: Inline Action Card in `CopilotMessageItem` + `useProjectCopilot` TanStack Query sync
- **Work Packages**: WP-01 through WP-05
- **Unresolved Questions**: 0
- **BLOCKER count**: 0
- **MAJOR count**: 0
- **MINOR count**: 0
- **Production files modified**: 0
- **Test files modified**: 0
- **Live Gemini calls**: 0
- **Live Anthropic calls**: 0
- **git diff --check result**: Clean (0 issues)

---

============================================================
GATE 1 VERDICT: APPROVED — READY FOR WP-01
============================================================
