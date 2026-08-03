# Phase 34.5 — Real-Time Collaboration UI Integration Investigation & Feasibility Report

**Phase**: Phase 34.5 — Real-Time Collaboration UI Integration  
**Step**: 00 — Repository Investigation & UI Integration Feasibility  
**Status**: COMPLETE (Investigation Only — Zero Code Modifications Made)  
**Date**: August 1, 2026  
**Author**: Antigravity AI  

---

## Executive Summary & Overall Feasibility

```text
===============================================================================
✅ FEASIBILITY VERDICT: 100% FEASIBLE & ARCHITECTURALLY ALIGNED
===============================================================================
- Backend Platform: Production-grade Socket.IO transport, JWT handshake auth,
  workspace room isolation, typed event envelopes, presence snapshots, viewing
  awareness, and rate limiting (Phase 34 PASS).
- Client Foundation: RealtimeClient, routeDomainEvent, useRealtimeSync, and
  usePresenceAwareness created in Phase 34 WP-5/WP-6.
- Frontend Stack: React 18, TanStack Query v5, Zustand, React Router v6, Tailwind CSS.
- Integration Impact: ZERO architectural refactoring required. Realtime domain
  events map cleanly to existing TanStack Query key factories, and presence/viewing
  components fit naturally into existing layout components.
===============================================================================
```

---

## Section I: 15-Point Detailed Architectural Investigation

### 1. Provider Placement Analysis

We evaluated four potential placement locations for the Realtime Provider:

| Candidate Location | Feasibility | Rationale |
| :--- | :--- | :--- |
| **Entire App (`AppProviders`)** | ❌ Rejected | Too early. Unauthenticated users (e.g. on `/auth/login`) do not have an access token or selected workspace. Socket would attempt unauthenticated connections or fail. |
| **Auth Bootstrap (`AuthBootstrap`)** | ❌ Rejected | User identity is restored, but workspace route parameters (`/w/:workspaceSlug`) and workspace context are not yet active. |
| **Dashboard Layout (`DashboardLayout`)** | ✅ **RECOMMENDED** | `<WorkspaceProvider>` parses `workspaceSlug`, resolves `currentWorkspace`, and updates Axios headers. Placing `<RealtimeProvider>` inside `<WorkspaceProvider>` guarantees both `useAuthStore` and `useActiveWorkspace` are available. |
| **Workspace Context (`WorkspaceContext`)** | ✅ Co-located | Directly integrated inside `WorkspaceProvider` via `useRealtimeSync()` hook. |

**Recommendation**: The Realtime Provider logic belongs inside `WorkspaceProvider` within `DashboardLayout.tsx`. This ensures that every workspace-prefixed route (`/w/:workspaceSlug/*`) has an active socket connection subscribed to the exact workspace room.

---

### 2. Workspace Subscription Lifecycle

The Socket.IO workspace subscription lifecycle connects, subscribes, unsubscribes, and disconnects deterministically:

```text
               +----------------------------------+
               | User Logged In & Workspace Active|
               +----------------------------------+
                                |
                                v
               +----------------------------------+
               |  realtimeClient.connect(token)   |
               +----------------------------------+
                                |
                                v
               +----------------------------------+
               | emit("workspace:subscribe", id)  |
               +----------------------------------+
                                |
         +----------------------+----------------------+
         |                                             |
         v (Switch Workspace)                          v (Logout / Token Expired)
+----------------------------------+         +----------------------------------+
| emit("workspace:unsubscribe", A) |         |   realtimeClient.disconnect()    |
| emit("workspace:subscribe", B)   |         +----------------------------------+
+----------------------------------+
```

