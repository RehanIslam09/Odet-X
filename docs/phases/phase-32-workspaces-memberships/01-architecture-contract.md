# Phase 32 — Architecture Contract
## Workspaces, Memberships & Multi-Tenant Foundation
**Phase**: Phase 32 — Workspaces & Memberships
**Status**: APPROVED & FROZEN (Gate 1 Architecture Contract)
**Date**: July 29, 2026
**Author**: Antigravity AI
---
## 1. Status & Purpose
This document establishes the binding, non-negotiable architectural contract for **Phase 32 — Workspaces & Memberships**. It transitions the AI Project Manager platform from a single-user direct ownership model (`User -> Project`) to a multi-tenant collaborative architecture (`Workspace -> WorkspaceMember -> Project`).
Every Phase 32 work package (WP-01 through WP-07) MUST strictly adhere to the decisions, schemas, invariants, and boundaries defined herein. Any deviation requires a formal Architecture Contract Amendment approved at Gate 1.
---
## 2. Evidence Reviewed
This contract is grounded strictly in empirical repository evidence compiled during Phase 32 investigation:
- **Repository Root**: `/home/rehan/Developer/ai-project-manager`
- **Investigation Report**: `docs/phases/phase-32-workspaces-memberships/00-repository-investigation.md`
- **Persisted Domain Models Inspected**: `User`, `Project`, `Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`, `Activity`, `Notification`.
- **Domain Services & AI Subsystems Inspected**: 15 domain services, Copilot context builder, Action executor, Proactive Intelligence worker, Global Search service.
- **Automated Test Infrastructure**: 95 test files total (71 server unit/integration/E2E test files, 24 client test files).
---
## 3. Phase Boundary
### Phase 32 Scope (WORKSPACES + MEMBERSHIPS + TENANT FOUNDATION)
Phase 32 SHALL deliver:
- Top-level `Workspace` and `WorkspaceMember` MongoDB models.
- Personal workspace automatic provisioning upon user registration.
- Idempotent backfill migration script for existing users and resources.
- Canonical tenant key (`workspaceId`) on `Project` and all child entities (`Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`, `Activity`).
- Tenant isolation across all domain services, AI subsystems (Planning, Copilot, Actions, Memory, Proactive Intelligence, Search), and APIs.
- Workspace REST API (`/api/v1/workspaces`).
- Centralized workspace authorization middleware (`resolveWorkspace`, `requireWorkspaceMember`).
- Frontend Workspace state, Workspace Switcher UX, and `/w/:workspaceSlug` routing.
- Comprehensive cross-tenant security and isolation test suite.
- Minimal membership role concept (`"OWNER" | "MEMBER"`).
### Phase 33 Scope (RBAC + COLLABORATION — Explicitly Out of Scope for Phase 32)
Phase 33 SHALL own:
- Generalized fine-grained RBAC permission engine (`can(user, action, resource)`).
- Granular role matrix (`ADMIN`, `MEMBER`, `VIEWER`, custom roles).
- Workspace invitation links, email invite flows, join tokens.
- Advanced member management UI and invitation administration.
- Real-time collaboration, WebSockets, SSE presence, collaborative cursors.
---
## 4. Domain Model
### A. Workspace Model (`server/src/models/workspace.model.ts`)
```typescript
export interface IWorkspace {
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  isPersonal: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
- **`name`**: String, required, trim, min 1, max 80 chars.
- **`slug`**: String, required, unique, lowercase, trim, min 2, max 50 chars. URL-safe identifier matching `/^[a-z0-9-]+$/`.
- **`ownerId`**: ObjectId referencing `User`, required, immutable. Represents the creator/primary owner.
- **`isPersonal`**: Boolean, required, default `false`. `true` indicates a user's personal workspace.
- **Timestamps**: Mongoose `timestamps: true` (`createdAt`, `updatedAt`).
#### Invariants & Rules:
1. **Slug Uniqueness**: MongoDB unique index `{ slug: 1 }` (case-insensitive lowercase). Slug generation helper `slugify(name)` appends random hex suffix on collision (e.g. `rehan-workspace-4f2a`). Slugs ARE mutable by workspace `OWNER` with uniqueness re-validation.
2. **Personal Workspace Uniqueness**: Partial unique index `{ ownerId: 1, isPersonal: 1 }` where `isPersonal: true`. Every user SHALL possess exactly one personal workspace.
3. **Personal Workspace Immutability**: Personal workspaces CANNOT be deleted individually. They are deleted only when the associated `User` account is deleted.
---
### B. WorkspaceMember Model (`server/src/models/workspace-member.model.ts`)
```typescript
export type WorkspaceRole = "OWNER" | "MEMBER";
export interface IWorkspaceMember {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: WorkspaceRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```
- **`workspaceId`**: ObjectId referencing `Workspace`, required.
- **`userId`**: ObjectId referencing `User`, required.
- **`role`**: String enum `["OWNER", "MEMBER"]`, required, default `"MEMBER"`.
- **`joinedAt`**: Date, default `Date.now`.
#### Invariants & Rules:
1. **Unique Membership**: Compound unique index `{ workspaceId: 1, userId: 1 }`. A user SHALL NOT be added to the same workspace more than once.
2. **Owner Membership Sync**: The workspace's `ownerId` user MUST always possess a `WorkspaceMember` record with `role: "OWNER"`.
3. **At-Least-One Owner**: A workspace MUST contain at least one member with `role: "OWNER"`. A lone owner CANNOT leave or be removed without appointing another owner.
---
### C. Tenant / Actor / Creator / Recipient Identity Semantics
To eliminate identity conflation across the system:
- **Canonical Tenant Boundary (`workspaceId`)**: The MongoDB ObjectId referencing `Workspace`. Defines the data boundary. All tenant queries MUST filter by `workspaceId`.
- **Actor Identity (`actorId` / `req.user._id`)**: The `User` who performed the operation. Recorded in `Activity.actorId` and `Notification.actorId`.
- **Creator Identity (`createdBy` / `owner`)**: The `User` who originally created the document. Preserved in `Project.owner` and child document `owner` fields for historical audit.
- **Recipient Identity (`recipientId`)**: The `User` targeted by a private notification. Preserved in `Notification.recipientId`.
---
## 5. Architectural Invariants
1. **Tenant Isolation Invariant**: No API endpoint, search service, Copilot context builder, memory retriever, or background worker SHALL return resources belonging to a workspace where the authenticated user is not an active member.
2. **Personal Workspace Invariant**: Every registered user SHALL possess exactly one personal workspace (`isPersonal: true`), created automatically upon account creation.
3. **Child Denormalization Invariant**: All child entities (`Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`, `Activity`) SHALL store `workspaceId` directly. If a child document has both `workspaceId` and `projectId`, `child.workspaceId` MUST equal `parentProject.workspaceId`.
4. **Idempotent Migration Invariant**: Database migration scripts SHALL be fully idempotent, safe to execute multiple times, and SHALL NOT assign orphaned resources to arbitrary system/fallback workspaces.
5. **Creator Attribution Invariant**: Introducing `workspaceId` as the tenant boundary SHALL NOT overwrite or delete original document creator attribution (`Project.owner`).
6. **User Private Notification Invariant**: Notifications SHALL remain strictly recipient-scoped (`recipientId`) and SHALL NOT leak across workspace members.
7. **Action Confirmation Token Isolation**: Copilot action confirmation tokens SHALL sign `workspaceId`. Confirmation execution SHALL re-verify active workspace membership before executing mutations.
8. **Frontend Cache Isolation**: All workspace-scoped TanStack Query cache keys SHALL include `workspaceId` (e.g. `["workspace", workspaceId, "projects"]`). Switching active workspaces MUST trigger cache invalidation.
---
## 6. Tenant-Scoped Entity Matrix
| Entity | Tenant-Scoped? | Tenant Key (`workspaceId`) | Creator Field | Actor Field | User Private? | Migration Action |
|---|---|---|---|---|---|---|
| **User** | No | N/A | Self (`_id`) | N/A | Yes | Identity anchor for memberships |
| **Workspace** | Self | `_id` | `ownerId` | N/A | No | New top-level collection |
| **WorkspaceMember** | Yes | `workspaceId` | N/A | `userId` | No | New top-level collection |
| **Project** | Yes | `workspaceId` (required) | `owner` | N/A | No | Add `workspaceId`, keep `owner` as creator |
| **Task** | Yes | `workspaceId` (required) | `owner` | N/A | No | Add `workspaceId`, keep `owner` as creator |
| **Milestone** | Yes | `workspaceId` (required) | `owner` | N/A | No | Add `workspaceId`, keep `owner` as creator |
| **PlanDraft** | Yes | `workspaceId` (required) | `owner` | N/A | No | Add `workspaceId`, update unique partial index |
| **ProjectMemory** | Yes | `workspaceId` (required) | `owner` | N/A | No | Add `workspaceId`, update compound index |
| **ProjectRecommendation** | Yes | `workspaceId` (required) | `owner` | N/A | No | Add `workspaceId`, update indexes |
| **Activity** | Yes | `workspaceId` (required) | `owner` | `actorId` | No | Add `workspaceId`, retain `actorId` |
| **Notification** | No | `metadata.workspaceId` | N/A | `actorId` | Yes (`recipientId`) | Retain `recipientId` user isolation |
---
## 7. Request Workspace Resolution
### Middleware Pipeline & Order
All authenticated workspace API requests SHALL pass through the following middleware sequence:
```
HTTP Request
  │
  ▼
1. authenticate (auth.middleware.ts)
   └─ Verifies Bearer JWT -> attaches req.user (User document)
  │
  ▼
2. resolveWorkspace (workspace-auth.middleware.ts)
   └─ Extracts workspace identity from:
      a) Route param (e.g. req.params.workspaceId or req.params.workspaceSlug)
      b) HTTP Header: X-Workspace-Id
   └─ Fetches Workspace document -> attaches req.workspace
  │
  ▼
