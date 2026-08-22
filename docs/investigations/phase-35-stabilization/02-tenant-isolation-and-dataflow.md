# Phase 35.6 — Tenant Isolation & Workspace Data Flow Audit
## Document 02: Tenant Isolation & Workspace Data Flow Audit

**Status**: Forensic Audit — DO NOT MODIFY SOURCE CODE  
**Investigation Phase**: 35.6  
**Date**: 2026-08-04  
**Investigators**: Principal Software Architect / Principal Forensics Investigator  
**Classification**: Permanent Reference — Append Only  

---

> [!IMPORTANT]
> This document details the complete end-to-end data flow, query filters, cache partitioning, and integration weak points of the Tenant Isolation System.
> Do NOT modify source code or run execution commands during this investigation phase.

---

## 1. Executive Summary

Following Investigation 01's architectural baseline, this investigation performs a deep software forensics audit of the **Tenant Isolation System** across the entire application stack.

### Key Forensic Discoveries

1. **The Disconnected Header Bridge**: `WorkspaceContext` manages active workspace state in React (`currentWorkspace`), but `setActiveWorkspaceSlug(slug)` in `client/src/services/axios.ts` is **never invoked**. As a result, outgoing REST API calls (`/projects`, `/tasks`, `/dashboard/overview`, `/activities`, `/recommendations`, `/search`) omit the `X-Workspace-Slug` HTTP header.
2. **Server-Side Fallback Behavior**: When Express middleware `resolveOptionalWorkspace` receives a request without `workspaceId`/`workspaceSlug` in path params or headers, `req.workspace` remains `undefined`. Controllers pass `workspaceId = undefined` to domain services. Services then execute legacy fallback logic (`provisionPersonalWorkspace`), causing MongoDB to fetch or mutate data in the user's **Personal Workspace**, even when the user is actively viewing a **Team Workspace** URL (`/w/team-alpha/projects`).
3. **Inconsistent React Query Cache Partitioning**: `dashboardKeys` and `activityKeys` include `workspaceId` in their query keys, whereas `projectKeys`, `taskKeys`, `recommendationKeys`, and `searchKeys` omit `workspaceId`. Direct URL navigation across workspaces serves stale cached data for projects and tasks.
4. **Command Palette / Search URL Misdirection**: `global-search.service.ts` uses `generateNavigationUrl` (`search-domain.utils.ts`) which constructs un-prefixed legacy URLs (e.g., `/projects/:id` instead of `/w/:slug/projects/:id`), stripping workspace context during navigation.
5. **Client/Server Model Field Mismatch**: The client `Workspace` TypeScript interface defines `type?: "PERSONAL" | "TEAM"`, used by `AdaptiveRouteGuard`. However, the MongoDB `Workspace` Mongoose schema contains **no `type` field** (only `isPersonal: boolean`), causing `currentWorkspace.type` to be permanently `undefined` at runtime.

---

## 2. End-to-End Workspace Identity Flow

The table and breakdown below trace the 13 step transition of workspace identity from the browser address bar down to MongoDB and back to the UI.

```
[1] Browser URL (/w/alpha-team/projects)
       │
[2] React Router (Route path="w/:workspaceSlug")
       │
[3] WorkspaceContext (params.workspaceSlug -> matches workspace in array)
       │
[4] Workspace Session Engine (localStorage setItem "ai_pm_active_workspace")
       │  ❌ BROKEN BRIDGE: setActiveWorkspaceSlug() IS NOT CALLED
[5] Axios Instance (activeWorkspaceSlug is NULL -> X-Workspace-Slug header NOT attached)
       │
[6] HTTP Request (Authorization: Bearer <token> present; X-Workspace-Slug ABSENT)
       │
[7] Express Router (router.use("/projects", resolveOptionalWorkspace, projectRoutes))
       │
[8] Workspace Middleware (resolveOptionalWorkspace checks headers/params -> none found -> req.workspace = undefined)
       │
[9] Controller (project.controller.ts -> const workspaceId = req.workspace?._id?.toString() = undefined)
       │
[10] Service Layer (listProjects(userId, query, undefined) -> resolves targetWorkspaceId = personalWorkspace._id)
       │
[11] MongoDB Query (Project.find({ workspaceId: personalWorkspace._id, isDeleted: false }))
       │
[12] HTTP Response Envelope ({ success: true, data: { items: [Personal Projects] } })
       │
[13] React Query & UI (Cached under ["projects", "list", params] -> Team UI renders Personal Projects!)
```

