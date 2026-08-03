# Phase 34.5 — Real-Time Collaboration UI Architecture Contract

**Phase**: Phase 34.5 — Real-Time Collaboration UI Integration  
**Step**: 01 — Frozen UI Architecture Contract & Gate 1 Review  
**Status**: FROZEN CONTRACT & GATE 1 PASS  
**Date**: August 1, 2026  
**Author**: Antigravity AI  

---

## Executive Summary & Contract Status

```text
===============================================================================
🔒 FROZEN ARCHITECTURE CONTRACT VERDICT: APPROVED & FROZEN
===============================================================================
- Provider Hierarchy: AppProviders → AuthBootstrap → ProtectedRoute → WorkspaceProvider → RealtimeProvider → DashboardLayout
- Query Philosophy: REST API is 100% authoritative. Realtime INVALIDATES query keys. Realtime NEVER mutates domain cache directly.
- Presence Model: Ephemeral, 3s grace, 10s heartbeat. Never persisted.
- Viewing Awareness: Route-derived (task/project detail). Auto-emitted & auto-cleared.
- Accessibility & UX: Non-intrusive connection UX, aria-live polite/assertive, motion-reduce support.
===============================================================================
```

---

## 1. Provider Hierarchy

The application provider hierarchy is frozen in the exact order below. No other placement or wrapping order is acceptable.

```text
QueryClientProvider (<QueryClientProvider client={queryClient}>)
  └── ThemeProvider (<ThemeProvider>)
        └── TooltipProvider (<TooltipProvider delayDuration={150}>)
              └── RouterProvider (<RouterProvider router={router}>)
                    └── AuthBootstrap (<AuthBootstrap>)
                          └── ProtectedRoute (<ProtectedRoute>)
                                └── WorkspaceProvider (<WorkspaceProvider>)
                                      └── RealtimeProvider (<RealtimeProvider>)
                                            └── DashboardLayoutContent
                                                  ├── DashboardNavbar
                                                  ├── DashboardSidebar
                                                  └── Outlet (Active Workspace Route)
```

### Rationale for Hierarchy Order

1. `QueryClientProvider` and `ThemeProvider` sit at the global root to provide caching and theme context.
2. `AuthBootstrap` restores user session once on initial application load.
3. `ProtectedRoute` verifies `isAuthenticated === true` before mounting workspace layouts.
4. `<WorkspaceProvider>` parses the route parameter (`/w/:workspaceSlug`), resolves `currentWorkspace.id`, and configures active Axios headers.
5. `<RealtimeProvider>` sits directly inside `<WorkspaceProvider>`. This guarantees:
   - User is authenticated (`useAuthStore` has valid user identity).
   - Active workspace slug and workspace ID are resolved (`currentWorkspace.id`).
   - Active workspace Axios headers are set.
   - Socket connection initializes and subscribes to room `workspace:${activeWorkspaceId}` cleanly.

Placing `<RealtimeProvider>` higher in the tree (such as inside `AppProviders` or `AuthBootstrap`) is **STRICTLY FORBIDDEN** because the route parameter `workspaceSlug` and `WorkspaceContext` are not yet active.

---

## 2. Workspace Subscription Lifecycle

The Socket.IO workspace subscription lifecycle connects, subscribes, unsubscribes, and disconnects deterministically according to the state machine below:

```text
               +-----------------------------------+
               |  User Logged In & Workspace Active|
               +-----------------------------------+
                                 |
                                 v
               +-----------------------------------+
               |   realtimeClient.connect(token)   |
               +-----------------------------------+
                                 |
                                 v
               +-----------------------------------+
               |  emit("workspace:subscribe", id)  |
               +-----------------------------------+
                                 |
         +-----------------------+-----------------------+
         |                                               |
         v (Switch Workspace)                            v (Logout / Expired Token)
+-----------------------------------+         +-----------------------------------+
| emit("workspace:unsubscribe", A)  |         |    realtimeClient.disconnect()    |
| emit("workspace:subscribe", B)    |         +-----------------------------------+
+-----------------------------------+
```

### Deterministic State Transition Matrix

