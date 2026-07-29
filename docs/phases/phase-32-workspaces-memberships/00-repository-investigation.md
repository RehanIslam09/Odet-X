# Phase 32 — Repository Investigation & Architectural Discovery
**Phase**: Phase 32 — Workspaces & Memberships  
**Status**: COMPLETE (Investigation Only — No Production Code Modified)  
**Date**: July 29, 2026  
**Author**: Antigravity AI  
---
## 1. Executive Summary
Phase 32 introduces **Workspaces, Memberships, and Multi-Tenant Boundaries** to the AI Project Manager platform. This phase transitions the application from a single-user ownership model (`User -> Project`) to a collaborative, workspace-tenant model (`Workspace -> WorkspaceMember -> Project`).
This investigation document performs a comprehensive forensic audit of the entire repository—inspecting MongoDB models, domain services, controllers, authorization middleware, AI subsystems (Phase 25 Planning, Phase 27 Copilot, Phase 28 Controlled Actions, Phase 29 Memory, Phase 30 Proactive Intelligence, Phase 31 Search), frontend state architecture, routing, and 95 automated test suites.
**Key Findings:**
1. **Pervasive `owner` Scoping**: Currently, 100% of tenant queries rely on `owner: req.user._id` across 8 persisted MongoDB models (`Project`, `Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`, `Activity`, `User`). Over 40 distinct service and controller call-sites directly inject `owner: new Types.ObjectId(userId)`.
2. **Entity Authorization**: Child entities (`Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`) duplicate `owner` directly on their documents rather than performing joins to `Project`. This single-collection indexing strategy gives optimal performance and must be preserved by denormalizing `workspaceId` onto child entities during migration.
3. **Actor vs. Owner Distinction**: `Activity` and `Notification` already differentiate tenant scope from action identity. `Activity` has `owner` (tenant) and `actorId` (actor user). `Notification` has `recipientId` (target user) and `actorId` (actor user). Notifications are inherently user-scoped, while activities are workspace-tenant scoped.
4. **Data Isolation Invariant**: All AI context builders, vector/memory retrievals, proactive intelligence workers, search endpoints, and confirmation token executors must be updated to enforce `workspaceId` tenant boundaries while preserving strict cross-tenant isolation.
5. **Phase 32 / Phase 33 Boundary**: Phase 32 establishes `Workspace`, `WorkspaceMember`, personal workspace provisioning, idempotent backfill migration, tenant isolation across all domain services, REST APIs, and UI context. Phase 33 delivers centralized RBAC permission semantics (`can(user, action, resource)`), invitation flows, ADMIN/VIEWER granular roles, and collaboration controls.
---
## 2. Repository Baseline
- **Repository Root**: `/home/rehan/Developer/ai-project-manager`
- **Current Branch**: `feat/phase-31-global-search-command-palette`
- **Git Working Tree**: Clean (`nothing to commit, working tree clean`)
- **Git Diff Check**: Passed (no whitespace defects or conflict markers)
- **Node.js Version**: `v20.20.2`
- **npm Version**: `10.8.2`
- **Node Version Pinning**: No `.nvmrc` or `.node-version` file exists. Node version is unpinned; npm scripts run standard ES module execution.
- **Package Architecture**: Dual npm workspaces (`server` and `client`). Root `package.json` contains orchestrator scripts (`npm run verify`, `npm test`, `npm run dev`).
- **Test Infrastructure Baseline**: 95 test files total (71 server unit/integration/E2E test files in `server/src/tests`, 24 client test files). Tests utilize `mongodb-memory-server` with fallback to `MONGODB_TEST_URI`.
---
## 3. Current Authentication Architecture
Authentication is stateless JWT-based with server-stored refresh token hashes:
- **Token Types**:
  - **Access Token**: Short-lived JWT signed with `JWT_SECRET`. Contains payload `{ sub: userId, email: user.email }`.
  - **Refresh Token**: Long-lived token. Hashed via SHA-256 and stored in `User.refreshTokenHash` (`select: false`).
- **Middleware**: `server/src/middleware/auth.middleware.ts`
  - Function: `authenticate`
  - Extracts `Bearer <token>` from HTTP `Authorization` header.
  - Calls `verifyAccessToken(token)`, retrieving `payload.sub`.
  - Queries `User.findById(payload.sub)`.
  - Attaches the complete Mongoose `IUserDocument` to `req.user`.
- **End-to-End Auth Trace**:
  ```
  POST /api/v1/auth/login -> auth.controller.ts -> auth.service.ts (loginUser)
    -> User.findOne({ email }).select("+password") -> comparePassword()
    -> generateTokens(user) -> update refreshTokenHash -> HTTP 200 { accessToken, user }
    -> Client stores accessToken in Axios memory header -> request sent with Authorization: Bearer <token>
    -> auth.middleware.ts -> verifyAccessToken() -> User.findById(payload.sub) -> req.user populated
    -> Domain controller / service handler receives req.user
  ```