### Detailed Layer Analysis

| Step | Layer | Expected Data | Actual Data Present | Failure / Risk |
|---|---|---|---|---|
| 1 | Browser URL | `/w/alpha-team/projects` | `/w/alpha-team/projects` | None |
| 2 | React Router | `params.workspaceSlug = "alpha-team"` | `params.workspaceSlug = "alpha-team"` | None |
| 3 | WorkspaceContext | `currentWorkspace.slug = "alpha-team"` | `currentWorkspace.slug = "alpha-team"` | None |
| 4 | Session Engine | Active slug saved to storage & axios module | `localStorage` updated; `axios.setActiveWorkspaceSlug` **omitted** | **Critical Bridge Failure** |
| 5 | Axios Client | `X-Workspace-Slug: alpha-team` in headers | Header omitted (`activeWorkspaceSlug` is `null`) | **Tenant Signal Loss** |
| 6 | HTTP Request | `Authorization` + `X-Workspace-Slug` | `Authorization` only | Request is un-tenanted |
| 7 | Express Router | Request routed to `/projects` | Request routed to `/projects` | None |
| 8 | Middleware | `req.workspace` populated with `alpha-team` doc | `req.workspace = undefined` | Middleware falls through |
| 9 | Controller | `workspaceId = "ws_alpha_id"` | `workspaceId = undefined` | Controller gets `undefined` |
| 10 | Service Layer | Filter using `ws_alpha_id` | Fallback: fetches Personal Workspace ID | **Silent Data Substitution** |
| 11 | MongoDB Query | `{ workspaceId: ObjectId("ws_alpha_id") }` | `{ workspaceId: ObjectId("ws_personal_id") }` | Queries wrong tenant |
| 12 | Response | Alpha Team Projects | Personal Workspace Projects | Transmits wrong tenant data |
| 13 | React Query & UI | UI renders Alpha Team Projects | UI renders Personal Projects inside Alpha Team layout | **Cross-Tenant Data Leakage** |

---

## 3. API Isolation Audit

Every workspace-aware API endpoint was audited to verify how workspace identity is resolved, whether `workspaceId` is mandatory, whether fallback occurs, and whether isolation is enforced.

| Endpoint Route | Middleware Applied | Resolution Mechanism | Workspace Id Mandatory? | Fallback Behavior | Isolation Security Rating |
|---|---|---|---|---|---|
| `GET /api/v1/projects` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | Personal Workspace | 🔴 Vulnerable (Header missing) |
| `POST /api/v1/projects` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | Personal Workspace | 🔴 Vulnerable (Creates in Personal) |
| `GET /api/v1/projects/:id` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | Personal Workspace | 🟡 Medium (Owner check masks) |
| `PATCH /api/v1/projects/:id` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | Personal Workspace | 🟡 Medium |
| `DELETE /api/v1/projects/:id` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | Personal Workspace | 🟡 Medium |
| `GET /api/v1/tasks` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | Personal Workspace | 🔴 Vulnerable (Header missing) |
| `POST /api/v1/tasks` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | Personal Workspace | 🔴 Vulnerable (Creates in Personal) |
| `GET /api/v1/dashboard/overview` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | Personal Workspace | 🔴 Vulnerable (Shows Personal stats) |
| `GET /api/v1/activities` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | Personal Workspace | 🔴 Vulnerable (Shows Personal logs) |
| `GET /api/v1/notifications` | `authenticate` | None (User-scoped only) | No | Global User Notifications | 🟢 Safe (Global design) |
| `GET /api/v1/search` | `resolveOptionalWorkspace` | `req.workspace` from header/params | No | All User Workspaces (if no WS) | 🟡 Medium (Generates bad URLs) |
| `GET /api/v1/recommendations` | `resolveOptionalWorkspace` | `req.user` only (Missing `req.workspace`) | No | All User Recommendations | 🔴 Vulnerable (Ignores WS) |
| `POST /api/v1/projects/:projectId/copilot` | `resolveOptionalWorkspace` | `projectId` path parameter | Yes (via project) | Throws 404 if not found | 🟢 Secure |
| `POST /api/v1/copilot/actions/dry-run` | `resolveOptionalWorkspace` | `projectId` inside body | Yes (via project) | Throws 404 if not found | 🟢 Secure |
| `POST /api/v1/workspaces` | `authenticate` | Creates new `Workspace` doc | N/A | N/A | 🟢 Secure |
| `GET /api/v1/workspaces` | `authenticate` | Queries `WorkspaceMember` for `userId` | N/A | N/A | 🟢 Secure |
| `GET /api/v1/workspaces/:workspaceId` | `requireWorkspaceMember` | `req.params.workspaceId` | Yes | Throws 404 (Anti-enum) | 🟢 Secure |
| `PATCH /api/v1/workspaces/:workspaceId` | `requireWorkspaceOwner` | `req.params.workspaceId` | Yes | Throws 404 / 403 | 🟢 Secure |
| `DELETE /api/v1/workspaces/:workspaceId` | `requireWorkspaceOwner` | `req.params.workspaceId` | Yes | Throws 404 / 403 | 🟢 Secure |
| `POST /api/v1/workspaces/:workspaceId/invitations` | `requirePermission(MEMBER_INVITE)` | `req.params.workspaceId` | Yes | Throws 404 / 403 | 🟢 Secure |
| `GET /api/v1/invitations/:token` | None (Public) | Token lookup in DB | N/A | Throws 404 / 410 | 🟢 Secure |
| `POST /api/v1/invitations/:token/accept` | `authenticate` | Token lookup in DB | N/A | Throws 400 / 410 | 🟢 Secure |
| `PATCH /api/v1/workspaces/:workspaceId/members/:userId/role` | `requirePermission(MEMBER_UPDATE_ROLE)` | `req.params.workspaceId` | Yes | Throws 404 / 403 | 🟢 Secure |
| `POST /api/v1/workspaces/:workspaceId/transfer-ownership` | `requireWorkspaceOwner` | `req.params.workspaceId` | Yes | Throws 404 / 403 | 🟢 Secure |