| Event / Trigger | Triggering Source | Action Taken | Socket / Transport Result |
| :--- | :--- | :--- | :--- |
| **Initial Login** | User submits login on `/auth/login` | `setUser(user)` in `useAuthStore`, navigate to `/w/:slug/dashboard` | Socket connects with JWT, emits `workspace:subscribe` for `ws_id`. Receives presence snapshot. |
| **Workspace Switch** | User selects new workspace in `WorkspaceSwitcher` | `switchWorkspace(targetSlug)` -> `queryClient.clear()` -> navigate to `/w/:targetSlug/dashboard` | Emits `workspace:unsubscribe` for old ID, then `workspace:subscribe` for new ID. Server joins new room and returns new presence snapshot. |
| **Logout** | User clicks Logout in `UserMenu` | `clearUser()` -> `isAuthenticated` becomes `false` | `realtimeClient.disconnect()` closes socket, clears active room, resets presence state. |
| **Browser Refresh** | User reloads browser tab | Socket disconnects on unload. App mounts, `AuthBootstrap` restores session, `WorkspaceProvider` resolves workspace | Socket connects with fresh JWT, emits `workspace:subscribe` for resolved workspace ID. |
| **Reconnect** | Network drops and recovers | Socket.IO `connect` event handler fires | `RealtimeClient` re-subscribes to `activeWorkspaceId` and invalidates active TanStack queries. |
| **Workspace Eviction**| Server emits `workspace:evicted` | `onEvicted` listener catches event | Toasts error: "Your access to this workspace was revoked", `queryClient.clear()`, switches to fallback workspace. |

---

## 3. Connection UX Specification

Connection states must render deterministically according to the following UI matrix:

| Connection State | Trigger / Condition | Navbar Badge UI | Toast / Alert | Invalidation Action |
| :--- | :--- | :--- | :--- | :--- |
| **Initial Load** | Socket connecting on app load | Hidden / Invisible | None | None (REST handles initial page load) |
| **Brief Disconnect**| Dropped connection < 3s | Hidden / Silent retry | None | None |
| **Long Disconnect** | Dropped connection > 5s | Amber badge: `Reconnecting...` | None | None |
| **Reconnected** | Network restored | Emerald badge: `Connected` (fades after 2s) | None | `queryClient.invalidateQueries()` for active queries |
| **Offline** | `navigator.onLine === false` | Gray badge: `Offline` | None | None |
| **401 Auth Failure** | JWT invalid or expired | Hidden | Toast error: `Session expired` | `clearUser()`, redirect to `/auth/login` |
| **Workspace Eviction**| Server `workspace:evicted` | Hidden | Toast error: `Access revoked` | `queryClient.clear()`, switch workspace |

---

## 4. Query Synchronization Philosophy

The contract enforces four mandatory synchronization principles:

1. **Realtime NEVER owns server state**. Realtime is a transport signal, not a database or state container.
2. **Realtime NEVER mutates TanStack Query cache directly**. Client components never invoke `queryClient.setQueryData` for domain entities (projects, tasks, activities, plans) upon receiving real-time events.
3. **Realtime INVALIDATES query keys**. Realtime events invoke `queryClient.invalidateQueries({ queryKey })`.
4. **REST API is 100% authoritative**. Invalidation causes TanStack Query to refetch fresh, verified data from the server REST API.

### Explicit Exceptions
Ephemeral workspace presence snapshots (`WorkspacePresenceSnapshot`) and viewing awareness state (`presence:viewing`) are ephemeral client UI state managed in memory by `RealtimeClient` / `usePresenceAwareness`. They are **NOT** stored in TanStack Query.

---

## 5. Event Routing Flow

All incoming real-time events must strictly follow the unidirectional data flow below. No component or hook is permitted to bypass this pipeline.

```text
Authoritative Domain Event (Server Pub/Sub)
  │
  ▼ (Socket.IO JSON Envelope)
RealtimeClient (Zod Validation + 500-Item LRU Deduplication)
  │
  ▼ (Active Workspace Guard: event.workspaceId === activeWorkspaceId)
routeDomainEvent(event, queryClient, activeWorkspaceId)
  │
  ▼ (Switch-case mapping on event.type)
TanStack Query Invalidation (e.g. queryClient.invalidateQueries({ queryKey: taskKeys.all }))
  │
  ▼ (React Query Internal Scheduler & Batching)
REST API Refetch (GET /api/v1/...) ──► Authoritative Server State ──► UI Component Rerender
```

---

## 6. Ephemeral Presence Philosophy

1. **Ephemeral**: Presence state exists only in server and client memory. It is never written to MongoDB, never cached in localStorage, and never stored in TanStack Query.
2. **Heartbeats**: Server sends heartbeats every 10 seconds.
3. **3-Second Grace Period**: Server grants a 3-second grace window upon socket disconnect before evicting a member from room presence, preventing UI flicker during quick page transitions or momentary network blips.
4. **Presence Snapshots**: Server emits `workspace:presence:snapshot` upon room subscription ACK and `workspace:presence:updated` when member presence or viewing state changes.

---

## 7. Viewing Awareness Contract

1. **Emitted**: Automatically when user enters a resource route (Task Detail or Project Detail). `usePresenceAwareness` sends `presence:viewing` `{ resourceType: "task" | "project", resourceId }`.
2. **Cleared**: Automatically when user navigates away from the resource route, emitting `presence:viewing` `null`.
3. **Qualifying Routes**:
   - `/w/:workspaceSlug/tasks/:taskId`
   - `/w/:workspaceSlug/tasks/:taskId/notes`
   - `/w/:workspaceSlug/projects/:projectId`
