# Phase 32 — WP-05 Review

## Work Package
**WP-05: Workspace REST API & Workspace Authorization Middleware**

## Status
**COMPLETE & VERIFIED**

## Date
2026-07-29

## Objective
Implement workspace authorization middleware (`resolveWorkspace`, `requireWorkspaceMember`, `requireWorkspaceOwner`), workspace controller (`workspace.controller.ts`), custom workspace CRUD operations in workspace domain service (`workspace.service.ts`), request Express type augmentation, and workspace REST API routes (`/api/v1/workspaces`). Guarantee multi-tenant anti-enumeration, personal workspace protection, and membership authorization semantics according to the architecture contract.

## Architecture References
- `docs/phases/phase-32-workspaces-memberships/00-repository-investigation.md`
- `docs/phases/phase-32-workspaces-memberships/01-architecture-contract.md` (Sections 7, 8, 9, 10, 11, 27)

## Dependencies
- WP-01: Workspace & Membership Domain Foundation (Complete)
- WP-02: Personal Workspace Provisioning + Registration Integration (Complete)
- WP-03: Domain Service Workspace Tenant Scoping (Complete)
- WP-04: AI Subsystem Workspace Tenant Scoping (Complete)

## Scope Determined From Architecture Contract
WP-05 encompasses backend workspace authorization and REST endpoints:
1. Express request type augmentation for `req.workspace` (`IWorkspaceDocument`) and `req.workspaceMember` (`IWorkspaceMemberDocument`).
2. Workspace authorization middleware pipeline:
   - `resolveWorkspace`: Resolves workspace identity from route param (`workspaceId` / `workspaceSlug`) or header (`x-workspace-id` / `x-workspace-slug`).
   - `requireWorkspaceMember`: Verifies active DB-backed `WorkspaceMember` relationship for authenticated `req.user`. Throws `404 Not Found` on non-membership to prevent resource existence probing.
   - `requireWorkspaceOwner`: Verifies `req.workspaceMember.role === "OWNER"`. Throws `403 Forbidden` on non-owner role.
3. REST Endpoints under `/api/v1/workspaces`:
   - `GET /api/v1/workspaces`: Lists user's workspaces with member roles.
   - `POST /api/v1/workspaces`: Creates custom non-personal workspace (`isPersonal: false`), assigns creator as `OWNER`, enforces slug uniqueness.
   - `GET /api/v1/workspaces/:workspaceId`: Retrieves workspace details & member list (`MEMBER` or `OWNER`).
   - `PATCH /api/v1/workspaces/:workspaceId`: Updates workspace name or slug (`OWNER` only).
   - `DELETE /api/v1/workspaces/:workspaceId`: Deletes custom workspace (`OWNER` only, must be non-personal and contain 0 active projects).
   - `GET /api/v1/workspaces/:workspaceId/members`: Lists active workspace members (`MEMBER` or `OWNER`).
   - `DELETE /api/v1/workspaces/:workspaceId/members/:userId`: Removes member (OWNER action) or permits self-leaving (cannot self-leave as sole OWNER).

## Pre-WP-05 Authorization Architecture
Prior to WP-05, domain models (`Project`, `Task`, `Milestone`, etc.) established `workspaceId` tenant attributes in WP-03/WP-04, but no REST API endpoint family or authorization middleware existed for managing workspaces and memberships.