1. **Initial Connect**: User opens `/w/alpha-workspace/dashboard`. `AuthBootstrap` restores session. `WorkspaceProvider` resolves `currentWorkspace.id = "ws_alpha"`. `RealtimeClient.connect()` initializes WebSocket transport with JWT auth token. On Socket.IO `connect` event, client emits `workspace:subscribe` `{ workspaceId: "ws_alpha" }`. Server validates membership, joins room `workspace:ws_alpha`, and emits `workspace:presence:snapshot`.
2. **Workspace Switching**: User switches workspace from `ws_alpha` to `ws_beta`. `switchWorkspace("beta-workspace")` calls `queryClient.clear()` and navigates to `/w/beta-workspace/dashboard`. `WorkspaceContext` resolves new ID `"ws_beta"`. `useRealtimeSync` triggers `subscribeWorkspace("ws_beta")`. `RealtimeClient` emits `workspace:unsubscribe` `{ workspaceId: "ws_alpha" }` followed by `workspace:subscribe` `{ workspaceId: "ws_beta" }`. Server leaves room `workspace:ws_alpha` and joins `workspace:ws_beta`, returning a fresh presence snapshot.
3. **Logout**: `clearUser()` sets `isAuthenticated = false`. `useRealtimeSync` calls `realtimeClient.disconnect()`. Socket disconnects transport, resets presence snapshot and subscription state.
4. **Browser Refresh**: Socket disconnects on window unload. Page reloads, `AuthBootstrap` restores user session, `WorkspaceProvider` resolves workspace, socket connects and re-subscribes.
5. **Reconnect**: Socket.IO automatically reconnects on network drops. On `connect`, client automatically re-subscribes to `activeWorkspaceId` and invalidates active TanStack queries to fill any missed event gaps.
6. **Workspace Eviction**: When server emits `workspace:evicted`, `onEvicted` handler toasts warning, clears query cache (`queryClient.clear()`), and switches to fallback workspace.

---

### 3. Existing Query Structure & TanStack Query Key Mapping

All TanStack Query keys across the application use centralized query key factories:

- `taskKeys`: `all: ["tasks"]`, `lists()`, `list(params)`, `details()`, `detail(id)`
- `projectKeys`: `all: ["projects"]`, `lists()`, `list(params)`, `details()`, `detail(id)`, `summaries()`, `summary(id)`, `options()`
- `activityKeys`: `all: ["activities"]`, `lists(workspaceId)`, `list(workspaceId, params)`, `project(id)`, `task(id)`
- `workspaceKeys`: `all: ["workspaces"]`, `list()`, `detail(id)`
- `dashboardKeys`: `all: ["dashboard"]`, `overview(workspaceId)`
- `planKeys`: `all: ["plans"]`, `project(id)`, `detail(id)`
- `notificationKeys`: `all: ["notifications"]`, `lists()`, `list(params)`, `unreadCount()`

**Domain Event to Query Key Invalidation Mapping**:

| Authoritative Domain Event | TanStack Query Invalidations |
| :--- | :--- |
| `task.created` | `taskKeys.all`, `dashboardKeys.all`, `activityKeys.all`, `projectKeys.detail(projectId)`, `projectKeys.summary(projectId)` |
| `task.updated` / `task.archived` | `taskKeys.all`, `taskKeys.detail(taskId)`, `dashboardKeys.all`, `activityKeys.all`, `projectKeys.detail(projectId)` |
| `task.deleted` | `taskKeys.all`, `queryClient.removeQueries(taskKeys.detail(taskId))`, `dashboardKeys.all`, `activityKeys.all` |
| `project.created` / `project.updated` / `project.archived` | `projectKeys.all`, `projectKeys.detail(projectId)`, `dashboardKeys.all`, `activityKeys.all` |
| `project.deleted` | `projectKeys.all`, `queryClient.removeQueries(projectKeys.detail(projectId))`, `dashboardKeys.all`, `activityKeys.all` |
| `activity.created` | `activityKeys.all` |
| `member.removed` | `workspaceKeys.all` |
| `plan.committed` | `planKeys.all`, `taskKeys.all`, `projectKeys.all`, `dashboardKeys.all`, `activityKeys.all` |

**Identified Refinement**:
- `notificationKeys.unreadCount()` and `notificationKeys.lists()` should be invalidated on domain events that create user notifications, ensuring the navbar notification badge updates live.

---

### 4. Existing Page Integration Matrix