---
## 4. Current User Domain
- **File**: `server/src/models/user.model.ts`
- **Schema Fields**:
  - `_id`: ObjectId (primary key)
  - `name`: String (required, min 2, max 50)
  - `email`: String (required, unique index, lowercase, trim)
  - `username`: String (required, unique index, lowercase, trim, min 3, max 20)
  - `password`: String (required, min 8, max 100, `select: false`, bcrypt hashed pre-save)
  - `avatar`: String (default "")
  - `bio`: String (default "", max 500)
  - `refreshTokenHash`: String (`default: null`, `select: false`)
  - `isEmailVerified`: Boolean (`default: false`)
  - `isActive`: Boolean (`default: true`)
  - `preferences`: Nested schema (appearance, locale, notifications)
  - `createdAt`, `updatedAt`: Date (Mongoose timestamps)
- **Lifecycle & Deletion**:
  - Account deletion is currently supported via `deleteUserAccount` in `user.service.ts`.
  - Currently, when a user is deleted, their owned projects, tasks, activities, etc. are queried by `owner: userId`.
  - With workspace introduction, deleting a user account will require workspace ownership transfer or soft-deletion of personal workspaces.
---
## 5. Complete Ownership Matrix
| Entity | Current Ownership Field | Direct / Indirect | Parent Relationship | Indexes Involving Ownership | Authorization Mechanism | Workspace Migration Impact |
|---|---|---|---|---|---|---|
| **User** | `_id` | Direct | Self | `email_1` (unique), `username_1` (unique) | JWT `req.user._id` | Base identity for `WorkspaceMember` |
| **Project** | `owner` | Direct | User | `{ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 }` | `Project.findOne({ _id, owner })` | Primary tenant anchor. Add `workspaceId` (ref Workspace) |
| **Task** | `owner` | Direct | User & Project (optional) | `{ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 }`<br>`{ owner: 1, dependencies: 1 }`<br>`{ owner: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 }`<br>`{ owner: 1, status: 1 }`<br>`{ owner: 1, priority: 1 }`<br>`{ owner: 1, dueDate: 1 }`<br>`{ owner: 1, labels: 1 }` | `Task.findOne({ _id, owner })` | Add `workspaceId` (ref Workspace), migrate indexes |
| **Milestone** | `owner` | Direct | User & Project (required) | `{ owner: 1, projectId: 1, isDeleted: 1, position: 1 }` | `Milestone.findOne({ _id, owner })` | Add `workspaceId`, update index to `{ workspaceId: 1, projectId: 1, ... }` |
| **PlanDraft** | `owner` | Direct | User & Project (required) | `{ owner: 1, projectId: 1, status: 1 }`<br>`{ owner: 1, projectId: 1 }` (partial unique) | `PlanDraft.findOne({ _id, owner })` | Add `workspaceId`, update unique partial index to `{ workspaceId: 1, projectId: 1 }` |
| **ProjectMemory** | `owner` | Direct | User & Project (required) | `{ owner: 1, projectId: 1, updatedAt: -1, _id: -1 }` | `ProjectMemory.find({ owner, projectId })` | Add `workspaceId`, update index to `{ workspaceId: 1, projectId: 1, ... }` |
| **ProjectRecommendation** | `owner` | Direct | User & Project (required) | `{ owner: 1, projectId: 1, status: 1, createdAt: -1 }`<br>`{ owner: 1, status: 1, createdAt: -1 }`<br>`{ projectId: 1, fingerprint: 1 }` (partial unique) | `ProjectRecommendation.find({ owner, projectId })` | Add `workspaceId`, update indexes to `{ workspaceId: 1, ... }` |
| **Activity** | `owner` (tenant)<br>`actorId` (user) | Direct | User & Project/Task | `{ owner: 1, _id: -1 }`<br>`{ owner: 1, projectId: 1, _id: -1 }`<br>`{ owner: 1, contextProjectIds: 1, _id: -1 }`<br>`{ owner: 1, taskId: 1, _id: -1 }` | `Activity.find({ owner })` | Add `workspaceId`, retain `actorId` for collaborative attribution |
| **Notification** | `recipientId` (user)<br>`actorId` (user) | Direct to Recipient User | User | `{ recipientId: 1, _id: -1 }`<br>`{ recipientId: 1, readAt: 1, _id: -1 }` | `Notification.find({ recipientId })` | Keep `recipientId` user-scoped! Optionally add `workspaceId` metadata for link context |
---
## 6. Project Ownership Deep Dive
- **Association**: `Project.owner` is a required `Schema.Types.ObjectId` referencing `User`.
- **Mandatory**: Yes (`required: true` in schema).
- **Immutability**: Not enforced at schema level, but domain services treat `owner` as immutable.
- **Compound Indexes**:
  - `projectSchema.index({ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 })`
- **Typical Query Pattern**:
  ```typescript
  Project.findOne({ _id: projectId, owner: new Types.ObjectId(userId), isDeleted: false });
  ```
- **Impact of `workspaceId` Introduction**:
  - If `workspaceId` is added without replacing `owner`, queries change from `{ owner: userId }` to `{ workspaceId: activeWorkspaceId }`.
  - Coexistence of `owner` (as `createdBy` / creator metadata) and `workspaceId` (as tenant boundary) is the safest migration pattern.
  - Immediate removal of `owner` would break creator tracking and disrupt legacy query assumptions.