4. **Avatar Stack & Overflow Rules**:
   - Maximum of **4 avatar circles** rendered inline in the header stack.
   - If viewers > 4: Render 3 avatars + a numeric overflow pill (`+N` e.g. `+3`), wrapped inside a Radix UI Tooltip listing remaining viewer names.

---

## 8. UI Component Inventory & Ownership

| Component Name | File Location | Primary Purpose / Responsibilities |
| :--- | :--- | :--- |
| `<RealtimeProvider>` | `client/src/realtime/RealtimeProvider.tsx` | Context provider wrapping layout inside `WorkspaceProvider`. Initializes `useRealtimeSync()` and exposes connection state. |
| `<WorkspacePresenceStack />` | `client/src/features/workspaces/components/WorkspacePresenceStack.tsx` | Renders avatar stack of active workspace members in `DashboardNavbar`. |
| `<ViewingCollaborators />` | `client/src/features/tasks/components/ViewingCollaborators.tsx` | Renders viewing collaborator banner/avatars in Task & Project headers. |
| `<ConnectionStatusBadge />` | `client/src/features/workspaces/components/ConnectionStatusBadge.tsx` | Renders connection status pill (`Reconnecting...`, `Offline`, `Connected`). |
| `<PresenceBadge />` | `client/src/features/workspaces/components/PresenceBadge.tsx` | Renders online/offline green dot badge in Workspace Members list. |

---

## 9. Accessibility (a11y) Specification

- **Live Updates**: Live update containers use `aria-live="polite"` for non-disruptive notifications.
- **Connection Loss**: Critical disconnect alerts use `aria-live="assertive"`.
- **Presence Avatars**: Screen-reader accessible name attributes (`aria-label="User Jane Doe is online"`).
- **Keyboard Support**: Avatar stacks and overflow pills are wrapped in focusable Radix UI Tooltip triggers (`TooltipTrigger`).
- **Color Contrast**: Emerald dot (`bg-emerald-500`) and Amber dot (`bg-amber-500`) satisfy WCAG AA contrast ratio (> 4.5:1).
- **Reduced Motion**: All pulse animations respect `prefers-reduced-motion: reduce` (`motion-reduce:animate-none`).

---

## 10. Animation Philosophy

- **No Flashy Animations**: No spinning indicators or blinking badges during normal connected operation.
- **Subtle Fades**: Reconnection status badges use smooth fade transitions (`transition-opacity duration-200`).
- **Minimal Layout Shifts**: Avatar stacks use fixed dimensions (`h-7 w-7`) with negative margins (`-space-x-2`) to prevent layout jumping when members join/leave.

---

## 11. Performance Rules

1. **500-Item LRU Event Deduplication**: `RealtimeClient` tracks incoming event IDs in a 500-item bounded Set to prevent duplicate query invalidations.
2. **Active Workspace Guard**: `RealtimeClient` and `event-router` ignore incoming events whose `workspaceId` does not match `activeWorkspaceId`.
3. **Batched TanStack Invalidation**: Invalidation delegates state updates to React Query's internal rendering scheduler, avoiding React re-render thrashing.
4. **Hook Memoization**: `usePresenceAwareness` uses `React.useMemo` for active viewing filter calculations.

---

## 12. Error Handling Matrix

| Error Scenario | Detection Point | Handling Procedure |
| :--- | :--- | :--- |
| **401 Unauthorized** | Socket `connect_error` or JWT failure | Trigger `clearUser()`, clear tokens, redirect to `/auth/login`. |
| **403 Eviction** | Server `workspace:evicted` event | Toast error "Your access to this workspace was revoked", `queryClient.clear()`, switch to fallback workspace. |
| **Network Loss** | `window.addEventListener("offline")` or socket disconnect | Display gray `Offline` badge in navbar. |
| **Malformed Event** | Zod `safeParse()` fails in `RealtimeClient` | Log warning, drop malformed payload, maintain application state. |
| **Socket Connection Failure**| Socket fails to connect after retries | App degrades gracefully to standard REST behavior; manual user actions refetch normally. |

---

## 13. Testing Strategy

- **Unit & Service Tests (`client/src/realtime/realtime.test.ts`)**:
  - Test `RealtimeClient` connection and disconnection lifecycle.
  - Test Zod validation and 500-item LRU event deduplication.
  - Test `routeDomainEvent` mapping to TanStack Query invalidation keys.
  - Test presence snapshot and viewing state parsing.