---

## 4. Mongo Query Audit

Audit of service-layer MongoDB queries across domain models:

### 1. `Project` Model & Service (`project.service.ts`)
- **Query Scoping**: `listProjects` filters by `workspaceId: targetWorkspaceId, isDeleted: false`.
- **Fallback**: If `explicitWorkspaceId` is missing, calls `provisionPersonalWorkspace(userId)` and assigns `targetWorkspaceId = personal.workspace._id`.
- **Inconsistency**: Single project operations (`getProjectById`, `updateProject`, `deleteProject`) filter by `{ _id: projectId, owner: userId, isDeleted: false }` or `{ _id: projectId, workspaceId: targetWorkspaceId }`. When `workspaceId` is not supplied, they fall back to matching by `owner: userId`. This allows a user to update or delete a project belonging to a Team workspace while in a Personal workspace context.

### 2. `Task` Model & Service (`task.service.ts`)
- **Query Scoping**: `listTasks` filters by `workspaceId: targetWorkspaceId, isDeleted: false`.
- **Fallback**: If `explicitWorkspaceId` is omitted, defaults to Personal Workspace ID.
- **Inconsistency**: `getTaskById`, `updateTask`, `updateTaskNotes`, `deleteTask` accept `explicitWorkspaceId`. If omitted, they fall back to `{ _id: id, owner: userId }` without verifying whether the task belongs to the active workspace.

### 3. `Dashboard` Service (`dashboard.service.ts`)
- **Query Scoping**: `getDashboardOverview` executes aggregated counts and queries filtered by `owner: userId, workspaceId: targetWorkspaceId`.
- **Fallback**: Defaults to Personal Workspace if `explicitWorkspaceId` is undefined.

### 4. `Activity` Model & Service (`activity.service.ts`)
- **Query Scoping**: `listActivities` filters by `{ workspaceId: new Types.ObjectId(explicitWorkspaceId) }`.
- **Fallback**: If `explicitWorkspaceId` is not provided, falls back to `{ owner: new Types.ObjectId(userId) }`, returning activities across all workspaces owned by the user.

### 5. `Notification` Model & Service (`notification.service.ts`)
- **Query Scoping**: `getNotifications` filters solely by `{ recipientId: userObjectId }`.
- **Fallback**: No workspace filtering exists by design. Notifications are global to the user account.

### 6. `ProjectRecommendation` Service (`project-recommendation-query.service.ts`)
- **Query Scoping**: `listWorkspaceRecommendations` filters by `{ userId }`. It **does not filter by `workspaceId`**.
- **Inconsistency**: Recommendations generated for Team Workspace projects appear in the workspace recommendation list even when viewing a Personal Workspace.

