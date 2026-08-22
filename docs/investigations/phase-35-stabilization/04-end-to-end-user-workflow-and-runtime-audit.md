# Phase 35.6 — End-to-End User Workflow & Runtime Execution Audit
## Document 04: End-to-End User Workflow & Runtime Execution Audit

**Status**: Forensic Audit — DO NOT MODIFY SOURCE CODE  
**Investigation Phase**: 35.6  
**Date**: 2026-08-05  
**Investigators**: Principal Software Architect / Principal Forensics Investigator / Principal QA Engineer  
**Classification**: Permanent Reference — Append Only  

---

> [!IMPORTANT]
> This document details the complete end-to-end runtime execution paths across all 9 primary user workflows in Workspace Platform V2.
> Do NOT modify source code, tests, or run execution commands during this investigation phase.

---

## 1. Executive Summary

This investigation performs an exhaustive runtime execution audit of all 9 primary user workflows in **Workspace Platform V2**. While Investigations 01, 02, and 03 established the static code architecture and tenant isolation defects, this investigation traces the **dynamic runtime behavior** of the application when a real user performs actions.

### Key Forensic Discoveries

1. **Header Interceptor Starvation Cascade**: Because `setActiveWorkspaceSlug` is never invoked, every API call across Workflows 1, 2, 5, 6, and 8 executes without the `X-Workspace-Slug` header. The server silently falls back to Personal Workspace data for all REST requests.
2. **Notification Action State Immutability**: In Workflow 9, when a user accepts a workspace invitation, `acceptInvitationTokenApi` successfully updates the `WorkspaceMember` collection and sets invitation status to `ACCEPTED`. However, the `Notification` MongoDB document is **never updated or deleted**. Consequently, `NotificationItem` continues to render `Accept` and `Decline` action buttons for expired/accepted tokens. Re-clicking `Accept` triggers a 400 API error.
3. **Ghost Preference Persistence**: In Workflow 8 (Workspace Settings), AI Settings and Accent Colors are stored strictly in local component React state (`useState`). Clicking "Save" triggers a toast notification without issuing any API call or mutating storage. Upon tab navigation or page reload, settings instantly revert to hardcoded defaults.
4. **Asymmetric Ownership Transfer**: In Workflow 7 (Member Management), `transferWorkspaceOwnership` promotes the target member to `OWNER` and updates `Workspace.ownerId`, but **fails to demote the previous owner**. This leaves two active `OWNER` records in `WorkspaceMember`, breaking the single-owner invariant and corrupting permission checks.
5. **Activity Log Type Omission**: In Workflow 6 (Task Creation), backend services record domain events like `workspace.owner_transferred` and `member.role_changed`. However, client-side `activity.utils.ts` lacks case handlers for workspace/member event types, causing all workspace activities to fall through to `default: return "Updated " + activity.entityType` ("Updated workspaceMember").

---

## 2. Comprehensive Workflow Execution Traces

---

### Workflow 1: Application Startup & Session Hydration

```
[UI] Browser opens URL (/w/acme-team/dashboard)
  ↓
[Context] AuthBootstrap mounts -> calls useCurrentUser()
  ↓
[Hook] useCurrentUser checks in-memory accessToken
  ↓
[API] GET /auth/refresh (proactive refresh if no token) -> GET /auth/me
  ↓
[Middleware] authenticate (JWT validation)
  ↓
[Service] auth.service.ts -> getUserById(userId)
  ↓
[Database] User Collection lookup
  ↓
[Context] AuthStore finishBootstrap() -> ProtectedRoute renders WorkspaceProvider
  ↓
[Hook] WorkspaceProvider mounts -> calls useWorkspaces() (GET /workspaces)
  ↓
[Context] WorkspaceContext resolves currentWorkspace from URL slug "acme-team"
  ↓
[MISSING WIRE] setActiveWorkspaceSlug("acme-team") IS NOT CALLED
  ↓
[UI Shell] DashboardLayout mounts -> RealtimeProvider connects socket.io
  ↓
[Page UI] DashboardPage renders -> calls useDashboardOverview()
  ↓
[API] GET /dashboard/overview sent WITHOUT X-Workspace-Slug header
  ↓
[Server Fallback] resolveOptionalWorkspace -> req.workspace = undefined -> returns Personal Workspace stats
  ↓
[UI] Team Dashboard displays Personal Workspace data
```

