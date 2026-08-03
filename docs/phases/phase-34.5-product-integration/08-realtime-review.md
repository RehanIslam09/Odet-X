# 08 — Realtime Collaboration & Infrastructure Audit

**Author**: Principal Realtime Systems Architect & Lead Frontend Engineer  
**Date**: August 2, 2026  
**Scope**: Socket.io Server Infrastructure (`@ai-project-manager/server/realtime`) and Client Subscription Layer (`@ai-project-manager/client/realtime`)  

---

## 1. Realtime Subsystem Health Audit

The application's realtime architecture is powered by Socket.io, providing multi-tenant isolated communication rooms (`workspace:${workspaceId}`).

### Live Realtime Capabilities:
1. **Workspace Presence Awareness**:
   - Event: `workspace:presence` (emitted on user join, leave, or heartbeat).
   - Client Hook: `usePresenceAwareness.ts`.
   - UI Surface: Renders online/idle status dots next to workspace members in `DashboardSidebar.tsx`.
2. **Task Specification Viewing Awareness**:
   - Event: `workspace:viewing` (emitted when a user opens `TaskNotesWorkspacePage.tsx`).
   - Client Hook: `usePresenceAwareness.ts`.
   - UI Surface: Renders active collaborator avatar pile in `TaskNotesToolbar.tsx` and top navbar.
3. **Domain Event Bus Relay**:
   - Event: `domain:event` (emitted when entity mutations occur: `task.created`, `task.updated`, `project.created`, `activity.created`, `member.removed`, `plan.committed`).
   - Client Handler: `event-router.ts`.
   - UI Surface: Automatically invalidates TanStack Query caches (`queryClient.invalidateQueries`), providing instant UI updates across windows without full page refreshes.
4. **Workspace Eviction**:
   - Event: `workspace:evicted` (emitted when a member is removed from a workspace).
   - Client Handler: `RealtimeProvider.tsx`.
   - UI Surface: Automatically evicts the user from the workspace room and redirects to their default workspace.

---

## 2. Realtime UX Enhancements (Phase 34.5 Polish)

1. **Quiet Connection Badge Behavior**:
   - Currently, `DashboardNavbar.tsx` displays a static green `Connected` pill at all times.
   - *Enhancement*: Hide the connection badge when connection status is `CONNECTED`. Display an amber `Reconnecting...` badge or red `Offline` banner only when connectivity is lost.
2. **Automatic Socket Reconnection & Resubscription**:
   - Ensure the Socket.io client automatically re-authenticates and re-joins active workspace rooms (`workspace:${workspaceId}`) following temporary network disconnects or token refresh cycles.