### 7. `GlobalSearch` Service (`global-search.service.ts`)
- **Query Scoping**: `searchGlobalEntities` conditionally adds `workspaceId` to filters if `workspaceObjectId` is present.
- **Fallback**: If `workspaceId` is omitted, searches across all workspaces owned by `ownerObjectId`.

---

## 5. React Query Audit

Audit of client-side TanStack Query key factories, cache partitioning, and invalidation behavior:

```
                               React Query Cache Partitioning
┌─────────────────────────────────────────┬─────────────────────────────────────────┐
│     WORKSPACE-SCOPED KEYS               │     WORKSPACE-UNSCOPED KEYS             │
│  (Isolated per workspaceId)             │  (Shared across all workspaces)         │
├─────────────────────────────────────────┼─────────────────────────────────────────┤
│ • dashboardKeys.overview(wsId)          │ • projectKeys.list(params)              │
│ • activityKeys.list(wsId, params)       │ • taskKeys.list(params)                 │
│                                         │ • recommendationKeys.workspaceList()    │
│                                         │ • searchKeys (["global-search", q])     │
│                                         │ • notificationKeys.list(params)         │
└─────────────────────────────────────────┴─────────────────────────────────────────┘
```

### Key Factory Audit Table

| Feature Domain | Query Key Factory | Includes `workspaceId`? | Cache Isolation Status | Invalidation Behavior on WS Switch |
|---|---|---|---|---|
| Workspaces | `workspaceKeys.list()` | N/A (Global list) | Global | Refetched on mutation |
| Auth / User | `authKeys.me()` | N/A (User level) | Global | Static session |
| Dashboard | `dashboardKeys.overview(wsId)` | **YES** | Isolated | Preserved in cache per wsId |
| Activities | `activityKeys.list(wsId, params)` | **YES** | Isolated | Preserved in cache per wsId |
| Projects | `projectKeys.list(params)` | **NO** | **Unpartitioned** | Cleared only via `queryClient.clear()` |
| Tasks | `taskKeys.list(params)` | **NO** | **Unpartitioned** | Cleared only via `queryClient.clear()` |
| Notifications | `notificationKeys.list(params)` | **NO** | Global (Intended) | Invalidated on socket events |
| Recommendations | `recommendationKeys.workspaceList()` | **NO** | **Unpartitioned** | Invalidated on dismiss |
| Global Search | `["global-search", debouncedQuery]` | **NO** | **Unpartitioned** | Stale across switches |
| AI Plan Drafts | `planKeys.project(projectId)` | Via `projectId` | Project-isolated | Invalidated on commit |

### Cache Vulnerabilities

1. **Unpartitioned Project & Task Keys**: Because `projectKeys.list(params)` produces `["projects", "list", params]`, navigating directly between `/w/personal/projects` and `/w/team-alpha/projects` via link or browser history (without invoking `switchWorkspace()`) reuses the existing cache slot.
2. **Inconsistent Invalidation in Event Router**: `event-router.ts` receives domain events, checks `if (event.workspaceId !== activeWorkspaceId) return;`, and then calls `queryClient.invalidateQueries({ queryKey: taskKeys.all })`. Because `taskKeys.all` is `["tasks"]`, it invalidates all task query entries in the cache regardless of workspace.

---

## 6. Local Storage Audit

Audit of all `localStorage` keys accessed by the frontend codebase:

```typescript
// Local Storage Key Catalog

1. "ai_pm_active_workspace"
   - Read by: WorkspaceContext.tsx (line 48)
   - Written by: WorkspaceContext.tsx (lines 93, 126)
   - Content: Active workspace slug (string, e.g., "acme-corp")
   - Scope: Client Session / Machine Global
   - Risk: Persists across logins if not cleared on logout.

2. "ai_pm_favorites_v1"
   - Read by: useFavorites.ts (line 18)
   - Written by: useFavorites.ts (line 28)
   - Content: Array of FavoriteItem objects [{ id, title, type, url }]
   - Scope: Client Session / Machine Global (UNSCOPED)
   - Risk: Favorites pinned in Team Workspace appear in Personal Workspace sidebar. Clicking a favorite for a Team Project while in Personal Workspace triggers unprefixed or cross-workspace navigation.

3. "ai_pm_recently_viewed_v1"
   - Read by: useRecentlyViewed.ts (line 18)
   - Written by: useRecentlyViewed.ts (line 28)
   - Content: Array of RecentlyViewedItem objects [{ id, title, type, url }]
   - Scope: Client Session / Machine Global (UNSCOPED)
   - Risk: Recent items from all workspaces are mixed into a single list.

4. "theme" (managed by next-themes)
   - Read/Written by: next-themes / AuthBootstrap.tsx
   - Content: "dark" | "light" | "system"
   - Scope: Global User Preference
   - Risk: None.
```

