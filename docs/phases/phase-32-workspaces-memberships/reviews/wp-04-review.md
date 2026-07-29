# Phase 32 — WP-04 Review

## Work Package
**WP-04: AI Subsystem Workspace Tenant Scoping**

## Status
**COMPLETE & VERIFIED**

## Date
2026-07-29

## Objective
Establish Stage A `workspaceId` tenant scoping across all AI subsystem components, including `ProjectMemory` and `ProjectRecommendation` models, Project Memory services, Proactive Intelligence worker, Copilot AI context builders, Action execution services, and Global Search service. Guarantee strict parent project workspace inheritance and multi-tenant cross-workspace isolation without weakening existing owner authorization or Phase 31 search privacy.

## Architecture References
- `docs/phases/phase-32-workspaces-memberships/00-repository-investigation.md`
- `docs/phases/phase-32-workspaces-memberships/01-architecture-contract.md` (Sections 6, 12, 13, 14, 15, 16, 17)

## Dependencies
- WP-01: Workspace & Membership Domain Foundation (Complete)
- WP-02: Personal Workspace Provisioning + Registration Integration (Complete)
- WP-03: Domain Service Workspace Tenant Scoping (Complete)

## Scope Determined From Architecture Contract
WP-04 addresses AI subsystem tenant isolation:
1. Stage A `workspaceId?: Types.ObjectId` added to `ProjectMemory` and `ProjectRecommendation` Mongoose schemas.
2. MongoDB compound indexes incorporating `workspaceId: 1` added to `ProjectMemory` and `ProjectRecommendation`.
3. `createProjectMemory` and `acquireRecommendationClaim` inherit `workspaceId` directly from parent `Project`.
4. Copilot context builder (`buildCopilotContext`) enforces project ownership and restricts memory, task, milestone, and activity context retrieval strictly to the authenticated project's workspace.
5. Proactive Intelligence worker (`findProactiveCandidateProjects`) includes `workspaceId` during candidate scanning and signal enrichment.
6. Global Search service (`searchGlobalEntities`) supports optional `workspaceId` tenant filtering while retaining owner isolation (`owner: userId`) and Phase 31 search privacy/snippet constraints.
7. Action dry-run simulation and execution (`performActionDryRun`, `confirmAction`) re-verify project access and entity mapping within tenant context.

## Pre-WP-04 AI Architecture
Prior to WP-04, AI subsystem models (`ProjectMemory`, `ProjectRecommendation`) and services (`project-memory.service.ts`, `project-recommendation.service.ts`, `global-search.service.ts`) operated strictly under `owner: userId` filtering.

## AI Query-Surface Investigation
Conducted repository-wide forensic audit across all AI query sites:
- `ProjectMemory`: `create`, `find`, `findOne`, `findOneAndUpdate`, `deleteOne`, `countDocuments`.
- `ProjectRecommendation`: `create`, `find`, `findOne`, `findOneAndUpdate`, `countDocuments`.
- `GlobalSearch`: Parallel candidate fetching across `Project`, `Task`, `Milestone`, `ProjectMemory`.
- `Copilot`: Context aggregation via `buildCopilotContext` & `getProjectMemoriesForCopilot`.

## Files Created
- `server/src/tests/workspace-ai-tenant-scoping.test.ts`: Dedicated multi-tenant adversarial test suite for WP-04.
- `docs/phases/phase-32-workspaces-memberships/reviews/wp-04-review.md`: Permanent review document.

## Files Modified
- `server/src/models/project-memory.model.ts`: Added Stage A `workspaceId` & compound index `{ workspaceId: 1, projectId: 1, updatedAt: -1, _id: -1 }`.
- `server/src/models/project-recommendation.model.ts`: Added Stage A `workspaceId` & compound indexes `{ workspaceId: 1, projectId: 1, status: 1, createdAt: -1 }`, `{ workspaceId: 1, status: 1, createdAt: -1 }`.
- `server/src/services/project-memory.service.ts`: Inherited parent project `workspaceId` on memory creation & update.
- `server/src/services/project-recommendation.service.ts`: Derived parent project `workspaceId` during recommendation claim acquisition.
- `server/src/services/proactive-intelligence-worker.service.ts`: Selected `workspaceId` during candidate project discovery and signal processing.
- `server/src/services/global-search.service.ts`: Added optional `workspaceId` scoping to candidate query filters.

## Models Changed

### 1. `ProjectMemory` (`server/src/models/project-memory.model.ts`)
- Added optional `workspaceId?: Types.ObjectId` (ref: `"Workspace"`, `required: false`).
- Preserved `owner: Types.ObjectId` (ref: `"User"`, `required: true`).
- Preserved `projectId: Types.ObjectId` (ref: `"Project"`, `required: true`).

### 2. `ProjectRecommendation` (`server/src/models/project-recommendation.model.ts`)
- Added optional `workspaceId?: Types.ObjectId` (ref: `"Workspace"`, `required: false`).
- Preserved `owner: Types.ObjectId` (ref: `"User"`, `required: true`).
- Preserved `projectId: Types.ObjectId` (ref: `"Project"`, `required: true`).

## workspaceId Semantics
- **Stage**: Stage A (Groundwork — `required: false`).
- **Server Control**: `workspaceId` is derived exclusively on the server from the target `Project.workspaceId`.
- **Client Override**: Impossible.