- **Component & Integration Tests (`client/src/features/workspaces/workspace-realtime-ui.test.tsx`)**:
  - React Testing Library tests for `<WorkspacePresenceStack />`, `<ViewingCollaborators />`, `<ConnectionStatusBadge />`, and `<PresenceBadge />`.
  - Verify workspace switching clears cache and updates subscriptions.

---

## 14. Work Package Responsibilities & Boundaries

```text
+-----------------------------------------------------------------------------+
| WP-1: Realtime Provider & Workspace Lifecycle Integration                   |
| Owns: <RealtimeProvider>, useRealtimeSync, connect/disconnect, workspace    |
| subscription/unsubscription, <ConnectionStatusBadge>.                       |
+-----------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------+
| Gate 1 — Transport & Provider Readiness                                     |
| Verification: Provider mounting, workspace subscription switching, zero     |
| leaks on logout, connection status badge rendering.                        |
+-----------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------+
| WP-2: Live Cache Synchronization & Domain Event Router Integration          |
| Owns: routeDomainEvent mapping to taskKeys, projectKeys, activityKeys,      |
| dashboardKeys, planKeys, workspaceKeys, notificationKeys, live refetches.   |
+-----------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------+
| WP-3: Ephemeral Presence & Viewing Awareness UI Components                  |
| Owns: <WorkspacePresenceStack />, <PresenceBadge />,                        |
| <ViewingCollaborators />, usePresenceAwareness integration.                 |
+-----------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------+
| Gate 2 — Live Cache Sync & Presence UI Verification                         |
| Verification: Realtime query invalidations across all pages, presence bar,  |
| viewing collaborator stacks on task/project headers.                        |
+-----------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------+
| WP-4: Realtime UI Hardening, Accessibility & E2E Testing                    |
| Owns: aria-live, screen reader support, motion-reduce, offline UX, RTL tests |
| for all components, final production hardening.                            |
+-----------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------+
| Gate 3 — Final End-to-End Realtime UI Certification                         |
| Verification: 100% green test pipeline across client and server.             |
+-----------------------------------------------------------------------------+
```

---

## 15. Contract Refinements (from Step 00 Investigation)

1. **Explicit `<RealtimeProvider>` Component**: Step 00 noted `useRealtimeSync()` was called inside `DashboardLayoutContent`. The frozen contract explicitly introduces `<RealtimeProvider>` in `client/src/realtime/RealtimeProvider.tsx` to wrap `DashboardLayoutContent` inside `WorkspaceProvider`.
2. **Presence Snapshot ACK Handshake**: Server emits `workspace:presence:snapshot` immediately inside the subscription ACK callback to guarantee client receives initial presence state without waiting for the next heartbeat.
3. **Notification Invalidation Scope**: `event-router` explicitly invalidates `notificationKeys.unreadCount()` and `notificationKeys.lists()` on domain events that trigger user notifications.

---

## Gate 1 — Architecture Readiness Review

```text
===============================================================================
✅ GATE 1 REVIEW VERDICT: PASS
===============================================================================
- Provider Hierarchy Frozen:  PASS (QueryClient -> Theme -> Tooltip -> Router -> AuthBootstrap -> ProtectedRoute -> WorkspaceProvider -> RealtimeProvider -> DashboardLayout)
- Workspace Lifecycle Frozen: PASS (Connect, Subscribe, Switch, Unsubscribe, Disconnect, Eviction, Reconnect)
- Connection UX Frozen:       PASS (Deterministic states for initial, brief/long disconnect, reconnected, offline, 401, eviction)
- Query Sync Philosophy:      PASS (REST is 100% authoritative; Realtime INVALIDATES query keys)
- Event Routing Flow Frozen:  PASS (Domain Event -> RealtimeClient -> Active Workspace Guard -> routeDomainEvent -> TanStack Query Invalidation -> REST Refetch)
- Presence Philosophy Frozen: PASS (Ephemeral, 3s grace, 10s heartbeat, non-persisted)
- UI Ownership Frozen:        PASS (<RealtimeProvider>, <WorkspacePresenceStack />, <ViewingCollaborators />, <ConnectionStatusBadge />, <PresenceBadge />)
- Accessibility Frozen:       PASS (aria-live polite/assertive, screen reader labels, keyboard tooltips, motion-reduce)
- Performance Rules Frozen:   PASS (500-item LRU dedupe, workspace guard, batched invalidation)
- Testing Strategy Frozen:    PASS (Client unit/service tests & React Testing Library component suites)
- WP Boundaries Frozen:       PASS (WP-1 -> Gate 1 -> WP-2 & WP-3 -> Gate 2 -> WP-4 -> Gate 3)
===============================================================================
```

**Justification**: The architecture is fully defined, frozen, and verified. WP-1 implementation is 100% safe to begin.