## HTTP Architecture Investigation
Analyzed existing repository controller/middleware pattern:
- Route handler chain: `authenticate` -> `resolveWorkspace` -> `requireWorkspaceMember` -> `requireWorkspaceOwner` (if needed) -> `validate(schema)` -> controller -> domain service -> model.
- Error handling: AppError hierarchy (`UnauthorizedError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, `BadRequestError`) converted cleanly by central `errorHandler` middleware.
- API Envelope: `sendSuccessResponse(res, { statusCode, message, data })`.

## Files Created
- `server/src/middleware/workspace-auth.middleware.ts`: Workspace authorization middleware (`resolveWorkspace`, `requireWorkspaceMember`, `requireWorkspaceOwner`).
- `server/src/controllers/workspace.controller.ts`: Workspace REST API controller.
- `server/src/routes/workspace.routes.ts`: Workspace route definitions and middleware chains.
- `server/src/tests/workspace-authorization.test.ts`: Comprehensive WP-05 test suite.
- `docs/phases/phase-32-workspaces-memberships/reviews/wp-05-review.md`: Permanent review document.

## Files Modified
- `server/src/types/express.d.ts`: Augmented Express `Request` interface with optional `workspace` and `workspaceMember` properties.
- `server/src/services/workspace.service.ts`: Implemented `createCustomWorkspace`, `listWorkspacesForUser`, `getWorkspaceDetails`, `updateCustomWorkspace`, `deleteCustomWorkspace`, `listWorkspaceMembers`, `removeWorkspaceMember`.
- `server/src/routes/index.ts`: Mounted `workspaceRoutes` under `/workspaces`.

## Express Request Augmentation
`server/src/types/express.d.ts`:
```typescript
declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      validatedQuery?: unknown;
      workspace?: IWorkspaceDocument;
      workspaceMember?: IWorkspaceMemberDocument;
    }
  }
}
```

## Workspace Resolution Strategy
`resolveWorkspace` middleware extracts workspace identity from `req.params.workspaceId`, `req.params.workspaceSlug`, `req.headers["x-workspace-id"]`, or `req.headers["x-workspace-slug"]`. Looks up by ObjectId if valid, or by slug. Throws `404 Not Found` if missing or non-existent.

## Membership Authorization Strategy
`requireWorkspaceMember` queries `WorkspaceMember.findOne({ workspaceId: req.workspace._id, userId: req.user._id })`. If no membership record exists, throws `404 Not Found` ("Workspace not found.") to prevent unauthorized users from discovering workspace existence.

## OWNER Authorization Strategy
`requireWorkspaceOwner` checks `req.workspaceMember.role === "OWNER"`. If role is `"MEMBER"`, throws `403 Forbidden` ("Workspace owner permission required.").

## Middleware Ordering
For protected workspace routes:
```
1. authenticate (verifies Bearer JWT -> req.user)
2. resolveWorkspace (extracts identifier -> req.workspace)
3. requireWorkspaceMember (verifies active membership -> req.workspaceMember)
4. requireWorkspaceOwner (optional, verifies role === "OWNER")
5. validate(schema) (Zod body parsing)
6. Controller Handler
```

## Workspace REST API Contract
| Method | Route Path | Min Role | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/workspaces` | Authenticated | List all workspaces current user belongs to |
| `POST` | `/api/v1/workspaces` | Authenticated | Create custom non-personal workspace |
| `GET` | `/api/v1/workspaces/:workspaceId` | `MEMBER` | Get workspace details & active member list |
| `PATCH` | `/api/v1/workspaces/:workspaceId` | `OWNER` | Update workspace name or slug |
| `DELETE` | `/api/v1/workspaces/:workspaceId` | `OWNER` | Delete custom workspace (must have 0 active projects) |
| `GET` | `/api/v1/workspaces/:workspaceId/members` | `MEMBER` | List active workspace members |
| `DELETE` | `/api/v1/workspaces/:workspaceId/members/:userId` | `MEMBER` (self) / `OWNER` (others) | Remove member or self-leave workspace |

## Workspace Creation Strategy
`POST /api/v1/workspaces`:
- Accepts `{ name: string, slug?: string }`.
- Derives URL-safe slug; handles collisions by appending hex suffix.
- Server assigns `ownerId: req.user._id` and `isPersonal: false`.
- Server creates `WorkspaceMember` with `role: "OWNER"`.
- Mass-assignment proof: `ownerId` and `isPersonal` inputs rejected by Zod schema.

## Workspace Creation Atomicity
Compensating cleanup: If `WorkspaceMember` creation fails following `Workspace.save()`, `Workspace.deleteOne({ _id: workspace._id })` executes immediately to prevent orphaned workspaces without an owner membership.

## Workspace Listing Strategy
`GET /api/v1/workspaces`:
- Queries `WorkspaceMember.find({ userId })` to find all workspaces user belongs to.
- Fetches all matching `Workspace` documents.
- Includes user's membership `role` ("OWNER" | "MEMBER") and member count in response DTO.

## Workspace Retrieval Strategy
`GET /api/v1/workspaces/:workspaceId`:
- Enforces `requireWorkspaceMember`.
- Non-members receive `404 Not Found` (anti-enumeration).
- Members receive populated workspace DTO + member roster with user details.

## Workspace Update Strategy
`PATCH /api/v1/workspaces/:workspaceId`:
- Enforces `requireWorkspaceOwner`.
- Non-owners receive `403 Forbidden`.
- Slug collisions reject with `409 Conflict`.
- `ownerId` and `isPersonal` fields cannot be mutated.

## Workspace Delete Strategy
`DELETE /api/v1/workspaces/:workspaceId`:
- Enforces `requireWorkspaceOwner`.
- Personal workspaces reject deletion with `403 Forbidden` ("Personal workspaces cannot be deleted.").
- Workspaces with active projects (`Project.countDocuments({ workspaceId, isDeleted: false }) > 0`) reject deletion with `409 Conflict` ("Cannot delete workspace containing active projects.").
- On success: deletes associated `WorkspaceMember` documents and `Workspace` document.

## Personal Workspace Protection
- Personal workspaces (`isPersonal: true`) cannot be deleted (`403 Forbidden`).
- Sole OWNER cannot leave personal or custom workspace (`403 Forbidden`).
- Personal flag and `ownerId` cannot be mutated via update API.

## Shared Workspace Semantics
- Users can own multiple custom workspaces while maintaining a single personal workspace.
- Creating custom workspaces does not modify or replace personal workspace.