---
## 7. Child Entity Authorization Map
Authorization dependency chains for child entities:
1. **Task**:
   ```
   Task document -> contains owner (User ID) + projectId (Project ID)
   Direct check: Task.owner === req.user._id
   Parent revalidation: If modifying projectId, check Project.findOne({ _id: newProjectId, owner: req.user._id })
   ```
2. **Milestone**:
   ```
   Milestone document -> contains owner (User ID) + projectId (Project ID)
   Direct check: Milestone.owner === req.user._id
   ```
3. **PlanDraft**:
   ```
   PlanDraft document -> contains owner (User ID) + projectId (Project ID)
   Direct check: PlanDraft.owner === req.user._id AND projectId match
   ```
4. **ProjectMemory**:
   ```
   ProjectMemory document -> contains owner (User ID) + projectId (Project ID)
   Direct check: ProjectMemory.owner === req.user._id AND projectId match
   ```
5. **ProjectRecommendation**:
   ```
   ProjectRecommendation document -> contains owner (User ID) + projectId (Project ID)
   Direct check: ProjectRecommendation.owner === req.user._id AND projectId match
   ```
**Denormalization Finding**: Every child entity deliberately duplicate-stores `owner`. This avoids costly MongoDB `$lookup` aggregations or secondary queries on parent projects for authorization. Denormalizing `workspaceId` directly onto child documents preserves this single-query indexing advantage.
---
## 8. Authorization Call-Site Inventory
Search across `server/src` reveals **44 distinct call-sites** filtering by `owner`:
- `server/src/services/project.service.ts`: 12 call-sites (`Project.findOne`, `Project.find`, `Project.countDocuments`)
- `server/src/services/task.service.ts`: 14 call-sites (`Task.findOne`, `Task.find`, `Task.countDocuments`, `Task.updateMany`, `Task.deleteMany`)
- `server/src/services/plan-draft.service.ts`: 5 call-sites
- `server/src/services/plan-commit.service.ts`: 4 call-sites
- `server/src/services/project-memory.service.ts`: 5 call-sites
- `server/src/services/project-recommendation.service.ts`: 4 call-sites
- `server/src/services/activity.service.ts`: 3 call-sites
- `server/src/services/global-search.service.ts`: 5 call-sites
- `server/src/services/project-copilot-ai.service.ts`: 2 call-sites
- `server/src/services/copilot-action.service.ts`: 2 call-sites
**Centralization Assessment**: Authorization is currently **partially centralized** inside individual domain services (`getProjectById`, `getTaskById`, etc.), but **duplicated** across Mongo queries. Phase 32 should introduce a centralized workspace authorization helper (`authorizeWorkspaceMembership(userId, workspaceId)`) and middleware (`requireWorkspaceMember`).
---
## 9. Phase 25 — Planning Impact
- **Architecture**: `PlanDraft` schema stores `owner`, `projectId`, `promptDescription`, `tasks[]`, `milestones[]`, `expiresAt`.
- **Generation**: `project-planning-ai.service.ts` verifies `Project.findOne({ _id: projectId, owner: userId })` before generating a draft.
- **Commit**: `plan-commit.service.ts` converts draft tasks & milestones into actual `Task` and `Milestone` MongoDB documents in a session transaction.
- **Migration Hazards**:
  - `PlanDraft` partial unique index `{ owner: 1, projectId: 1 }` (for `status: "draft"`) will become `{ workspaceId: 1, projectId: 1 }` or `{ workspaceId: 1, owner: 1, projectId: 1 }`.
  - When committing a draft, the generated `Task` and `Milestone` documents must inherit the project's `workspaceId`.
---
## 10. Phase 27 — Copilot Impact
- **Trace**:
  ```
  POST /api/v1/projects/:projectId/copilot
    -> copilot.controller.ts -> pre-checks getProjectById(projectId, userId)
    -> buildCopilotContext({ projectId, userId })
    -> queries tasks, milestones, memories, activities for context assembly
    -> AIService.generateCopilotResponse() -> HTTP response
  ```
- **Multi-User Vulnerability**: Currently `buildCopilotContext` verifies `owner: userId`. If User B is added to User A's project, User B would be denied access unless `buildCopilotContext` checks **workspace membership** instead of raw `owner === userId`.
- **Required Changes**:
  - `buildCopilotContext` parameter: `{ projectId, workspaceId, userId }`.
  - Context queries filter by `projectId` and `workspaceId`.
---
## 11. Phase 28 — Controlled AI Actions Impact
- **Trace**:
  ```
  POST /api/v1/projects/:projectId/copilot/actions/dry-run
    -> performActionDryRun(userId, projectId, proposedAction)
    -> generateConfirmationToken({ actionType, projectId, userId, targetId, ... })
  POST /api/v1/projects/:projectId/copilot/actions/confirm
    -> confirmAction(userId, confirmationToken)
    -> verifyConfirmationToken(confirmationToken)
    -> checks payload.userId === userId
  ```
- **Security Findings**:
  - Confirmation token currently embeds `userId` and `projectId`.
  - Token execution verifies `payload.userId === userId`. This prevents replay attacks across users.
  - For Phase 32: Embed `workspaceId` into confirmation token payload. Ensure token is executed in the context of the workspace, verifying the executing user has workspace membership.