| Existing Page / Component | Primary Query Hook | Realtime Invalidation / State Integration | UI Component Additions |
| :--- | :--- | :--- | :--- |
| **Dashboard (`DashboardPage.tsx`)** | `useDashboardOverview` | `dashboardKeys.all` invalidates overview metrics on task/project changes. | Navbar Presence Avatar Stack & Connection Status Indicator |
| **Projects List (`ProjectsDashboardPage.tsx`)** | `useProjects` | `projectKeys.all` invalidates project cards live. | Realtime update badges on modified cards |
| **Project Detail (`ProjectDetailPage.tsx`)** | `useProject`, `useProjectSummary` | `projectKeys.detail(id)`, `taskKeys.all` invalidates detail & task list. | Header Viewing Collaborators Stack (`User B viewing`) |
| **Tasks Page (`TasksPage.tsx`)** | `useTasks` | `taskKeys.all` invalidates task table/board live. | Live status/priority changes |
| **Task Detail (`TaskDetailPage.tsx`)** | `useTask` | `taskKeys.detail(id)` invalidates task fields live. | Header Viewing Collaborators (`User B viewing this task`) |
| **Activity Feed (`ActivityPage.tsx`)** | `useActivities` | `activityKeys.all` invalidates page 1 of infinite query. | Live feed update banner |
| **Notifications (`NotificationBell.tsx`)** | `useUnreadNotificationCount` | `notificationKeys.all` invalidates unread count badge. | Live badge counter update & toast alerts |
| **Workspace Members (`SettingsPage.tsx`)** | `useWorkspaceDetails` | `workspaceKeys.all` invalidates member list. | Online/Offline status badge next to member name |

---

### 5. Presence Integration (Online Members)

Online workspace member presence will appear in two distinct UI locations:

1. **Dashboard Navbar (`DashboardNavbar.tsx`)**:
   - `<WorkspacePresenceStack />` component rendering avatar circles of active collaborators in the current workspace with green online indicator dots (`bg-emerald-500`).
2. **Workspace Settings / Members List (`SettingsPage.tsx`)**:
   - `<PresenceBadge status={member.isOnline ? "online" : "offline"} />` next to each workspace member's role badge.

---

### 6. Viewing Awareness Integration

Viewing awareness tracks which specific resources collaborators are currently viewing:

- **Task Detail (`/w/:workspaceSlug/tasks/:taskId`)**:
  - `usePresenceAwareness()` inspects route params (`taskId`).
  - Automatically emits `presence:viewing` `{ resourceType: "task", resourceId: taskId }`.
  - Component displays `<ViewingCollaborators users={activeViewingUsers} />` in task header (e.g. "Jane Doe is viewing this task").
- **Project Detail (`/w/:workspaceSlug/projects/:projectId`)**:
  - `usePresenceAwareness()` inspects route params (`projectId`).
  - Emits `presence:viewing` `{ resourceType: "project", resourceId: projectId }`.
  - Displays viewing collaborator avatars in project header.

---

### 7. Notifications Architecture Integration

- The backend creates notification documents when activities or domain events occur.
- Upon receiving `activity.created` or relevant domain events, `routeDomainEvent` invalidates `notificationKeys.unreadCount()` and `notificationKeys.lists()`.
- `NotificationBell` automatically refetches the latest unread count from the server REST API, ensuring badge accuracy without client-side polling.
- Optional non-intrusive `sonner` toast alerts will be triggered for high-priority events (e.g. task assignment, plan commitment).

---

### 8. Activity Feed Integration

- `useActivities()` uses `useInfiniteQuery` with a 5-minute `staleTime` (no client polling).
- **Recommendation**: **Realtime Invalidation via TanStack Query**.
- **Rationale**: Invalidating `activityKeys.all` causes TanStack Query to refetch page 1 from the authoritative server REST API. This preserves 100% server authority, handles cursor pagination cleanly, and prevents duplicate or out-of-order items.

---

### 9. Error Handling & Edge Cases

| Edge Case / Error State | Handling Mechanism | UI / UX Behavior |
| :--- | :--- | :--- |
| **401 Unauthorized** | JWT access token verification fails. `Axios` refresh triggered. If refresh fails, `clearUser()` called. | Socket disconnects cleanly. User redirected to `/auth/login`. |
| **403 Forbidden / Workspace Eviction** | Server emits `workspace:evicted` event. `onEvicted` listener catches event. | Toast error "Your access to this workspace was revoked", `queryClient.clear()`, redirect to fallback workspace. |
| **Workspace Switch** | User selects new workspace in `WorkspaceSwitcher`. | `queryClient.clear()`, route updates, socket unsubscribes from old workspace room and subscribes to new workspace room. |
| **Logout** | User clicks Logout in `UserMenu`. | `clearUser()` sets `isAuthenticated = false`. `realtimeClient.disconnect()` closes socket cleanly. |
| **Network Loss (Offline)** | Browser loses internet connectivity. Socket.IO enters reconnecting state. | Displays subtle offline badge in navbar (`Reconnecting...`). |
| **Reconnection** | Network restored. Socket.IO reconnects. | Client re-subscribes to workspace room, invalidates active queries to fetch missed updates, shows brief green badge (`Connected`). |