- **Components Involved**: `AuthBootstrap`, `AppLoader`, `ProtectedRoute`, `WorkspaceProvider`, `DashboardLayout`, `DashboardPage`
- **Hooks Involved**: `useCurrentUser`, `useWorkspaces`, `useActiveWorkspace`, `useDashboardOverview`
- **React Query Keys**: `authKeys.me()`, `workspaceKeys.list()`, `dashboardKeys.overview(workspaceId)`
- **Context Providers**: `AuthStore`, `WorkspaceProvider`, `RealtimeProvider`, `GlobalCopilotProvider`, `BreadcrumbProvider`
- **Socket Events**: `connect`, `workspace:subscribe`
- **Database Collections**: `users`, `workspaces`, `workspaceMembers`
- **Expected Execution**: URL `/w/acme-team/dashboard` resolves `acme-team` workspace, sets HTTP header, fetches `acme-team` dashboard stats, and subscribes socket to `workspace:acme-team`.
- **Current Execution**: URL slug is parsed into React state, but HTTP header is omitted. Server returns Personal Workspace statistics. Socket subscribes to `acme-team` room.
- **Possible Failure Points**:
  1. `setActiveWorkspaceSlug` omitted in `WorkspaceContext` (**HIGH**)
  2. `DefaultWorkspaceRedirect` flicker during `isLoading: true` (**MEDIUM**)
- **Related User Issues**: Issue 01 (Wrong workspace data), Issue 02 (Personal data leakage), Issue 08 (Flicker on refresh).

---

### Workflow 2: Active Workspace Switching

```
[UI] User opens WorkspaceSwitcher popover -> selects "Alpha Team"
  ↓
[Context] switchWorkspace("alpha-team") invoked
  ↓
[Local Storage] localStorage.setItem("ai_pm_active_workspace", "alpha-team")
  ↓
[MISSING WIRE] setActiveWorkspaceSlug("alpha-team") IS NOT CALLED
  ↓
[Cache] queryClient.clear() wipes entire TanStack Query cache
  ↓
[Navigation] navigate("/w/alpha-team/dashboard")
  ↓
[Realtime] useRealtimeSync effect detects workspace ID change
  ↓
[Socket] Emits workspace:unsubscribe (previous) -> workspace:subscribe (alpha-team)
  ↓
[Page Mount] DashboardPage / ProjectsPage mounts -> triggers refetch
  ↓
[API Request] GET /projects sent WITHOUT X-Workspace-Slug header
  ↓
[Server Fallback] resolveOptionalWorkspace falls back to Personal Workspace
  ↓
[UI] Alpha Team view renders Personal Workspace data
```

- **Components Involved**: `WorkspaceSwitcher`, `DashboardSidebar`, `DashboardNavbar`, `DashboardPage`, `ProjectsDashboardPage`
- **Hooks Involved**: `useActiveWorkspace`, `useRealtimeSync`, `useProjects`, `useDashboardOverview`
- **React Query Keys**: `dashboardKeys.overview(...)`, `projectKeys.list(...)`, `activityKeys.list(...)`
- **Context Providers**: `WorkspaceContext`, `RealtimeContext`
- **Socket Events**: `workspace:unsubscribe`, `workspace:subscribe`, `workspace:presence_snapshot`
- **Database Collections**: `workspaces`, `workspaceMembers`, `projects`, `tasks`
- **Expected Execution**: Switching workspace updates `localStorage`, updates Axios header, wipes cache, changes socket room, navigates to `/w/alpha-team/dashboard`, and fetches Alpha Team data.
- **Current Execution**: `localStorage` updates, cache is wiped, socket changes room, navigation occurs, but Axios header is NOT updated. Refetched API calls return Personal Workspace data.
- **Possible Failure Points**:
  1. `setActiveWorkspaceSlug` missing in `switchWorkspace` (**HIGH**)
  2. `projectKeys` & `taskKeys` lack `workspaceId` partitioning (**HIGH**)
  3. Race condition between socket room join and API fetch (**MEDIUM**)