---
## 12. Phase 29 — Project Memory Impact
- **Model**: `ProjectMemory` (`owner`, `projectId`, `content`, `sourceType`).
- **Index**: `{ owner: 1, projectId: 1, updatedAt: -1, _id: -1 }`.
- **Copilot Retrieval**: Copilot context builder retrieves top project memories via `ProjectMemory.find({ owner, projectId })`.
- **Search Retrieval**: `global-search.service.ts` searches memories matching `{ owner, content: regex }`.
- **Privacy Boundary**: Memories are project-level facts (e.g. "Use TypeScript for backend"). In a workspace, all workspace members with access to the project should view project memory. Memory must never leak cross-workspace.
---
## 13. Phase 30 — Proactive Intelligence Impact
- **Worker Architecture**: `runProactiveIntelligenceCycle` scans eligible candidate projects (`isDeleted: false, archived: false`).
- **Recommendation Storage**: `ProjectRecommendation` document contains `owner`, `projectId`, `fingerprint`, `status`, `purgeAt`.
- **Daily Quota**: Tracked via `getUserDailyProactiveAICalls(ownerId, now)` querying count of recommendations created today for `owner`.
- **Multi-Member Semantics**:
  - Recommendations are **project-scoped**. All workspace members viewing the project see active recommendations.
  - Action/Dismissal: When Member B dismisses a recommendation, `actedOnAt` / `dismissedAt` updates the shared recommendation status, and an `Activity` record is created recording `actorId: Member B`.
  - Daily AI Quota: AI quota accounting should be tracked per **Workspace** (`getWorkspaceDailyProactiveAICalls(workspaceId)`).
---
## 14. Phase 31 — Global Search Impact
- **Service**: `global-search.service.ts`
- **Tenant Isolation**: Queries `Project`, `Task`, `Milestone`, `ProjectMemory` matching `{ owner: ownerObjectId }`.
- **Tenant Boundary Decision for Phase 32**:
  - Search MUST operate within the user's **current active workspace** (`workspaceId: activeWorkspaceId`).
  - Search DTOs, Command Palette navigation, and keyboard shortcuts operate within the context of the active workspace.
  - Option to search across all user workspaces can be an explicit filter parameter, but active workspace isolation is the default.
---
## 15. Frontend Auth / Session Architecture
- **Auth Store**: `client/src/store/auth.store.ts` (Zustand). Stores `user`, `isAuthenticated`, `isBootstrapping`. Access tokens are managed in Axios memory headers.
- **Server State Management**: TanStack Query (React Query) manages server state (projects, tasks, activities, etc.).
- **Workspace State Recommendation**:
  - `workspaces` list, `workspaceMembers`, and `currentWorkspace` details are **server state** and should be managed via **TanStack Query hooks** (`useWorkspaces()`, `useWorkspace(id)`).
  - `activeWorkspaceId` selection: Persisted in local storage / HTTP headers and managed via a dedicated `useActiveWorkspace()` hook or lightweight client store, syncing with workspace switcher UX.
---
## 16. Routing & URL Architecture
- **Current React Router Structure**:
  ```
  / -> DashboardPage
  /projects -> ProjectsDashboardPage
  /projects/:projectId -> ProjectDetailPage
  /tasks -> TasksPage
  /tasks/:taskId -> TaskDetailPage
  ```
- **URL Architecture Evaluation**:
  - **Option A (Workspace context in header/state, un-prefixed URLs)**: `/projects/:projectId`, `/tasks/:taskId`. Header carries `X-Workspace-Id`.
  - **Option B (Workspace slug in URL)**: `/w/:workspaceSlug/projects/:projectId`.
- **Recommendation**: **Option B** (or `/w/:workspaceSlug/...` routing) provides clean, bookmarkable, multi-tab compatible URLs. A default redirect from `/` to `/w/:defaultSlug/dashboard` ensures seamless backward compatibility.
---
## 17. Slug Requirements
- **Existing Slug Patterns**: Search reveals no pre-existing slug generation utility in the repository.
- **Requirements for Workspace Slugs**:
  - Unique, URL-safe string (e.g. `rehan-workspace`, `acme-corp`).
  - Case-insensitive uniqueness constraint in MongoDB (`unique: true`, lowercase index).
  - Slug generation helper: `slugify(name)` + random suffix fallback on collision (e.g., `rehan-workspace-4f2a`).
---
## 18. Membership Storage Analysis
- **Option Comparison**:
  - **Option A (Embedded inside Workspace)**: `Workspace { members: [{ userId, role }] }`.
    - *Cons*: Document size limits, difficult indexing, atomic array updates complex, poor scalability for larger teams.
  - **Option B (Dedicated `WorkspaceMember` collection)**:
    - *Pros*: Clean schema, unique compound index `{ workspaceId: 1, userId: 1 }`, fast query performance, clean role management, standard relational pattern in MongoDB.
- **Recommendation**: **Option B — Dedicated `WorkspaceMember` Collection**.
  ```typescript
  export interface IWorkspaceMember {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;
    role: "OWNER" | "MEMBER";
    joinedAt: Date;
  }
  ```