---

## 7. Realtime Isolation Audit

Trace of realtime Socket.io lifecycle during workspace switching:

```
[1] User initiates workspace switch (switchWorkspace("team-alpha"))
       │
[2] WorkspaceContext updates state & triggers re-render
       │
[3] RealtimeProvider receives updated activeWorkspaceId ("ws_team_alpha_id")
       │
[4] useRealtimeSync effect runs:
       │  a. Calls realtimeClient.subscribeWorkspace("ws_team_alpha_id")
       │  b. RealtimeClient emits "workspace:unsubscribe" for previous workspace ("ws_personal_id")
       │  c. RealtimeClient emits "workspace:subscribe" for new workspace ("ws_team_alpha_id")
       │
[5] Server Socket handler processes:
       │  a. Leaves Socket room `workspace:ws_personal_id`
       │  b. Verifies user membership in `ws_team_alpha_id`
       │  c. Joins Socket room `workspace:ws_team_alpha_id`
       │  d. Emits presence snapshot for `ws_team_alpha_id`
       │
[6] Inbound Event Handling (handleIncomingDomainEvent):
       │  a. Validates envelope schema
       │  b. Deduplicates event ID
       │  c. Defense in Depth: Checks if event.workspaceId === activeWorkspaceId
       │  d. Dispatches to event-router.ts
       │
[7] Event Router invalidates React Query cache -> UI refreshes
```

### Realtime Vulnerabilities & Race Conditions

1. **Async ACK Race Condition**: If a user rapidly toggles between Workspace A -> Workspace B -> Workspace C, multiple `workspace:subscribe` requests are emitted concurrently. `RealtimeClient` includes a race check (`if (this.pendingSubscriptionWorkspaceId !== workspaceId) return;`) which discards out-of-order ACKs. This guard is **working as intended**.
2. **Socket Reconnection Recovery**: When the socket reconnects after network loss, `useRealtimeSync` triggers `queryClient.invalidateQueries({ predicate: (query) => query.isActive() })`. If the active query keys are not workspace-partitioned, reconnection refetches data using the missing `X-Workspace-Slug` header, populating the cache with Personal Workspace data.

---

## 8. Workflow Trace Results

### Workflow A: Personal Workspace Task Lifecycle
1. User opens `/w/personal-slug/dashboard`.
2. User clicks "Create Project" -> fills form -> submits.
3. `useCreateProject` sends `POST /projects` with payload `{ name: "Personal Project" }`.
4. **Header Check**: `X-Workspace-Slug` header is missing.
5. **Server Handling**: `resolveOptionalWorkspace` falls back to user's Personal Workspace.
6. **Result**: Project is created in Personal Workspace (`workspaceId = personal_id`).
7. **User Perception**: Works correctly because user intended to create it in Personal Workspace.

### Workflow B: Team Workspace Task Lifecycle
1. User opens `/w/acme-team/projects`.
2. User clicks "Create Project" -> fills form -> submits `{ name: "Team Feature" }`.
3. `useCreateProject` sends `POST /projects`.
4. **Header Check**: `X-Workspace-Slug` header is **missing**.
5. **Server Handling**: `resolveOptionalWorkspace` receives no header/param. Falls back to user's Personal Workspace.
6. **Result**: Project is created in Personal Workspace (`workspaceId = personal_id`), **NOT** in `acme-team` (`workspaceId = team_id`).
7. **User Perception**: **CRITICAL BUG**. The user is viewing `/w/acme-team/projects`, but the created project disappears from the Team view (or appears in Personal view upon switching).

### Workflow C: Rapid Workspace Switching Sequence
1. User is on `/w/personal/dashboard`.
2. User selects "Acme Team" from `WorkspaceSwitcher`.
3. `switchWorkspace("acme-team")` runs:
   - Sets `explicitSelectedSlug = "acme-team"`.
   - Saves to `localStorage`.
   - Calls `queryClient.clear()`.
   - Navigates to `/w/acme-team/dashboard`.