- **Related User Issues**: Issue 01 (Data doesn't change on switch), Issue 03 (Stale project list), Issue 07 (Realtime presence out of sync).

---

### Workflow 3: Custom Workspace Creation

```
[UI] User opens CreateWorkspaceModal -> completes 4-Step Wizard -> clicks "Create Workspace"
  ↓
[Hook] useCreateWorkspace mutation called -> POST /api/v1/workspaces
  ↓
[Middleware] authenticate (JWT validation)
  ↓
[Service] workspace.service.ts -> createCustomWorkspace(userId, input)
  ↓
[Database] 1. Saves Workspace doc -> 2. Saves WorkspaceMember doc (role: OWNER)
  ↓
[API Response] 201 Created { workspace: { id, name, slug, isPersonal: false } }
  ↓
[React Query] onSuccess invalidates workspaceKeys.list()
  ↓
[Context] switchWorkspace(newSlug) invoked
  ↓
[Navigation] navigate("/w/new-slug/dashboard")
  ↓
[Socket] Subscribes to new workspace socket room
  ↓
[UI] User redirected to new Team Workspace
```

- **Components Involved**: `CreateWorkspaceModal`, `WorkspaceSwitcher`, `DashboardLayout`
- **Hooks Involved**: `useCreateWorkspace`, `useActiveWorkspace`, `useWorkspaces`
- **React Query Keys**: `workspaceKeys.list()`
- **Context Providers**: `WorkspaceContext`
- **Socket Events**: `workspace:subscribe`
- **Database Collections**: `workspaces`, `workspaceMembers`
- **Expected Execution**: Creates workspace in DB, invalidates workspace list, switches context, updates header, navigates to `/w/new-slug/dashboard`.
- **Current Execution**: Creates workspace in DB correctly. Navigates to `/w/new-slug/dashboard`, but because `setActiveWorkspaceSlug` is missing, dashboard fetches Personal Workspace data inside the new workspace layout!
- **Possible Failure Points**:
  1. Header missing after workspace creation redirect (**HIGH**)
  2. Slug collision validation failing client-side (**LOW**)
- **Related User Issues**: Issue 01 (New workspace empty/shows personal data), Issue 05 (Workspace creation redirect issue).

---

### Workflow 4: Workspace Invitation Lifecycle

```
[UI] Admin enters email in WorkspaceMembersTab -> clicks "Send Invite"
  ↓
[Hook] useCreateInvitation -> POST /api/v1/workspaces/:workspaceId/invitations
  ↓
[Service] workspace-invitation.service.ts creates WorkspaceInvitation doc + sends email + creates Notification
  ↓
[Database] WorkspaceInvitation (status: PENDING), Notification (type: workspace.invitation, metadata.token)
  ↓
[Recipient UI] Recipient receives Notification in topbar bell dropdown
  ↓
[Recipient Action] Recipient clicks "Accept" in NotificationItem
  ↓
[Hook] useAcceptInvitation -> POST /api/v1/invitations/:token/accept
  ↓
[Service] Validates token -> creates WorkspaceMember (role: MEMBER) -> sets WorkspaceInvitation status = ACCEPTED
  ↓
[BUG LOCATION] Notification document in DB IS NOT UPDATED OR DELETED
  ↓
[React Query] onSuccess invalidates workspaceKeys.list() & ["notifications"]
  ↓
[UI Reload] GET /notifications returns notification doc WITH metadata.token STILL PRESENT
  ↓
[UI Bug] NotificationItem sees token and renders "Accept" / "Decline" buttons again!
```

- **Components Involved**: `WorkspaceMembersTab`, `NotificationItem`, `AcceptInvitationPage`
- **Hooks Involved**: `useCreateInvitation`, `useAcceptInvitation`, `useDeclineInvitation`, `useNotifications`
- **React Query Keys**: `workspaceKeys.invitations(wsId)`, `workspaceKeys.list()`, `notificationKeys.list()`
- **Context Providers**: `WorkspaceContext`, `RealtimeProvider`
- **Socket Events**: `domain:event` (`workspace.invitation_created`, `member.joined`)
- **Database Collections**: `workspaceInvitations`, `workspaceMembers`, `notifications`
- **Expected Execution**: Accepting invitation creates membership, marks notification as resolved/read, removes action buttons, and redirects to workspace.
- **Current Execution**: Accepts invitation correctly in DB, but Notification document is left unchanged. Action buttons remain visible in UI. Re-clicking Accept fails with 400 error.
- **Possible Failure Points**:
  1. Notification DB record not updated on invitation resolution (**HIGH**)
  2. AcceptInvitationPage outside `ProtectedRoute` lacks session context (**MEDIUM**)
- **Related User Issues**: Issue 09 (Invitation buttons persist after accept), Issue 10 (Re-accepting throws 400).

---

### Workflow 5: Project Creation & Association

```
[UI] User on /w/acme-team/projects -> clicks "New Project" -> submits form
  ↓
[Hook] useCreateProject -> POST /api/v1/projects { name: "Team Web App" }
  ↓
[Middleware] resolveOptionalWorkspace inspects request -> X-Workspace-Slug header is MISSING
  ↓
[Middleware Result] req.workspace = undefined
  ↓
[Service] listProjects / createProject receives workspaceId = undefined
  ↓
[Fallback] provisionPersonalWorkspace(userId) returns Personal Workspace ID
  ↓
[Database] Project saved with workspaceId = personalWorkspace._id (NOT acme-team ID!)
  ↓
[React Query] onSuccess invalidates projectKeys.list() (unpartitioned ["projects", "list"])
  ↓
[UI Bug] Project disappears from acme-team project page, appears in Personal Workspace!
```

- **Components Involved**: `ProjectsDashboardPage`, `CreateProjectDialog`, `RecentProjects`
- **Hooks Involved**: `useCreateProject`, `useProjects`
- **React Query Keys**: `projectKeys.list(params)` (unpartitioned)
- **Context Providers**: `WorkspaceContext`
- **Socket Events**: `domain:event` (`project.created`)
- **Database Collections**: `projects`, `workspaces`
- **Expected Execution**: Project created with `workspaceId = acme_team_id`, cached under `acme_team_id`, rendered on Team Projects page.
- **Current Execution**: Project created with `workspaceId = personal_id` because HTTP header was missing. Project vanishes from Team page.
- **Possible Failure Points**:
  1. Missing `X-Workspace-Slug` header during `POST /projects` (**HIGH**)
  2. `projectKeys` omitting `workspaceId` in query key (**HIGH**)
- **Related User Issues**: Issue 13 (Projects created in team WS show up in personal WS), Issue 14 (Created project vanishes from UI).

---

### Workflow 6: Task Creation & Activity Log Formatting

```
[UI] User creates Task -> POST /api/v1/tasks { title: "Fix Auth Bug", projectId }
  ↓
[Service] task.service.ts saves Task doc -> calls recordActivity({ type: "task.created", metadata: { taskTitle } })
  ↓
[Database] Task saved in DB; Activity saved in `activities` collection
  ↓
[Realtime] domainEventBus.publish("task.created") -> socket emits domain:event
  ↓
[Client Event Router] event-router.ts catches event -> calls queryClient.invalidateQueries({ queryKey: taskKeys.all })
  ↓
[UI Feed] ActivityTimeline refetches GET /activities -> passes activity array to ActivityItem
  ↓
[Formatting Bug] getActivityDescription(activity) checks activity.type
  ↓
[Formatter Match Failure] For workspace/member activities (e.g. member.role_changed), activity.utils.ts has NO case statement!
  ↓
[Fallback Output] Falls through to `default: return "Updated " + activity.entityType` -> renders "Updated workspaceMember"
```

- **Components Involved**: `TasksPage`, `CreateTaskDialog`, `ActivityTimeline`, `ActivityList`, `ActivityItem`
- **Hooks Involved**: `useCreateTask`, `useActivities`
- **React Query Keys**: `taskKeys.list()`, `activityKeys.list(wsId)`
- **Context Providers**: `WorkspaceContext`, `RealtimeProvider`
- **Socket Events**: `domain:event` (`task.created`, `activity.created`)
- **Database Collections**: `tasks`, `activities`
- **Expected Execution**: Task created, activity logged, realtime event invalidates task & activity queries, ActivityItem renders formatted description ("Created task Fix Auth Bug").
- **Current Execution**: Task created, but untenanted header issue associates task with Personal Workspace. Activity feed contains raw fallback text ("Updated workspaceMember") for non-task/project events.
- **Possible Failure Points**:
  1. `activity.utils.ts` missing case handlers for workspace and member event types (**MEDIUM**)
  2. Event router invalidating global `taskKeys.all` instead of workspace-partitioned keys (**MEDIUM**)
- **Related User Issues**: Issue 16 (Inconsistent activity feed wording), Issue 17 (Tasks assigned to wrong workspace).

---

### Workflow 7: Member Management & Ownership Transfer

```
[UI] Primary Owner opens WorkspaceMembersTab -> clicks "Transfer Ownership" to Member B
  ↓
[Hook] useTransferWorkspaceOwnership -> POST /api/v1/workspaces/:workspaceId/transfer-ownership
  ↓
[Middleware] requireWorkspaceOwner verifies requestingUserId === workspace.ownerId
  ↓
[Service] transferWorkspaceOwnership in workspace-invitation.service.ts runs:
  1. Workspace.findByIdAndUpdate(wsId, { ownerId: newOwnerUserId })
  2. newOwnerMember.role = "OWNER"; await newOwnerMember.save();
  3. ❌ BUG: PREVIOUS OWNER'S WorkspaceMember RECORD IS NOT DEMOTED TO "ADMIN" OR "MEMBER"!
  ↓
[Database State] Workspace.ownerId = Member B; WorkspaceMember docs = [Member A (OWNER), Member B (OWNER)]
  ↓
[Multiple Owners] Two active OWNER records now exist in WorkspaceMember collection!
  ↓
[Permissions Bug] updateMemberRole checks count of OWNER records -> count is 2 -> allows further invalid demotions!
```

- **Components Involved**: `WorkspaceMembersTab`, `TransferOwnershipModal`
- **Hooks Involved**: `useTransferWorkspaceOwnership`, `useUpdateMemberRole`, `useWorkspaceMembers`
- **React Query Keys**: `workspaceKeys.members(wsId)`, `workspaceKeys.detail(wsId)`
- **Context Providers**: `WorkspaceContext`
- **Socket Events**: `domain:event` (`workspace.ownerTransferred`, `member.updated`)
- **Database Collections**: `workspaces`, `workspaceMembers`
- **Expected Execution**: `Workspace.ownerId` updated, target member role set to `OWNER`, previous owner role demoted to `ADMIN`, single-owner invariant maintained.
- **Current Execution**: Target member promoted to `OWNER`, but previous owner retains `OWNER` role in `WorkspaceMember`. DB enters illegal multi-owner state.
- **Possible Failure Points**:
  1. Missing demotion logic for former owner in `transferWorkspaceOwnership` (**HIGH**)
  2. `updateMemberRole` permissions check corrupted by multi-owner state (**HIGH**)
- **Related User Issues**: Issue 11 (Multiple owners in single workspace), Issue 12 (Former owner retains owner rights).

---

### Workflow 8: Workspace Settings Persistence

```
[UI] User opens /w/acme-team/settings/ai -> changes Model to "Gemini 1.5 Pro" -> toggles Proactive Signal Engine -> clicks "Save AI Settings"
  ↓
[Component State] AISettingsTab.tsx updates local React useState variables
  ↓
[BUG LOCATION] handleSave() ONLY executes: toast.success("AI Settings saved for current workspace.")
  ↓
[NO NETWORK CALL] ZERO API calls issued. ZERO updates sent to backend or localStorage.
  ↓
[Navigation] User clicks "General Settings" tab -> then clicks back to "AI Settings" tab
  ↓
[State Reset] AISettingsTab re-mounts -> useState initializes from hardcoded defaults ("gemini-1.5-flash")
  ↓
[UI Reversion] User settings instantly revert to defaults!
```

- **Components Involved**: `SettingsPage`, `GeneralSettingsTab`, `AISettingsTab`, `RealtimeSettingsTab`, `DangerZoneTab`
- **Hooks Involved**: `useUpdateWorkspace`, `useActiveWorkspace`
- **React Query Keys**: `workspaceKeys.detail(wsId)`
- **Context Providers**: `WorkspaceContext`
- **Socket Events**: None
- **Database Collections**: `workspaces` (lacks `aiSettings` & `accentColor` fields)
- **Expected Execution**: Settings form submits mutation to `PATCH /workspaces/:id`, updates Mongoose document, invalidates query cache, persists settings across reloads.
- **Current Execution**: `AISettingsTab` and accent swatches in `GeneralSettingsTab` update local React state only. Save button displays toast without saving. Reloading resets state.
- **Possible Failure Points**:
  1. `AISettingsTab` lacks API mutation integration (**HIGH**)
  2. MongoDB `Workspace` schema missing `accentColor`, `aiSettings`, and `preferences` fields (**HIGH**)
  3. `GeneralSettingsTab` `updateMutation` omits `accentColor` from payload (**MEDIUM**)
- **Related User Issues**: Issue 18 (AI settings revert on tab switch), Issue 19 (Workspace accent color not saved).

---

### Workflow 9: Notifications & Action Item Cleanup

```
[UI] User receives real-time notification -> opens Notification bell dropdown / NotificationsPage
  ↓
[Hook] useNotifications fetches GET /api/v1/notifications
  ↓
[Component] NotificationItem renders notification item
  ↓
[Condition Check] isWorkspaceInvite === true AND token is string -> renders Accept & Decline buttons
  ↓
[User Action] User clicks "Accept"
  ↓
[Hook] handleAcceptInvite calls useAcceptInvitation mutation (POST /api/v1/invitations/:token/accept)
  ↓
[Server Handling] WorkspaceMember created, WorkspaceInvitation status set to ACCEPTED
  ↓
[BUG LOCATION] Notification document in `notifications` DB collection IS NOT DELETED OR UPDATED
  ↓
[Cache Invalidation] onSuccess invalidates ["notifications"] -> GET /notifications refetched
  ↓
[Re-render] GET /notifications returns notification doc WITH metadata.token STILL PRESENT
  ↓
[UI Bug] NotificationItem sees token and renders "Accept" / "Decline" buttons AGAIN!
  ↓
[Second Click] User clicks Accept again -> POST /invitations/:token/accept -> Server throws 400 "Invitation already accepted"
```

- **Components Involved**: `NotificationItem`, `NotificationsPage`, `DashboardNavbar`
- **Hooks Involved**: `useNotifications`, `useMarkNotificationRead`, `useAcceptInvitation`, `useDeclineInvitation`
- **React Query Keys**: `notificationKeys.list(params)`
- **Context Providers**: `WorkspaceContext`
- **Socket Events**: `domain:event` (`notification.created`)
- **Database Collections**: `notifications`, `workspaceInvitations`, `workspaceMembers`
- **Expected Execution**: Accept invitation -> membership created -> notification record updated to resolved state -> action buttons removed from UI.
- **Current Execution**: Membership created, but notification record remains un-updated with active token. Buttons stay visible. Submitting again fails with 400 error.
- **Possible Failure Points**:
  1. Notification record not mutated/deleted upon invitation accept/decline (**HIGH**)
  2. Frontend `NotificationItem` relying on raw `metadata.token` presence rather than invitation state (**MEDIUM**)
- **Related User Issues**: Issue 09 (Action buttons persist), Issue 10 (Re-accepting invitation throws 400 error).

---

## 3. Cross-Workflow Analysis

### Common Execution Patterns

```
                                  CROSS-WORKFLOW BOTTLENECKS
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│  WorkspaceContext (Involved in Workflows 1, 2, 3, 5, 7, 8)                                 │
│  - Single point of failure for X-Workspace-Slug header propagation                       │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│  Axios Request Interceptor (Involved in Workflows 1, 2, 5, 6, 8)                           │
│  - Starved of activeWorkspaceSlug variable, causing server-side fallback to Personal WS   │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│  resolveOptionalWorkspace Express Middleware (Involved in Workflows 1, 2, 5, 6, 8)         │
│  - Fallback logic silently substitutes Personal Workspace ID without warning              │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│  TanStack Query Key Unpartitioned Factories (Involved in Workflows 2, 5, 6)               │
│  - projectKeys and taskKeys omit workspaceId, causing cross-tenant cache pollution        │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### Key Findings Across Workflows

1. **WorkspaceContext Overloading**: Appears in 6 out of 9 workflows. It is responsible for session state, URL parsing, fallback resolution, storage persistence, and socket room binding. The failure to call `setActiveWorkspaceSlug` inside `WorkspaceContext` degrades Workflows 1, 2, 5, 6, and 8 simultaneously.
2. **Silent Server Fallback**: Present in Workflows 1, 2, 5, and 6. When requests lack headers, the server does not reject the request or return a 400/403. Instead, it silently substitutes the Personal Workspace ID, creating a hidden data corruption failure mode.
3. **Disconnected UI State**: Present in Workflows 8 and 9. UI components render controls (AI settings, color swatches, invitation buttons) that have no backing persistence or DB lifecycle hooks.

---

## 4. Regression Hotspots (Top 10 Runtime Hotspots)

Ranked by total risk and number of affected workflows:

| Rank | Runtime Hotspot | Primary File / Module | Workflows Affected | Risk Level | Primary Failure Mechanism |
|---|---|---|---|---|---|
| **1** | **Axios Workspace Header Interceptor** | `client/src/services/axios.ts` | 1, 2, 5, 6, 8 | **CRITICAL** | `activeWorkspaceSlug` variable remains `null`, stripping headers |
| **2** | **Workspace Context State Machine** | `client/src/features/workspaces/context/WorkspaceContext.tsx` | 1, 2, 3, 5, 7, 8 | **CRITICAL** | `setActiveWorkspaceSlug` calls omitted during refactor |
| **3** | **Server Workspace Middleware** | `server/src/middleware/workspace-auth.middleware.ts` | 1, 2, 5, 6, 8 | **HIGH** | `resolveOptionalWorkspace` falls back to Personal WS silently |
| **4** | **Unpartitioned Project & Task Query Keys** | `client/src/features/projects/hooks/useProjects.ts` & `useTasks.ts` | 2, 5, 6 | **HIGH** | `projectKeys` & `taskKeys` omit `workspaceId` in cache key |
| **5** | **Workspace Ownership Transfer Service** | `server/src/services/workspace-invitation.service.ts` | 7 | **HIGH** | `transferWorkspaceOwnership` omits demoting previous owner |
| **6** | **Invitation Notification Persistence** | `client/src/features/notifications/components/NotificationItem.tsx` | 4, 9 | **HIGH** | Notification DB record not updated after invitation accept |
| **7** | **Dummy Settings Persistence Tabs** | `client/src/features/settings/components/AISettingsTab.tsx` | 8 | **HIGH** | Component uses local `useState` only without API calls |
| **8** | **Search URL Navigation Generator** | `server/src/utils/search-domain.utils.ts` | 1, 2 | **MEDIUM** | Generates un-prefixed `/projects/:id` legacy URLs |
| **9** | **Activity Description Utility Formatter** | `client/src/features/activity/utils/activity.utils.ts` | 6 | **MEDIUM** | Missing case statements for workspace and member events |
| **10** | **Socket Room Reconnection Sync** | `client/src/realtime/useRealtimeSync.ts` | 1, 2 | **MEDIUM** | Refetches active queries without headers on reconnect |

---

## 5. Bug Cluster Analysis

All currently observed bugs clustered into 6 root subsystem groups:

```
                            BUG CLUSTER TAXONOMY
┌────────────────────────────────────────┬────────────────────────────────────────┐
│ CLUSTER A: Header Bridge Disconnection │ CLUSTER B: Cache Partitioning          │
│ • Projects saved in Personal WS        │ • Stale projects on WS switch          │
│ • Dashboard shows Personal metrics     │ • Direct URL navigation cache reuse    │
│ • Tasks created in wrong workspace     │ • Inconsistent event invalidation      │
├────────────────────────────────────────┼────────────────────────────────────────┤
│ CLUSTER C: Settings Dummy Persistence  │ CLUSTER D: Permission Invariants      │
│ • AI settings revert on tab switch     │ • Multiple owners in single workspace  │
│ • Accent color swatch not saved        │ • Demoted owner retains access         │
│ • Workspace preferences lost           │ • AdaptiveRouteGuard type undefined    │
├────────────────────────────────────────┼────────────────────────────────────────┤
│ CLUSTER E: Invitation Lifecycle        │ CLUSTER F: Unprefixed Navigation       │
│ • Invitation buttons persist in bell   │ • Command palette navigates to legacy  │
│ • Re-accepting throws 400 error        │ • Recents sidebar item resets slug     │
│ • Notification DB doc not cleaned up   │ • Global search strips WS prefix       │
└────────────────────────────────────────┴────────────────────────────────────────┘
```

---

## 6. Final Section

### Top 10 Workflows Ranked by Fragility

1. **Workflow 5 (Project Creation)** — Extremely fragile; fails completely due to missing header bridge.
2. **Workflow 2 (Workspace Switching)** — High fragility; cache wiped but API refetches default to Personal WS.
3. **Workflow 8 (Workspace Settings)** — High fragility; AI settings and colors are unpersisted UI illusions.
4. **Workflow 7 (Member Management)** — High fragility; corrupts database single-owner invariant.
5. **Workflow 9 (Notifications)** — Medium-high fragility; invitation action buttons remain active indefinitely.
6. **Workflow 1 (Application Startup)** — Medium fragility; renders Personal data under Team URL on cold start.
7. **Workflow 6 (Task Creation & Activity)** — Medium fragility; activity descriptions fall back to raw strings.
8. **Workflow 4 (Invitation Lifecycle)** — Medium fragility; functional backend but incomplete UI cleanup.
9. **Workflow 3 (Workspace Creation)** — Low-medium fragility; workspace created successfully, but initial redirect suffers from header loss.

---

### Top 10 Runtime Hotspots

1. `client/src/services/axios.ts` (`activeWorkspaceSlug` variable)
2. `client/src/features/workspaces/context/WorkspaceContext.tsx` (`WorkspaceProvider` & `switchWorkspace`)
3. `server/src/middleware/workspace-auth.middleware.ts` (`resolveOptionalWorkspace`)
4. `client/src/features/projects/hooks/useProjects.ts` (`projectKeys`)
5. `server/src/services/workspace-invitation.service.ts` (`transferWorkspaceOwnership`)
6. `client/src/features/notifications/components/NotificationItem.tsx` (`handleAcceptInvite`)
7. `client/src/features/settings/components/AISettingsTab.tsx` (`handleSave`)
8. `server/src/utils/search-domain.utils.ts` (`generateNavigationUrl`)
9. `client/src/features/activity/utils/activity.utils.ts` (`getActivityDescription`)
10. `client/src/realtime/useRealtimeSync.ts` (`useEffect` room sync)

---

### Top 10 Architectural Bottlenecks

1. **Single Global Axios Instance Variable**: Storing `activeWorkspaceSlug` as a single module-level variable breaks when multi-tab or concurrent requests occur.
2. **Overloaded `WorkspaceContext`**: Merges URL parsing, state resolution, storage, and socket management into one provider.
3. **Silent Middleware Fallback**: `resolveOptionalWorkspace` silently defaults to Personal WS instead of throwing or requiring explicit headers for tenant endpoints.
4. **Unpartitioned Query Key Contract**: `projectKeys` and `taskKeys` omit workspace parameters by contract design.
5. **Missing Notification Status Lifecycle**: `Notification` schema lacks `status: "PENDING" | "RESOLVED"` or `actionCompleted: boolean`.
6. **Incomplete Mongoose Workspace Schema**: `Workspace` model missing `accentColor`, `aiSettings`, `preferences`, and `type` fields.
7. **Single-Owner Mutation Defect**: `transferWorkspaceOwnership` performs partial updates without atomic transaction demotions.
8. **Legacy URL Redirection Loop**: `DefaultWorkspaceRedirect` depends on context state that may itself be unhydrated.
9. **Event Router Unpartitioned Invalidation**: Domain event router invalidates global query prefixes (`["tasks"]`).
10. **Unit Test Component Mocking**: Tests mock context providers and API modules, preventing integration header verification.

---

### Top 10 Single-Point Cascade Locations

1. **Omission of `setActiveWorkspaceSlug` in `WorkspaceContext.tsx`**: Cascades to Workflows 1, 2, 5, 6, and 8.
2. **Missing `type` field in Mongoose `Workspace` Schema**: Cascades to `AdaptiveRouteGuard` and settings tab rendering across all workspace views.
3. **Unpartitioned `projectKeys.list()`**: Cascades to project dashboards, task lists, and global search caching.
4. **Missing Demotion in `transferWorkspaceOwnership`**: Cascades to permission checks, role updates, and member management UI.
5. **Immutable `Notification` Metadata**: Cascades to topbar bell, Notifications page, and invitation acceptance endpoints.
6. **Un-prefixed `generateNavigationUrl`**: Cascades to Command Palette, global search, and sidebar recently viewed items.
7. **Dummy `AISettingsTab` State**: Cascades to AI Copilot behavior, proactive intelligence policies, and vector memory retention.
8. **Un-persisted `selectedColor` Swatch**: Cascades to workspace branding, sidebar identity cards, and header badges.
9. **Missing Workspace Event Cases in `activity.utils.ts`**: Cascades to dashboard activity feed, project activity tab, and global activity page.
10. **Silent `provisionPersonalWorkspace` Fallback**: Cascades to server-side data isolation, project creation, and task assignment.

---

### Recommendations for Investigation 05

Priority focus areas for **Investigation 05 — Provider Tree, Routing Architecture & Component Hierarchy Audit**:

1. Perform a full tree audit of `<QueryClientProvider>` -> `<Router>` -> `<AuthBootstrap>` -> `<ProtectedRoute>` -> `<WorkspaceProvider>` -> `<DashboardLayout>` -> `<RealtimeProvider>`.
2. Trace component lifecycle mounting order during cold app start vs workspace switch.
3. Audit `DefaultWorkspaceRedirect` behavior when accessing invalid workspace slugs directly in the browser address bar.

---

*End of Investigation Document 04.*  
*This document is permanent. Do not modify.*  
*Future investigations continue with Document 05.*