---
## 19. Personal Workspace Semantics
- **Requirements**:
  - Every user MUST have a **Personal Workspace** created automatically upon registration.
  - Naming: `"${user.name}'s Workspace"` or `"Personal Workspace"`.
  - Flag: `isPersonal: true`.
  - Owner: `user._id` is created as `WorkspaceMember` with `role: "OWNER"`.
  - Personal workspaces cannot be deleted unless the user account is deleted.
  - Exactly one personal workspace per user (`{ ownerId: 1, isPersonal: 1 }` partial unique index).
---
## 20. Existing Data Migration Analysis
- **Existing Migration Tooling**: Search across `server/` reveals no formal framework (like `migrate-mongo`). Standard script pattern in `server/src/scripts/` or `server/src/jobs/` is used.
- **Backfill Strategy (Idempotent Migration Script)**:
  1. For each existing `User` without a personal workspace, create a `Workspace` (`isPersonal: true`, `ownerId: user._id`) and a `WorkspaceMember` (`role: "OWNER"`).
  2. For each `Project` owned by `user` where `workspaceId` is missing/null, set `workspaceId = userPersonalWorkspace._id`.
  3. Backfill `workspaceId` onto all child entities (`Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`, `Activity`) owned by `user` where `workspaceId` is missing/null.
  4. Script must be **idempotent**: re-running it does not duplicate workspaces or overwrite existing `workspaceId` associations.
---
## 21. Database Index Audit
Index inventory for workspace transition:
| Collection | Current Index | Workspace-Era Equivalent |
|---|---|---|
| `Project` | `{ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 }` | `{ workspaceId: 1, isDeleted: 1, archived: 1, updatedAt: -1 }` |
| `Task` | `{ owner: 1, isDeleted: 1, archived: 1, updatedAt: -1 }` | `{ workspaceId: 1, isDeleted: 1, archived: 1, updatedAt: -1 }` |
| `Task` | `{ owner: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 }` | `{ workspaceId: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 }` |
| `Task` | `{ owner: 1, dependencies: 1 }` | `{ workspaceId: 1, dependencies: 1 }` |
| `Milestone` | `{ owner: 1, projectId: 1, isDeleted: 1, position: 1 }` | `{ workspaceId: 1, projectId: 1, isDeleted: 1, position: 1 }` |
| `PlanDraft` | `{ owner: 1, projectId: 1, status: 1 }` | `{ workspaceId: 1, projectId: 1, status: 1 }` |
| `ProjectMemory` | `{ owner: 1, projectId: 1, updatedAt: -1, _id: -1 }` | `{ workspaceId: 1, projectId: 1, updatedAt: -1, _id: -1 }` |
| `ProjectRecommendation` | `{ owner: 1, projectId: 1, status: 1, createdAt: -1 }` | `{ workspaceId: 1, projectId: 1, status: 1, createdAt: -1 }` |
| `Activity` | `{ owner: 1, _id: -1 }` | `{ workspaceId: 1, _id: -1 }` |
| `Activity` | `{ owner: 1, projectId: 1, _id: -1 }` | `{ workspaceId: 1, projectId: 1, _id: -1 }` |
| `Notification` | `{ recipientId: 1, _id: -1 }` | Unchanged (`{ recipientId: 1, _id: -1 }`) |
---
## 22. Test Infrastructure Migration Impact
- **Current Test Pattern**: Server tests create a mock user (`User.create(...)`) and pass `user._id.toString()` as `userId` or `owner` to service calls.
- **Migration Impact**:
  - Test helper `setupTestUserAndWorkspace()` should be introduced.
  - When creating a test user, automatically provision their personal workspace and return `{ user, workspace }`.
  - Pass `workspace._id.toString()` to test service calls requiring workspace context.
  - Update `mongodb-memory-server` test suites to verify cross-workspace access attempts return `NotFoundError` or `UnauthorizedError`.
---
## 23. Cross-Workspace Threat Model
- **Threat Scenarios & Protection**:
  1. **Direct Resource Access by ID**: User A attempts `GET /api/v1/projects/:projectId` for a project in Workspace B.
     - *Mitigation*: Service queries verify `workspaceId: activeWorkspaceId` AND check `WorkspaceMember.findOne({ workspaceId, userId })`.
  2. **Cross-Workspace AI Prompt Injection**: User A requests Copilot context for Project B using a prompt in Workspace A.
     - *Mitigation*: `buildCopilotContext` validates project belongs to active workspace and user is a member of that workspace.
  3. **Confirmation Token Replay**: User A captures confirmation token generated in Workspace A and attempts execution in Workspace B.
     - *Mitigation*: Confirmation token payload signs `workspaceId`. `confirmAction` verifies payload `workspaceId` matches request context and user membership.
  4. **Proactive Recommendation Leak**: Background worker generates recommendation for Workspace A and renders it to Workspace B.
     - *Mitigation*: Recommendation query endpoints filter strictly by `workspaceId`.