## WorkspaceMember Query Strategy
User workspace listing uses compound lookup index `{ userId: 1, workspaceId: 1 }` on `WorkspaceMember`.

## Index Changes
No additional index changes required beyond WP-01 defined compound indexes `{ workspaceId: 1, userId: 1 }` (unique) and `{ userId: 1, workspaceId: 1 }`.

## Validation / Mass Assignment Protection
`createWorkspaceSchema` and `updateWorkspaceSchema` enforce strict field limits. Client payloads cannot supply `ownerId`, `isPersonal`, `workspaceId`, or membership `role`.

## Enumeration Resistance
Unauthenticated or unauthorized access to an existing workspace returns `404 Not Found ("Workspace not found.")`, rendering existing vs non-existing workspace IDs indistinguishable to non-members.

## Error Semantics
- `401 UnauthorizedError`: Missing / invalid Bearer token.
- `404 NotFoundError`: Non-existent workspace OR user not a member.
- `403 ForbiddenError`: Non-owner attempting owner action OR deleting personal workspace OR leaving as sole owner.
- `409 ConflictError`: Duplicate slug OR deleting workspace containing active projects.
- `400 BadRequestError`: Validation failure or malformed payload.

## Response Privacy
API responses expose clean `WorkspaceDto` and `WorkspaceMemberDto` without leaking `__v`, internal database metadata, or sensitive user fields.

## Legacy Owner Compatibility
Existing `Project.owner` and model-level owner predicates remain active as defense-in-depth during Stage A.

## Stage Transition Compatibility
Stage A REST endpoints establish DB-backed workspace authorization while maintaining full backward compatibility for legacy non-workspace routes.

## Tests Added / Modified
Created `server/src/tests/workspace-authorization.test.ts` (25/25 passing assertions):
1. `GET /api/v1/workspaces`: Owner vs member workspace listing and role assignment.
2. `POST /api/v1/workspaces`: Custom workspace creation, isPersonal: false, OWNER role assignment, slug collision suffixing.
3. `GET /api/v1/workspaces/:workspaceId`: Details retrieval for members, 404 anti-enumeration for outsiders.
4. `PATCH /api/v1/workspaces/:workspaceId`: OWNER name update allowed, MEMBER update rejected (403).
5. `DELETE /api/v1/workspaces/:workspaceId`: Personal workspace deletion blocked (403), active project deletion blocked (409), empty custom workspace deletion allowed (200).
6. Member removal & sole owner self-leave constraints (403).

## Role Matrix Verification
| Role / Action | List | Get Details | Update Name/Slug | Delete Workspace | Remove Member |
|---|---|---|---|---|---|
| `OWNER` | Allowed | Allowed | Allowed | Allowed (if empty custom) | Allowed |
| `MEMBER` | Allowed | Allowed | Blocked (403) | Blocked (403) | Blocked (403) |
| Non-Member | Excluded | Blocked (404) | Blocked (404) | Blocked (404) | Blocked (404) |

## Adversarial Security Coverage
- Non-member querying custom workspace: 404 Not Found.
- Member attempting update: 403 Forbidden.
- Attempting personal workspace deletion: 403 Forbidden.
- Attempting workspace deletion with active projects: 409 Conflict.
- Sole OWNER leaving workspace: 403 Forbidden.

## Regression Verification
- `workspace.test.ts` (WP-01): PASS
- `workspace-provisioning.test.ts` (WP-02): PASS
- `workspace-tenant-scoping.test.ts` (WP-03): PASS
- `workspace-ai-tenant-scoping.test.ts` (WP-04): PASS
- `workspace-authorization.test.ts` (WP-05): PASS

## Full Test Results
`npm run test`: **76 / 76 test files PASSED (0 failures)**

## Typecheck / Lint Results
`npm run typecheck`: **PASSED (0 errors)**

## Security Properties Established
- [x] Request type augmented with req.workspace and req.workspaceMember.
- [x] Centralized workspace authorization middleware pipeline.
- [x] Anti-enumeration 404 responses for non-member workspace access.
- [x] DB-backed membership verification via WorkspaceMember collection.
- [x] Role-based permission enforcement (OWNER vs MEMBER).
- [x] Personal workspace immutability and anti-deletion protections.
- [x] Workspace deletion project dependency guard (409 Conflict).
- [x] Mass assignment protection against ownerId and isPersonal injection.

## Security Properties NOT Yet Established
- Frontend workspace context, switcher UI, and routing (`/w/:workspaceSlug`) (Deferred to WP-06).

## Known Limitations / Deferred Work
- Add-by-email, invite tokens, and join links belong strictly to Phase 33.

## Architecture Deviations
None. Implementation adheres strictly to `01-architecture-contract.md`.

## Follow-Up Dependency
WP-06 depends upon WP-05 completion for building the frontend Workspace state, Workspace Switcher component, and `/w/:workspaceSlug` routing.