---

### 10. Loading & Reconnecting UX

- **Initial Load**: Invisible background socket connection while REST queries populate UI.
- **Brief Reconnect (< 3s)**: Silent retry. No intrusive UI flashes.
- **Extended Disconnect (> 5s)**: Small amber badge in Navbar (`Reconnecting to realtime updates...`).
- **Reconnected**: Brief green badge (`Connected`), auto-fading after 2 seconds.

---

### 11. Component Boundaries & Architecture

```text
client/src/
├── realtime/                          # Service Layer & Transport Engine
│   ├── realtime-client.ts             # Socket.IO singleton, Zod validation, LRU deduplication
│   ├── event-router.ts                # Event envelope to TanStack Query key mapping
│   ├── realtime-types.ts              # Zod schemas & TypeScript types
│   ├── useRealtimeSync.ts             # React Query & workspace lifecycle sync hook
│   ├── usePresenceAwareness.ts        # Ephemeral presence & viewing awareness hook
│   └── useRealtimeStatus.ts           # Socket connection status hook
├── features/
│   ├── workspaces/components/         # Presentational Presence & Status Components
│   │   ├── WorkspacePresenceStack.tsx # Navbar collaborator avatar stack
│   │   ├── PresenceBadge.tsx          # Online/offline member badge
│   │   └── ConnectionStatusBadge.tsx  # Reconnecting/connected indicator
│   ├── tasks/components/
│   │   └── ViewingCollaborators.tsx   # "User A is viewing this task" header banner
│   └── projects/components/
│       └── ProjectViewingHeader.tsx   # Project collaborator viewing stack
```

**Boundary Rule**: Realtime transport, event parsing, and query invalidation logic are strictly isolated inside `client/src/realtime/` hooks and services. Presentational UI components render pure props and hook state without touching raw socket instances.

---

### 12. Styling System Integration

Integration uses existing UI design system tokens and component primitives:
- Tailwind CSS v3 CSS variables (`bg-background`, `text-primary`, `border-border`).
- Radix UI primitives (`@radix-ui/react-tooltip`, `@radix-ui/react-popover`, `@radix-ui/react-avatar`, `@radix-ui/react-badge`).
- Lucide React icons (`Signal`, `WifiOff`, `Users`, `Eye`).
- `sonner` toast notifications.

---

### 13. Accessibility (a11y) Considerations

- Non-disruptive `aria-live="polite"` regions for realtime presence updates and notifications.
- Assertive `aria-live="assertive"` region for extended connection status drops.
- Screen-reader accessible online status text (`aria-label="User Jane Doe is online"`).
- Keyboard accessible tooltips for presence avatar stacks.

---

### 14. Performance Considerations

1. **500-Item LRU Event Deduplication**: `RealtimeClient` tracks incoming event IDs in a 500-item bounded Set to prevent duplicate query invalidations.
2. **Active Workspace Eligibility Check**: `event-router` and `RealtimeClient` verify `event.workspaceId === activeWorkspaceId` before invalidating any queries.
3. **Batched TanStack Invalidation**: Invalidation delegates state updates to React Query's internal rendering scheduler, avoiding React re-render thrashing.
4. **Hook Memoization**: `usePresenceAwareness` uses `useMemo` for active viewing filter calculations.

---

### 15. Testing Structure

- **Unit & Integration Tests**: `client/src/realtime/realtime.test.ts` (verifies `RealtimeClient`, `event-router`, presence, viewing state, and invalidations using mock socket server).
- **Component Tests**: `client/src/features/workspaces/workspace-realtime-ui.test.tsx` (React Testing Library tests for `<WorkspacePresenceStack />`, `<ViewingCollaborators />`, and `<ConnectionStatusBadge />`).

---

## Section II: Deliverables