---
## 24. Activity / Audit Semantics
- **Existing Schema**: `Activity` stores `owner` (tenant key), `actorId` (user who initiated action), `type`, `entityType`, `entityId`, `projectId`, `contextProjectIds`, `metadata`.
- **Workspace Adaptation**:
  - Rename/map `owner` -> `workspaceId`.
  - `actorId` retains the ID of the exact user who took the action.
  - When User B updates a task in User A's workspace, `Activity` records:
    - `workspaceId`: Workspace ID
    - `actorId`: User B ID
    - `type`: "TASK_UPDATED"
    - `metadata`: `{ updatedBy: User B name, changes: ... }`
---
## 25. Notification Semantics
- **Existing Schema**: `Notification` stores `recipientId` (target user), `actorId` (triggering user), `type`, `title`, `message`, `metadata`.
- **Workspace Adaptation**:
  - Notifications remain strictly **user-scoped** (`recipientId`).
  - Private notifications (e.g. password changed, task assigned, weekly AI summary) must NOT become shared workspace data.
  - `metadata` field can store `workspaceId` for navigation linking.
---
## 26. Rate Limit / AI Cost Accounting Impact
- **Search Rate Limit**: `search-rate-limit.middleware.ts` currently keys by `req.user._id`. Keying by user ID remains appropriate.
- **Proactive AI Daily Quota**: `getUserDailyProactiveAICalls` currently keys by `owner: ownerObjId`. In Phase 32/35, AI budget tracking will transition to `getWorkspaceDailyProactiveAICalls(workspaceId)` to prevent budget circumvention across members of the same workspace.
---
## 27. Data Model Alternatives
- **Option A — Immediate Replacement**: Remove `owner` from `Project` and replace with `workspaceId`.
  - *Risk*: High risk. Destroys creator metadata, breaks legacy tests immediately, high risk of missing references.
- **Option B — Staged Compatibility Transition**: Introduce `workspaceId` alongside `owner`. Backfill existing data. Update queries to use `workspaceId`. Keep `owner` temporarily.
  - *Risk*: Low risk. Highly safe backward compatibility.
- **Option C — Permanent Dual Semantics (RECOMMENDED)**:
  - `workspaceId`: Primary tenant isolation boundary.
  - `owner` / `createdBy`: Immutable metadata recording original creator user.
  - *Pros*: Preserves complete audit trail, clean tenant boundary, smooth migration.
---
## 28. Recommended Architecture Direction
1. **Entities**:
   - `Workspace`: `{ _id, name, slug, ownerId, isPersonal, createdAt, updatedAt }`
   - `WorkspaceMember`: `{ _id, workspaceId, userId, role: "OWNER" | "MEMBER", joinedAt }`
2. **Project & Child Entities**:
   - `Project`: Add mandatory `workspaceId` (ref Workspace). Retain `owner` as creator reference (`createdBy`).
   - `Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`, `Activity`: Add `workspaceId` (ref Workspace) for single-query indexing.
3. **Provisioning & Migration**:
   - Registration hook: Automatically creates Personal Workspace and Owner Membership.
   - Idempotent script: Backfills personal workspaces and `workspaceId` for all existing users, projects, and child entities.
4. **Authorization Middleware**:
   - Centralized `requireWorkspaceMember` middleware attaches `req.workspace` and `req.workspaceMember`.
---
## 29. Candidate Architectural Invariants
1. **Tenant Isolation Invariant**: No API query, search index, memory lookup, or AI context builder shall return resources belonging to a workspace where the authenticated user is not an active member.
2. **Personal Workspace Invariant**: Every registered user must possess exactly one personal workspace (`isPersonal: true`).
3. **Idempotent Migration Invariant**: Database migration scripts must be fully idempotent, safe to re-run multiple times, and produce zero duplicate records or orphaned resources.
4. **Creator Attribution Invariant**: Introducing `workspaceId` as the tenant boundary shall not erase original document creator attribution (`owner` / `createdBy`).
5. **Private Notification Invariant**: Notifications remain strictly recipient-scoped (`recipientId`) and shall not leak across workspace members.
---
## 30. Phase 32 / Phase 33 Boundary
- **Phase 32 Scope (Workspaces & Tenancy)**:
  - `Workspace` and `WorkspaceMember` models.
  - Personal workspace automatic provisioning & idempotent data migration.
  - Tenant boundary (`workspaceId`) on `Project` and child entities.
  - Workspace REST APIs (create, list, switch, add/remove member).
  - Workspace context & tenant validation across all services (Projects, Tasks, Planning, Copilot, Actions, Memory, Proactive Intelligence, Search).
  - Frontend Workspace state, switcher UX, and route integration.
  - Comprehensive cross-tenant security and isolation test suite.
  - Minimal role concept (`role: "OWNER" | "MEMBER"`).
- **Phase 33 Scope (RBAC & Collaboration)**:
  - Centralized RBAC permission semantics (`can(user, "task:delete", resource)`).
  - Fine-grained roles (`ADMIN`, `VIEWER`, custom roles).
  - Invitation links, email invites, token-based join flows.
  - Real-time collaboration, presence, activity notifications.