3. requireWorkspaceMember (workspace-auth.middleware.ts)
   └─ Queries WorkspaceMember.findOne({ workspaceId: req.workspace._id, userId: req.user._id })
   └─ If not found: Throws 404 Not Found (prevents resource existence leakage)
   └─ If found: Attaches req.workspaceMember
  │
  ▼
4. Domain Route Handler
```
### Request Attachment Signature
```typescript
declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      workspace?: IWorkspaceDocument;
      workspaceMember?: IWorkspaceMemberDocument;
    }
  }
}
```
---
## 8. Authorization Failure Semantics
To prevent resource-existence probing across tenant boundaries, APIs SHALL conform to the following error semantics:
| Trigger Scenario | HTTP Code | Error Class | Response Message |
|---|---|---|---|
| Unauthenticated request (missing/invalid Bearer token) | **401** | `UnauthorizedError` | `"Authentication required."` |
| Target workspace does not exist | **404** | `NotFoundError` | `"Workspace not found."` |
| User is NOT a member of requested workspace | **404** | `NotFoundError` | `"Workspace not found."` |
| Requested resource (`Project`, `Task`, etc.) does not exist in active workspace | **404** | `NotFoundError` | `"<Resource> not found."` |
| Member attempts OWNER-only action (e.g. rename workspace) | **403** | `ForbiddenError` | `"Workspace owner permission required."` |
| Member attempts account deletion as sole OWNER of multi-member custom workspace | **400** | `BadRequestError` | `"Cannot delete account while owning collaborative workspaces. Transfer ownership first."` |
---
## 9. Workspace API Contract
### REST Endpoints (`server/src/routes/workspace.routes.ts`)
| Method | Route Path | Purpose | Min Role Required |
|---|---|---|---|
| `GET` | `/api/v1/workspaces` | List all workspaces current user belongs to | Authenticated User |
| `POST` | `/api/v1/workspaces` | Create new custom workspace | Authenticated User |
| `GET` | `/api/v1/workspaces/:workspaceId` | Get workspace details & active member list | `MEMBER` |
| `PATCH` | `/api/v1/workspaces/:workspaceId` | Update workspace name or slug | `OWNER` |
| `DELETE` | `/api/v1/workspaces/:workspaceId` | Delete custom workspace (must be empty of active projects) | `OWNER` |
| `GET` | `/api/v1/workspaces/:workspaceId/members` | List members of workspace | `MEMBER` |
| `DELETE` | `/api/v1/workspaces/:workspaceId/members/:userId` | Leave workspace or remove member | `MEMBER` (self) / `OWNER` (others) |
*Note on Invitations*: Add-by-email, invite tokens, and join links belong strictly to Phase 33.
---
## 10. Personal Workspace Provisioning
### Registration Workflow (`server/src/services/auth.service.ts`)
During user registration (`registerUser`), personal workspace provisioning SHALL occur transactionally:
1. Create `User` document.
2. Generate default personal workspace name: `${user.name}'s Workspace`.
3. Generate initial slug: `slugify(user.username)`. If collision occurs, append random 4-char hex suffix (`slugify(user.username)-4f2a`).
4. Create `Workspace` document (`isPersonal: true`, `ownerId: user._id`).
5. Create `WorkspaceMember` document (`workspaceId: workspace._id`, `userId: user._id`, `role: "OWNER"`).
```typescript
// Explicit domain service orchestration inside transaction session
const session = await mongoose.startSession();
session.startTransaction();
try {
  const user = await User.create([userData], { session });
  const workspace = await Workspace.create([{
    name: `${user[0].name}'s Workspace`,
    slug: initialSlug,
    ownerId: user[0]._id,
    isPersonal: true,
  }], { session });

  await WorkspaceMember.create([{
    workspaceId: workspace[0]._id,
    userId: user[0]._id,
    role: "OWNER",
  }], { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```
---
## 11. Existing Data Migration Contract
### Migration Script (`server/src/scripts/migrate-workspaces.ts`)
An idempotent, restartable backfill script SHALL migrate pre-existing single-user data:
1. **User Personal Workspaces**: For each `User` lacking a personal workspace:
   - Create `Workspace` (`isPersonal: true`, `ownerId: user._id`).
   - Create `WorkspaceMember` (`role: "OWNER"`).
2. **Project Backfill**: For each `Project` where `workspaceId` is missing/null:
   - Find owner user's personal workspace.
   - Set `project.workspaceId = personalWorkspace._id`.
3. **Child Entity Backfill**: For each `Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`, `Activity` where `workspaceId` is missing/null:
   - Look up parent project's `workspaceId` (or owner's personal workspace).
   - Set `entity.workspaceId = resolvedWorkspaceId`.
4. **Orphan Quarantine Strategy**: If a project or child resource references a non-existent `owner` user:
   - Do NOT assign to an arbitrary fallback/system workspace.
   - Set `isDeleted: true` and add `metadata.migrationQuarantined: true`.
   - Log audit line to `migration-audit.log`.
---
## 12. Required-Field Transition Strategy
To prevent schema validation crashes during code deployment, `workspaceId` SHALL transition in 4 staged steps:
- **Stage A (Groundwork)**: Add `workspaceId` field to Mongoose schemas with `required: false`.
- **Stage B (Backfill Execution)**: Execute idempotent migration script `migrate-workspaces.ts`.
- **Stage C (Verification)**: Execute `verify-workspace-migration.ts` confirming `0` documents exist with missing `workspaceId`.
- **Stage D (Enforcement)**: Update Mongoose schemas setting `workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true }`.
---
## 13. Index Contract
All tenant-scoped MongoDB indexes SHALL incorporate `workspaceId: 1`:
| Collection | New / Updated Index Definition | Index Options |
|---|---|---|
| `Workspace` | `{ slug: 1 }` | `unique: true` |
| `Workspace` | `{ ownerId: 1, isPersonal: 1 }` | `unique: true`, `partialFilterExpression: { isPersonal: true }` |
| `WorkspaceMember` | `{ workspaceId: 1, userId: 1 }` | `unique: true` |
| `WorkspaceMember` | `{ userId: 1, workspaceId: 1 }` | Background lookup index |
| `Project` | `{ workspaceId: 1, isDeleted: 1, archived: 1, updatedAt: -1 }` | Replaces owner-primary project index |
| `Task` | `{ workspaceId: 1, isDeleted: 1, archived: 1, updatedAt: -1 }` | Primary task list index |
| `Task` | `{ workspaceId: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 }` | Project task view index |
| `Task` | `{ workspaceId: 1, dependencies: 1 }` | Prerequisite lookup index |
| `Milestone` | `{ workspaceId: 1, projectId: 1, isDeleted: 1, position: 1 }` | Milestone list index |
| `PlanDraft` | `{ workspaceId: 1, projectId: 1, status: 1 }` | Plan draft query index |
| `PlanDraft` | `{ workspaceId: 1, projectId: 1 }` | `unique: true`, `partialFilterExpression: { status: "draft" }` |
| `ProjectMemory` | `{ workspaceId: 1, projectId: 1, updatedAt: -1, _id: -1 }` | Memory retrieval index |
| `ProjectRecommendation` | `{ workspaceId: 1, projectId: 1, status: 1, createdAt: -1 }` | Project recommendation index |
| `ProjectRecommendation` | `{ workspaceId: 1, status: 1, createdAt: -1 }` | Workspace recommendation index |
| `Activity` | `{ workspaceId: 1, _id: -1 }` | Workspace activity feed index |
| `Activity` | `{ workspaceId: 1, projectId: 1, _id: -1 }` | Project activity feed index |
---
## 14. Domain Service Scoping Contract
Every domain service method SHALL require `workspaceId` alongside `userId`:
```typescript
// Example: Project Service Scoping
export async function getProjectById(
  projectId: string,
  workspaceId: string,
  userId: string,
): Promise<IProjectDocument> {
  // 1. Verify workspace membership
  await verifyWorkspaceMembership(workspaceId, userId);
  // 2. Query project scoped to workspaceId
  const project = await Project.findOne({
    _id: projectId,
    workspaceId: new Types.ObjectId(workspaceId),
    isDeleted: false,
  });
  if (!project) {
    throw new NotFoundError("Project not found.");
  }
  return project;
}
```
---
## 15. AI Subsystem Tenancy Contract
1. **Phase 25 Planning**: `generatePlanDraft` and `commitPlanDraft` SHALL validate workspace membership and propagate `workspaceId` to created tasks and milestones.
2. **Phase 27 Copilot**: `buildCopilotContext({ projectId, workspaceId, userId })` SHALL validate workspace membership and scope all context assembly queries (tasks, milestones, memories, activities) to `workspaceId`.
3. **Phase 28 Controlled Actions**: `generateConfirmationToken` SHALL sign `workspaceId`. `confirmAction` SHALL verify that the executing user is an active member of `payload.workspaceId`.
4. **Phase 29 Memory**: `ProjectMemory` queries SHALL filter strictly by `workspaceId` and `projectId`. Memory SHALL NOT leak cross-workspace.
5. **Phase 30 Proactive Intelligence**: Worker candidate scanner SHALL group projects by `workspaceId`. Daily AI quota tracking SHALL remain per-user (`getUserDailyProactiveAICalls(userId, now)`) in Phase 32.
6. **Phase 31 Search**: `global-search.service.ts` SHALL accept `workspaceId` and filter all candidate queries by `workspaceId: activeWorkspaceId`.
---
## 16. Background Worker Contract
Background jobs (e.g. Proactive Intelligence worker) do not execute within HTTP request contexts.
Background workers SHALL:
1. Scan eligible projects matching `{ isDeleted: false, archived: false }`.
2. Extract project `workspaceId` and `owner` ID.
3. Execute signal detection and recommendation generation scoped strictly to `project.workspaceId`.
4. Recommendations created by workers SHALL store `workspaceId: project.workspaceId`.
---
## 17. Search Contract
- Global Search and Command Palette SHALL operate within the authenticated user's **current active workspace** (`workspaceId: activeWorkspaceId`).
- Command Palette keyboard navigation URLs SHALL resolve within active workspace context (`/w/:workspaceSlug/projects/:projectId`).
---
## 18. Activity & Notification Semantics
- **Activity**: `workspaceId` represents the tenant boundary. `actorId` represents the user who performed the action. System-generated activities set `actorId: user._id` or `actorId: workspace.ownerId`.
- **Notification**: Notifications SHALL remain strictly user-scoped (`recipientId`). Private user notifications SHALL NOT become shared workspace data. `metadata.workspaceId` MAY be included for deep-linking.
---
## 19. Frontend Workspace State Contract
- **Server State**: Managed via TanStack Query hooks (`useWorkspaces`, `useWorkspace`).
- **Active Workspace Selection**: Canonical source of truth is the URL slug (`/w/:workspaceSlug/...`). `localStorage` stores the default workspace preference for initial app load redirects.
- **Client Preference Hook**: `useActiveWorkspace()` parses URL route params and syncs default preference.
---
## 20. Routing Contract
React Router (`client/src/app/router.tsx`) SHALL adopt workspace slug URL prefixes:
```
/ -> Redirects to /w/:defaultPersonalWorkspaceSlug/dashboard
/w/:workspaceSlug/dashboard -> DashboardPage
/w/:workspaceSlug/projects -> ProjectsDashboardPage
/w/:workspaceSlug/projects/:projectId -> ProjectDetailPage
/w/:workspaceSlug/tasks -> TasksPage
/w/:workspaceSlug/tasks/:taskId -> TaskDetailPage
/w/:workspaceSlug/settings -> SettingsPage
```
Legacy un-prefixed URLs (`/projects`, `/tasks`) SHALL deterministically redirect to `/w/:defaultWorkspaceSlug/...`.
---
## 21. Workspace Switching & Cache Isolation
- All workspace-scoped TanStack Query keys SHALL include `workspaceId`:
  `queryKey: ["workspace", workspaceId, "projects"]`
- Switching active workspace SHALL call `queryClient.removeQueries({ queryKey: ["workspace"] })` to prevent transient rendering of stale cross-workspace data.
---
## 22. User Deletion Semantics
- Deleting a `User` account (`deleteUserAccount`):
  1. Soft-delete personal workspace (`isPersonal: true`, `ownerId: user._id`).
  2. If the user is the **sole OWNER** of a custom workspace with other members, account deletion SHALL be blocked (`400 Bad Request: Must transfer workspace ownership before deleting account`). Ownership transfer flows belong to Phase 33.
---
## 23. Security Threat Model
| Threat Scenario | Architectural Prevention |
|---|---|
| Direct ID tampering (`GET /projects/:otherTenantProjectId`) | Domain service enforces `workspaceId: activeWorkspaceId` & workspace membership |
| Copilot prompt injection cross-tenant | `buildCopilotContext` verifies project belongs to active workspace & user is workspace member |
| Confirmation token replay across workspaces | Token payload signs `workspaceId`. Token execution verifies executing user membership |
| Recommendation leakage cross-tenant | Recommendations filter strictly by `workspaceId` |
| Stale UI cache cross-tenant leak | TanStack Query keys prefixed with `workspaceId`, query cache cleared on switch |
---
## 24. Cross-Tenant Test Contract
Mandatory security test cases in `server/src/tests/cross-tenant-isolation.test.ts`:
1. **User A (Workspace A)** cannot read/update/delete **User B (Workspace B)** projects, tasks, or milestones.
2. **User A** cannot access Copilot context for Workspace B projects.
3. **User A** cannot confirm action tokens generated for Workspace B.
4. **User A** cannot retrieve Project Memories belonging to Workspace B.
5. **User A** global search returns zero results from Workspace B.
6. **User A** cannot access Workspace B via direct URL slug or ObjectId tampering.
7. Personal workspace uniqueness constraint enforces exactly one personal workspace per user.
---
## 25. Phase 32 / Phase 33 Boundary Checklist
- [x] Workspace & WorkspaceMember models -> **Phase 32**
- [x] Personal workspace provisioning & idempotent backfill script -> **Phase 32**
- [x] Service-level `workspaceId` tenant isolation -> **Phase 32**
- [x] Minimal `"OWNER" | "MEMBER"` roles -> **Phase 32**
- [x] Workspace REST API & Active Workspace Switcher -> **Phase 32**
- [ ] Granular RBAC permission engine (`can(user, action, resource)`) -> **Phase 33**
- [ ] `ADMIN` / `VIEWER` roles -> **Phase 33**
- [ ] Email invitation tokens & join links -> **Phase 33**
- [ ] Real-time WebSocket presence & collaborative cursors -> **Phase 33**
---
## 26. Implementation Work Packages
### Gate 1: Architecture Contract Approval (Current)
- Deliverable: `docs/phases/phase-32-workspaces-memberships/01-architecture-contract.md`
### WP-01: Workspace & WorkspaceMember Domain Models & Validation
- **Objective**: Create `Workspace` and `WorkspaceMember` Mongoose models, TypeScript interfaces, and Zod validators.
- **Files**: `server/src/models/workspace.model.ts`, `server/src/models/workspace-member.model.ts`, `server/src/validators/workspace.validator.ts`.
### WP-02: Automatic Provisioning & Idempotent Migration Script
- **Objective**: Implement personal workspace registration hook in `auth.service.ts` and idempotent backfill script `migrate-workspaces.ts`.
- **Files**: `server/src/services/auth.service.ts`, `server/src/scripts/migrate-workspaces.ts`.
### WP-03: Domain Service Workspace Tenant Scoping
- **Objective**: Add `workspaceId` to Mongoose schemas (`Project`, `Task`, `Milestone`, `PlanDraft`) and update project, task, and planning services.
- **Files**: `server/src/models/project.model.ts`, `server/src/models/task.model.ts`, `server/src/models/milestone.model.ts`, `server/src/models/plan-draft.model.ts`, `server/src/services/project.service.ts`, `server/src/services/task.service.ts`, `server/src/services/plan-draft.service.ts`, `server/src/services/plan-commit.service.ts`.
### WP-04: AI Subsystem Workspace Tenant Scoping
- **Objective**: Update Copilot context builder, Action service, Project Memory, Proactive Intelligence worker, and Global Search service for `workspaceId` scoping.
- **Files**: `server/src/models/project-memory.model.ts`, `server/src/models/project-recommendation.model.ts`, `server/src/services/project-copilot-ai.service.ts`, `server/src/services/copilot-action.service.ts`, `server/src/services/project-memory.service.ts`, `server/src/services/proactive-recommendation.service.ts`, `server/src/services/proactive-intelligence-worker.service.ts`, `server/src/services/global-search.service.ts`.
### WP-05: Workspace REST API & Workspace Authorization Middleware
- **Objective**: Implement workspace authorization middleware (`resolveWorkspace`, `requireWorkspaceMember`), workspace controller, and routes.
- **Files**: `server/src/middleware/workspace-auth.middleware.ts`, `server/src/controllers/workspace.controller.ts`, `server/src/routes/workspace.routes.ts`, `server/src/app.ts`.
### WP-06: Frontend Workspace State, Switcher UX & Routing
- **Objective**: Implement frontend workspace state (TanStack Query), Workspace Switcher component, `/w/:workspaceSlug` routing, and URL context.
- **Files**: `client/src/features/workspaces/...`, `client/src/components/layout/DashboardNavbar.tsx`, `client/src/app/router.tsx`.
### WP-07: Cross-Workspace Security Audit & Test Suite Migration
- **Objective**: Create comprehensive cross-tenant security test suite and update existing test fixtures for workspace context.
- **Files**: `server/src/tests/cross-tenant-isolation.test.ts`, server test fixtures.
### Gate 2 / Gate 3: Final Verification & Acceptance
- Automated verification (`npm run verify`), security audit, manual browser verification, Gate 3 sign-off.
---
## 27. Gate 1 Acceptance Checklist
- [x] Canonical tenant key (`workspaceId`) defined.
- [x] Workspace schema semantics specified.
- [x] WorkspaceMember semantics specified.
- [x] Personal workspace invariant specified.
- [x] Minimal role boundary (`"OWNER" | "MEMBER"`) locked.
- [x] Owner/creator migration semantics specified (`Project.owner` preserved as creator metadata).
- [x] Request workspace resolution middleware pipeline specified.
- [x] API workspace identifier strategy specified.
- [x] Authorization failure error semantics specified (`401`/`404`/`403`).
- [x] Workspace REST API contract specified.
- [x] Transactional registration provisioning specified.
- [x] Idempotent migration script ordering specified.
- [x] Orphan resource quarantine strategy specified.
- [x] Staged required-field transition strategy specified.
- [x] All 16 MongoDB compound index definitions specified.
- [x] Phase 25 Planning workspace tenancy specified.
- [x] Phase 27 Copilot workspace tenancy specified.
- [x] Phase 28 Controlled Actions token binding specified.
- [x] Phase 29 Memory workspace tenancy specified.
- [x] Phase 30 Proactive Intelligence worker tenancy specified.
- [x] AI quota semantics locked (retained per-user in Phase 32).
- [x] Phase 31 Search workspace tenancy specified.
- [x] Background worker workspace tenancy specified.
- [x] Activity tenant vs. actor semantics specified.
- [x] Notification recipient privacy semantics specified.
- [x] Frontend source of truth specified (URL slug canonical).
- [x] Route architecture `/w/:workspaceSlug` specified.
- [x] Workspace switching cache isolation specified.
- [x] TanStack Query key isolation specified.
- [x] Account deletion semantics specified.
- [x] Mandatory cross-tenant security test cases specified.
- [x] Phase 32 / Phase 33 boundary locked.
- [x] Implementation workpackage sequence locked.
**Gate 1 Recommendation**: **APPROVE** (Proceed to WP-01 upon user authorization).