4. `DashboardPage` mounts and calls `useDashboardOverview()`.
5. Query key is `["dashboard", "overview", "ws_team_id"]`.
6. API request `GET /dashboard/overview` is sent **without `X-Workspace-Slug` header**.
7. Server returns Personal Workspace overview statistics.
8. **Result**: Team Workspace Dashboard displays Personal Workspace metrics.

### Workflow D: Workspace Invitation & Member Management
1. Owner sends invite via `POST /workspaces/:workspaceId/invitations`.
2. Path parameter `:workspaceId` is explicitly in the URL route.
3. `resolveOptionalWorkspace` and `requirePermission` inspect `req.params.workspaceId` -> successfully resolves target workspace.
4. Invite is generated with `workspaceId = team_id`.
5. Invite recipient opens `/invitations/:token` -> accepts invite via `POST /invitations/:token/accept`.
6. Server adds user to `WorkspaceMember` for `team_id`.
7. **Result**: Invitation flow succeeds because endpoints use explicit path parameters (`/workspaces/:workspaceId/...`) rather than relying on header interceptors.

---

## 9. Integration Weak Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INTEGRATION WEAK POINTS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. WorkspaceContext ──[MISSING CALL]──> axios.setActiveWorkspaceSlug()      │
│    React state changes, but HTTP module variable remains null.              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Command Palette ──[LEGACY URL]──> generateNavigationUrl()                 │
│    Search generates "/projects/:id" instead of "/w/:slug/projects/:id".     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Navigation Hooks ──[UNSCOPED STORAGE]──> localStorage ("ai_pm_favorites") │
│    Favorites & Recently Viewed items are shared globally across workspaces. │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. AdaptiveRouteGuard ──[UNDEFINED FIELD]──> currentWorkspace.type          │
│    Client checks .type ("PERSONAL"|"TEAM"), but Mongo model lacks type field.│
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. Event Router ──[UNSCOPED INVALIDATION]──> taskKeys.all / projectKeys.all │
│    Events are workspace-filtered, but invalidation wipes global keys.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Confirmed Risks

1. **Silent Data Misplacement (Critical)**: All resources (projects, tasks) created while viewing a Team Workspace are stored in the user's Personal Workspace due to the missing HTTP header.
2. **Cross-Tenant Data Leakage in UI (Critical)**: Viewing any Team Workspace dashboard, project list, or task board displays Personal Workspace data.
3. **Broken Command Palette Navigation (High)**: Selecting a search result navigates to an un-prefixed route (`/projects/:id`), triggering legacy redirection that may reset or corrupt the active workspace slug.
4. **Dead Code in Adaptive Route Protection (Medium)**: `AdaptiveRouteGuard` relies on `currentWorkspace.type` which is never populated by the server, forcing fallback to `isPersonal`.

---

## 11. Possible Risks

1. **Stale Cache Contamination across Tabs**: If a user has two tabs open on different workspaces, mutations in Tab A will emit socket events that invalidate queries in Tab B, fetching data without headers and polluting Tab B's cache.
2. **Orphaned Draft Plans**: AI Plan Drafts created in a project retain `workspaceId` from the project. If a project is moved or created in the wrong workspace, plan drafts become associated with the wrong workspace boundary.

---

## 12. Unknowns

1. **Intent behind `notification.service.ts`**: Was notification scoping intentionally designed to be global per user, or should notifications be scoped per workspace?
2. **Rationale for Header vs. Path Parameter Architecture**: Why general resources (`/projects`, `/tasks`) rely on header-based workspace resolution while workspace settings (`/workspaces/:workspaceId`) rely on path parameters.

---

## 13. Recommendations for Future Investigations

1. **Investigation 03 — React Query Key Scoping & Cache Partitioning Strategy**: Design a comprehensive query key factory contract ensuring all workspace-sensitive keys include `workspaceId`.
2. **Investigation 04 — Header Integration & Axios Interceptor Wiring Audit**: Define the exact reactive mechanism to keep `axios.setActiveWorkspaceSlug` synchronized with `WorkspaceContext`.
3. **Investigation 05 — Workspace-Aware Navigation & Search URL Resolution Audit**: Plan updates to `search-domain.utils.ts` and `useFavorites` to ensure all URLs are workspace-prefixed and scoped.

---

*End of Investigation Document 02.*  
*This document is permanent. Do not modify.*  
*Future investigations continue with Document 03.*