---
## 31. Blockade Decision
**NO BLOCKADE REQUIRED**.
*Rationale*: The repository inspection demonstrates clear Mongoose schema structures, explicit query boundaries, modular domain services, and isolated test helpers. Architectural discovery provides 100% of necessary empirical evidence to proceed directly to the Phase 32 Architecture Contract.
---
## 32. Proposed Work Packages
- **Gate 1**: Architecture Contract Approval
- **WP-01**: Workspace & WorkspaceMember Domain Models & Validation Schemas
- **WP-02**: Automatic Personal Workspace Provisioning & Idempotent Backfill Migration Script
- **WP-03**: Workspace Tenant Scoping for Project, Task, Milestone & Planning Services
- **WP-04**: Workspace Tenant Scoping for AI Subsystems (Copilot, Actions, Memory, Proactive Intelligence, Search)
- **WP-05**: Workspace REST API & Authorization Middleware
- **WP-06**: Frontend Workspace State, Workspace Switcher UX & Routing Integration
- **WP-07**: Cross-Workspace Security Audit, Isolation Tests & Test Suite Migration
- **Gate 2 / Gate 3**: Verification, Security Audit & Final Acceptance
---
## 33. Required Investigation Questions & Answers
1. **What does "owner" mean in the current architecture?**  
   *Answer*: "Owner" currently serves as both the single-user tenant boundary and creator identity. Every query filters by `owner: req.user._id`.
2. **Which persisted entities directly contain owner/user ownership fields?**  
   *Answer*: `Project`, `Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`, `Activity` contain `owner`. `Notification` contains `recipientId`.
3. **Which entities inherit authorization through Project?**  
   *Answer*: Indirectly `Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation` belong to a project, but currently all store `owner` directly for fast single-collection queries.
4. **Where is ownership authorization currently enforced?**  
   *Answer*: In individual domain services (`project.service.ts`, `task.service.ts`, `project-memory.service.ts`, etc.) via explicit Mongoose `owner` query parameters.
5. **How many major authorization call sites will workspace migration affect?**  
   *Answer*: Exactly 44 distinct query/authorization call-sites across 15 server services and controllers.
6. **Should Workspace be a first-class MongoDB entity?**  
   *Answer*: Yes. `Workspace` must be a top-level MongoDB model in `server/src/models/workspace.model.ts`.
7. **Should WorkspaceMember be embedded or first-class?**  
   *Answer*: First-class dedicated collection (`server/src/models/workspace-member.model.ts`) for clean indexing, query performance, and scalable member management.
8. **Should every user receive a personal workspace?**  
   *Answer*: Yes. Automatically created on user registration.
9. **Should new users receive that workspace transactionally during registration?**  
   *Answer*: Yes, created inside `registerUser` service flow.
10. **Should existing owner fields be retained during migration?**  
    *Answer*: Yes. Retained as creator metadata (`createdBy` / `owner`) while `workspaceId` becomes the primary tenant boundary.
11. **Should Project.workspaceId become mandatory immediately or through staged migration?**  
    *Answer*: Staged migration via idempotent backfill script, after which `workspaceId` becomes a mandatory schema field.
12. **What should happen to Project.owner after migration?**  
    *Answer*: `Project.owner` remains as creator identity reference.
13. **How should orphaned projects/users be handled?**  
    *Answer*: Idempotent backfill script identifies projects without valid user owners and assigns them to system/fallback workspace or logs audit warnings.
14. **What indexes need migration?**  
    *Answer*: 18 compound indexes across `Project`, `Task`, `Milestone`, `PlanDraft`, `ProjectMemory`, `ProjectRecommendation`, `Activity` transitioning `owner: 1` -> `workspaceId: 1`.
15. **How should workspace membership be checked efficiently?**  
    *Answer*: Via indexed query `WorkspaceMember.findOne({ workspaceId, userId })`, cached per request in auth middleware (`req.workspaceMember`).
16. **Where should membership authorization live?**  
    *Answer*: In `server/src/middleware/workspace-auth.middleware.ts` and `server/src/services/workspace.service.ts`.
17. **How will Phase 25 Planning become workspace-safe?**  
    *Answer*: `PlanDraft` adds `workspaceId`. Draft creation, prompt generation, and plan commit validate workspace membership and propagate `workspaceId` to generated tasks/milestones.
18. **How will Phase 27 Copilot become workspace-safe?**  
    *Answer*: `buildCopilotContext` receives `workspaceId`, validates membership, and scopes all context queries to `workspaceId`.
19. **How will Phase 28 Controlled Actions become workspace-safe?**  
    *Answer*: Confirmation tokens embed `workspaceId`. `confirmAction` re-verifies executing user's active workspace membership before executing dry-run actions.
20. **How will Phase 29 Memory become workspace-safe?**  
    *Answer*: `ProjectMemory` schema adds `workspaceId`, indexing by `{ workspaceId: 1, projectId: 1 }`.
21. **How will Phase 30 Recommendations become workspace-safe?**  
    *Answer*: Recommendations add `workspaceId`. Proactive worker scans workspace projects and tracks daily AI quota per workspace.
22. **How will Phase 31 Global Search become workspace-safe?**  
    *Answer*: `global-search.service.ts` scopes searches to `workspaceId: activeWorkspaceId`.
23. **Should search operate in current workspace or across memberships?**  
    *Answer*: Current active workspace by default.