### 1. Overall Feasibility
**100% FEASIBLE**. The backend Phase 34 realtime infrastructure and client foundation (`realtime-client.ts`, `event-router.ts`, `useRealtimeSync.ts`, `usePresenceAwareness.ts`) are fully tested and aligned with the existing frontend React / TanStack Query / Zustand / Tailwind architecture. Zero breaking changes or architectural refactoring required.

### 2. Recommended Integration Architecture
- `<RealtimeProvider>` placed inside `<WorkspaceProvider>` in `DashboardLayout.tsx`.
- Realtime events drive TanStack Query invalidation via `routeDomainEvent`.
- `usePresenceAwareness` hook drives viewing state (`presence:viewing`) and active workspace presence snapshot rendering.

### 3. Potential Blockers
**NONE**. All backend Socket.IO endpoints, JWT authentication middleware, workspace room isolation, typed event contracts, presence protocol, and rate limiting are verified green.

### 4. Risks & Mitigations

| Identified Risk | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Invalidation Refetch Spikes** | Low | TanStack Query `staleTime` and built-in request deduplication combined with `RealtimeClient`'s 500-item LRU event ID deduplication. |
| **Cross-Tenant Event Leak** | High | `RealtimeClient` verifies `event.workspaceId === activeWorkspaceId` and `routeDomainEvent` performs defense-in-depth workspace eligibility checks. |
| **Offline Missed Events** | Medium | On Socket.IO `connect` / reconnect event, `RealtimeClient` re-subscribes to workspace and invalidates active TanStack queries. |

### 5. Required Work Packages (Phase 34.5 WP Breakdown)

- **WP-1: Realtime Provider & Workspace Lifecycle Integration**
  - Implement `<RealtimeProvider>` inside `<WorkspaceProvider>`, connect/disconnect lifecycle, workspace switching subscription, reconnection state management, and `<ConnectionStatusBadge />`.
- **WP-2: Live Cache Synchronization & Domain Event Router Integration**
  - Wire up `routeDomainEvent` to TanStack Query key factories (`taskKeys`, `projectKeys`, `activityKeys`, `dashboardKeys`, `planKeys`, `workspaceKeys`, `notificationKeys`), add toast alerts for key events, and verify live refetches across Dashboard, Projects, Tasks, and Activity pages.
- **WP-3: Ephemeral Presence & Viewing Awareness UI Components**
  - Implement `<WorkspacePresenceStack />` in Navbar, `<PresenceBadge />` in Workspace Members list, and `<ViewingCollaborators />` in Task & Project Detail headers using `usePresenceAwareness`.
- **WP-4: Realtime UI Hardening, Accessibility & E2E Testing**
  - Add `aria-live` accessibility, connection state indicators, offline handling, error fallback, and complete React Testing Library frontend integration suites.

### 6. Recommended Gate Structure (Maximum 3 Gates)

```text
+-----------------------------------------------------------------------------+
| Gate 1 — Transport & Provider Readiness                                     |
| Verify <RealtimeProvider> lifecycle, workspace subscription/unsubscription,  |
| connection status UI, and zero socket leaks on logout/switch.                |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
| Gate 2 — Live Cache Sync & Presence UI Verification                         |
| Verify live REST query invalidations across Dashboard, Projects, Tasks,     |
| Activity, and Notifications alongside presence & viewing awareness UI.      |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
| Gate 3 — Final End-to-End Realtime UI Certification                         |
| Complete verification of presence, viewing awareness, accessibility,       |
| offline handling, and 100% green test pipeline across client and server.    |
+-----------------------------------------------------------------------------+
```

### 7. Suggested Implementation Order
1. **WP-1: Realtime Provider & Workspace Lifecycle Integration** -> **Gate 1**
2. **WP-2: Live Cache Synchronization & Domain Event Router Integration**
3. **WP-3: Ephemeral Presence & Viewing Awareness UI Components** -> **Gate 2**
4. **WP-4: Realtime UI Hardening, Accessibility & E2E Testing** -> **Gate 3**

### 8. Phase 34 Improvements Discovered During Investigation
- No breaking backend changes needed.
- Refinement: Server `workspace:presence:snapshot` is emitted immediately upon room subscription ACK so client receives presence state without delay.

### 9. Prerequisites BEFORE UI Implementation Begins
1. Confirm all Phase 34 backend tests remain 100% green (`npm run verify`).
2. Verify environment variable `VITE_WS_URL` fallback configuration in `client/.env`.