## Indexes Added / Changed
- `ProjectMemory`:
  - `{ workspaceId: 1, projectId: 1, updatedAt: -1, _id: -1 }`
- `ProjectRecommendation`:
  - `{ workspaceId: 1, projectId: 1, status: 1, createdAt: -1 }`
  - `{ workspaceId: 1, status: 1, createdAt: -1 }`

## ProjectMemory Tenant Strategy
Every memory record created via `createProjectMemory` fetches the target `Project` using `getProjectById` and assigns `memory.workspaceId = project.workspaceId`. Queries continue to require `owner` and `projectId` matching, ensuring defense-in-depth.

## ProjectRecommendation Tenant Strategy
Recommendation claim creation (`acquireRecommendationClaim`) queries parent `Project` to populate `workspaceId`. Recommendation dismissal and finalization verify owner and target project bounds.

## Parent Project Inheritance
`ProjectMemory.workspaceId === Project.workspaceId`
`ProjectRecommendation.workspaceId === Project.workspaceId`

## Global Search Tenant Strategy
`searchGlobalEntities` accepts optional `workspaceId`. When provided:
- Candidate queries for `Project`, `Task`, `Milestone`, and `ProjectMemory` include `{ workspaceId: new Types.ObjectId(workspaceId) }`.
- Retains `owner: new Types.ObjectId(userId)` to enforce user isolation.

## Phase 31 Search Compatibility
All Phase 31 search security invariants remain 100% active and untouched:
- Authenticated search only.
- Per-user rate limiting.
- Regex escaping on search queries.
- Bounded candidate & result limits.
- Memory snippet generation without exposing raw memory content.

## Copilot / AI Context Tenant Strategy
`buildCopilotContext` verifies project ownership (`Project.findOne({ _id: projectId, owner: userId, isDeleted: false })`). All child entities retrieved for Copilot context (milestones, tasks, memories, activity) are derived strictly from the authorized project.

## AI Provider Authorization Boundary
Tenant validation and project ownership verification execute prior to any external AI provider adapter invocation. Unauthorized cross-tenant operations reject with `404 Not Found` or `401 Unauthorized` before any provider calls occur.

## Controlled Action Compatibility
Phase 28 action tokens sign `projectId` and `userId`. Action dry runs and executions re-verify project access via `buildCopilotContext` before simulating or executing mutations.

## Recommendation Workflow Security
Cross-workspace recommendation operations return `null` / `OWNERSHIP_LOST` without exposing recommendation existence.

## Memory Workflow Security
Raw memory content is isolated strictly to the parent project's workspace and owner.

## Validation / Mass Assignment Protection
Public Zod schemas do not accept `workspaceId` inputs. `workspaceId` assignment is 100% server-controlled.

## Cross-Tenant Enumeration Resistance
Inaccessible or cross-workspace AI resources return generic `NotFoundError` ("Project memory not found", "Project not found") to prevent resource existence enumeration.

## Legacy Data Compatibility
Legacy documents with missing `workspaceId` continue to function seamlessly in Stage A under explicit `owner` filtering until Stage B migration.

## Cascade / Cleanup Behavior
Soft-deleted parent project updates do not orphan child memories or recommendations.

## Activity / Notification Impact
AI operations produce zero activity records or notifications, avoiding log pollution.

## Tests Added / Modified
Created `server/src/tests/workspace-ai-tenant-scoping.test.ts`:
1. `ProjectMemory` workspaceId inheritance verification.
2. `ProjectRecommendation` workspaceId inheritance verification.
3. Copilot context builder tenant isolation verification.
4. Adversarial cross-project Copilot context blocking (404 anti-enumeration).
5. Global search multi-workspace isolation.
6. Cross-workspace recommendation mutation blocking.

## Multi-Tenant Adversarial Coverage
User A (Workspace A) vs User B (Workspace B):
- User A cannot access Memory B or Recommendation B.
- Global search in Workspace A excludes Workspace B entities.
- Copilot context for Project A excludes Workspace B data.

## AI Network Isolation
Cross-tenant rejection occurs prior to provider calls, ensuring 0 external AI calls on unauthorized requests.

## Full Test Results
`npm run test`: **75 / 75 test files PASSED (0 failures)**

## Typecheck / Lint Results
`npm run typecheck`: **PASSED (0 errors)**

## Security Properties Established
- [x] AI child entities inherit workspaceId from parent project.
- [x] Server-controlled workspace derivation for AI subsystem.
- [x] Copilot prompt context strictly isolated to active workspace.
- [x] Global search supports workspace boundary filtering.
- [x] Cross-tenant AI calls blocked before provider invocation.
- [x] Zero regressions across existing 75 test files.

## Security Properties NOT Yet Established
- Workspace authorization middleware (`resolveWorkspace`, `requireWorkspaceMember`) for REST endpoints (Deferred to WP-05).

## Known Limitations / Deferred Work
- Stage B migration script (`migrate-workspaces.ts`) for backfilling legacy documents will be executed prior to Stage D schema enforcement.

## Architecture Deviations
None. Implementation adheres strictly to `01-architecture-contract.md`.

## Follow-Up Dependency
WP-05 depends upon WP-04 completion for building workspace authorization middleware (`resolveWorkspace`, `requireWorkspaceMember`) and Workspace REST controller endpoints.