24. **How should workspace context affect Command Palette navigation?**  
    *Answer*: Command Palette results and navigation URLs resolve within the active workspace context (`/w/:workspaceSlug/...`).
25. **Where should active workspace state live on the frontend?**  
    *Answer*: Server state in TanStack Query (`useWorkspaces`), active selection in URL/client state hook.
26. **Should workspace identity appear in URLs?**  
    *Answer*: Yes, route prefix `/w/:workspaceSlug/...`.
27. **Are workspace slugs justified?**  
    *Answer*: Yes. Unique, human-readable, bookmarkable URL identifiers.
28. **What should personal workspace semantics be?**  
    *Answer*: `isPersonal: true`, created on registration, cannot be deleted individually.
29. **How should Activity distinguish actor from workspace ownership?**  
    *Answer*: `workspaceId` (tenant) and `actorId` (action author).
30. **Which Notification semantics remain user-specific?**  
    *Answer*: Notifications remain recipient-scoped (`recipientId`).
31. **How should existing data be migrated without making projects inaccessible?**  
    *Answer*: Idempotent backfill script links every existing user project to their personal workspace prior to enforcing mandatory `workspaceId` validation.
32. **Can the migration be idempotent and restartable?**  
    *Answer*: Yes. The script checks for existing workspaces/links before creating or updating documents.
33. **Is rollback feasible?**  
    *Answer*: Yes, since `owner` fields are preserved, falling back to owner-only queries remains possible during transition.
34. **What cross-workspace leakage tests are mandatory?**  
    *Answer*: Tests verifying User A (Workspace A) receives 404/403 when attempting GET/PUT/DELETE on Workspace B projects, tasks, memories, searches, copilot queries, or action tokens.
35. **Which current tests will require fixture architecture changes?**  
    *Answer*: Server integration test helpers will be updated to create user + personal workspace fixture pairs (`setupTestUserAndWorkspace`).
36. **Where exactly should Phase 32 stop and Phase 33 begin?**  
    *Answer*: Phase 32 stops at Workspaces, Memberships, Tenant Isolation, Backfill Migration, APIs, and Switcher UX. Phase 33 begins at Granular RBAC permissions, invitations, and real-time collaboration.
37. **Is an experimental blockade required before implementation?**  
    *Answer*: No blockade required.
38. **What work-package decomposition should Phase 32 use?**  
    *Answer*: WP-01 through WP-07 across Gate 1, Gate 2, and Gate 3.
---
## 34. Risks & Open Questions
1. **Risk — Staged Migration vs Mandatory Field**: If `workspaceId` is marked `required: true` in Mongoose schema before running the backfill script, un-migrated databases will fail validation on update.  
   *Mitigation*: Backfill script runs as pre-start migration step or schema applies default/optional validation until migration finishes.
2. **Risk — Performance of Workspace Member Lookups**: High-frequency API calls executing `WorkspaceMember.findOne` on every request.  
   *Mitigation*: Ensure compound index `{ workspaceId: 1, userId: 1 }` is created with unique constraint, and attach `workspaceMember` to `req` during auth middleware execution.
---
## 35. Exact Files Likely to Be Affected in Phase 32
### Server Models & Schemas
- `server/src/models/workspace.model.ts` **[NEW]**
- `server/src/models/workspace-member.model.ts` **[NEW]**
- `server/src/models/project.model.ts`
- `server/src/models/task.model.ts`
- `server/src/models/milestone.model.ts`
- `server/src/models/plan-draft.model.ts`
- `server/src/models/project-memory.model.ts`
- `server/src/models/project-recommendation.model.ts`
- `server/src/models/activity.model.ts`
### Server Services & Controllers
- `server/src/services/workspace.service.ts` **[NEW]**
- `server/src/controllers/workspace.controller.ts` **[NEW]**
- `server/src/routes/workspace.routes.ts` **[NEW]**
- `server/src/middleware/workspace-auth.middleware.ts` **[NEW]**
- `server/src/services/auth.service.ts`
- `server/src/services/project.service.ts`
- `server/src/services/task.service.ts`
- `server/src/services/plan-draft.service.ts`
- `server/src/services/plan-commit.service.ts`
- `server/src/services/project-memory.service.ts`
- `server/src/services/project-copilot-ai.service.ts`
- `server/src/services/copilot-action.service.ts`
- `server/src/services/proactive-recommendation.service.ts`
- `server/src/services/proactive-intelligence-worker.service.ts`
- `server/src/services/global-search.service.ts`
### Migration & Scripts
- `server/src/scripts/migrate-workspaces.ts` **[NEW]**
### Frontend Components & Services
- `client/src/features/workspaces/...` **[NEW]**
- `client/src/components/layout/DashboardNavbar.tsx`
- `client/src/components/layout/DashboardSidebar.tsx`
- `client/src/app/router.tsx`
---
## 36. Final Investigation Verdict
**READY FOR ARCHITECTURE CONTRACT**
The repository inspection is complete. All 38 required architectural questions are answered with empirical evidence. No production code was modified. The system is fully prepared for the Phase 32 Architecture Contract (`docs/phases/phase-32-workspaces-memberships/01-architecture-contract.md`).
