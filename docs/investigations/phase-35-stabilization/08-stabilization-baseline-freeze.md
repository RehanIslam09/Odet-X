# Phase 35.6 — SWP-00: Stabilization Baseline Freeze & Production Snapshot
## Document 08: Stabilization Baseline Freeze & Production Snapshot

**Status**: Baseline Freeze Established — DO NOT MODIFY SOURCE CODE  
**Phase**: 35.6 (SWP-00: Baseline Freeze)  
**Date**: 2026-08-05  
**Execution Lead**: Principal Software Architect / Lead QA Engineer / Lead Systems Engineer  
**Classification**: Permanent Reference — Frozen Baseline for Phase 35.6 Remediation Work Packages  

---

> [!IMPORTANT]
> This document establishes the official, immutable production baseline snapshot for Phase 35.6 before any source code remediation begins.
> It locks all open bug inventories, subsystem risk ratings, technical debt categorizations, and SWP dependency orders.
> Do NOT modify source code or run execution commands during this baseline freeze.

---

## 1. Executive Summary

### Purpose of the Baseline Freeze
The Phase 35.6 Stabilization Baseline Freeze (**SWP-00**) locks the repository state prior to executing any code modifications. Over the course of seven comprehensive software forensics investigations (Documents 01 through 07), 100% of the root causes, tenant isolation defects, runtime workflow regressions, git refactoring history, and testing boundary gaps were uncovered and documented.

No further architectural investigations are required unless genuinely new runtime evidence is discovered.

### Repository Status
This document establishes **SWP-00 (Complete)**. The active branch (`feat/phase-35-workspace-experience`) is officially frozen for feature development. All subsequent code modifications will occur strictly through dependency-ordered Stabilization Work Packages (**SWP-01** through **SWP-12**).

---

## 2. Repository Snapshot

```
==========================================================================================
                              REPOSITORY SNAPSHOT METRICS
==========================================================================================
Active Git Branch:                feat/phase-35-workspace-experience
Current HEAD Commit:              68b2b6408fae69cf2f6ba5be17a77fa3d273f87f
Last Stable Production Commit:    68b2b64 (Phase 34.5 - Merge PR #38)
Modified Source Files Count:      28 files (1,761 insertions, 729 deletions)
Untracked Files Count:            11 files
Investigation Documents Count:    8 documents (01 through 08)
Current Stabilization Stage:      Stage 0 (Baseline Snapshot Complete)
Repository Freeze Status:         LOCKED FOR STABILIZATION
==========================================================================================
```

### Key Modified Files Summary
* `client/src/app/router.tsx` (214 lines modified)
* `client/src/components/layout/DashboardLayout.tsx` (20 lines modified)
* `client/src/features/dashboard/pages/DashboardPage.tsx` (200 lines modified)
* `client/src/features/settings/pages/SettingsPage.tsx` (112 lines modified)
* `client/src/features/workspaces/components/CreateWorkspaceModal.tsx` (+650 lines added)
* `client/src/features/workspaces/components/WorkspaceSwitcher.tsx` (+526 lines added)
* `client/src/features/workspaces/context/WorkspaceContext.tsx` (201 lines modified)
* `server/src/services/workspace.service.ts` (21 lines modified)

---

## 3. Current Production Status

### 3.1 Known Working Systems
* **User Authentication & Session Restoration**: `AuthBootstrap`, JWT refresh cookies, and `useCurrentUser` operate reliably.
* **Workspace & Membership Database Models**: Mongoose collections for `Workspace`, `WorkspaceMember`, and `WorkspaceInvitation` are properly structured.
* **Realtime Transport Engine**: Socket.io room isolation and presence tracking function correctly when correct room IDs are passed.
* **Global Search Service**: Backend text index searches return scored results across projects, tasks, and members.
* **Proactive Intelligence Signal Engine**: Risk detection algorithms correctly identify stale tasks and project bottlenecks.

### 3.2 Known Broken Systems & Regressions
* **Axios HTTP Header Propagation**: `setActiveWorkspaceSlug` is omitted in `WorkspaceContext.tsx`, starving outgoing REST requests of `X-Workspace-Slug`.
* **Server-Side Tenant Resolution**: `resolveOptionalWorkspace` falls back to `provisionPersonalWorkspace`, causing REST calls to operate on Personal Workspace data.
* **Project & Task Workspace Assignment**: Creating projects/tasks while viewing a Team Workspace saves them into Personal Workspaces.
* **React Query Cache Isolation**: `projectKeys` and `taskKeys` omit `workspaceId`, causing stale cross-tenant data rendering on navigation.
* **Invitation Notification Cleanup**: Accepting invitations creates memberships but leaves `Notification` DB documents untouched, forcing Accept/Decline action buttons to persist indefinitely.
* **Ownership Invariant Enforcement**: `transferWorkspaceOwnership` fails to demote the former owner to `ADMIN`, creating illegal multi-owner states in `WorkspaceMember`.
* **Workspace Settings Persistence**: `AISettingsTab` and accent color swatches rely on component `useState` only, displaying fake success toasts without saving to Mongoose DB.
* **Command Palette Routing**: `global-search.service.ts` generates un-prefixed `/projects/:id` URLs, causing command palette selection to reset active workspace context.
* **Activity Log Event Formatting**: `activity.utils.ts` lacks handlers for workspace and member event types, displaying raw `"Updated workspaceMember"` strings.

---

## 4. Open Bug Inventory

Master table of all 20 confirmed production issues:

| Bug ID | Title | Severity | Root Cause Subsystem | Investigation Ref. | Assigned SWP | Status | Verification Required |
|---|---|---|---|---|---|---|---|
| `BUG-01` | Dashboard shows Personal Workspace data | **CRITICAL** | Disconnected Axios Header | Doc 01, 02 | `SWP-01` | **OPEN** | HTTP Header assertion |
| `BUG-02` | Projects created in Team WS show up in Personal WS | **CRITICAL** | Missing `X-Workspace-Slug` on POST | Doc 02, 04 | `SWP-01`, `05` | **OPEN** | DB `workspaceId` assertion |
| `BUG-03` | Tasks created in Team WS show up in Personal WS | **CRITICAL** | Un-tenanted `POST /tasks` request | Doc 02, 04 | `SWP-01`, `05` | **OPEN** | DB `workspaceId` assertion |
| `BUG-04` | Stale projects rendered when switching workspaces | **HIGH** | Unpartitioned `projectKeys` cache | Doc 02, 05 | `SWP-04` | **OPEN** | React Query cache audit |
| `BUG-05` | Stale tasks rendered when switching workspaces | **HIGH** | Unpartitioned `taskKeys` cache | Doc 02, 05 | `SWP-04` | **OPEN** | React Query cache audit |
| `BUG-06` | Notification Accept/Decline buttons persist after accept | **HIGH** | Immutable `Notification` DB record | Doc 04, 05 | `SWP-08` | **OPEN** | Notification UI re-render |
| `BUG-07` | Re-accepting resolved invitation throws 400 error | **HIGH** | Persisted notification buttons | Doc 04, 05 | `SWP-08` | **OPEN** | API status code audit |
| `BUG-08` | Multiple `OWNER` records exist in single workspace | **HIGH** | Missing demotion in `transferOwnership` | Doc 02, 04 | `SWP-06` | **OPEN** | DB single-owner query |
| `BUG-09` | Former owner retains full owner permissions | **HIGH** | Un-demoted `WorkspaceMember` doc | Doc 02, 04 | `SWP-06` | **OPEN** | Permission Engine check |
| `BUG-10` | AI Settings revert to defaults on tab switch | **HIGH** | Component local `useState` only | Doc 04, 05 | `SWP-07` | **OPEN** | Page reload persistence |
| `BUG-11` | Workspace accent color swatch not saved on reload | **HIGH** | Missing `accentColor` in Mongoose | Doc 04, 05 | `SWP-02`, `07` | **OPEN** | Page reload persistence |
| `BUG-12` | `AdaptiveRouteGuard` fails type check | **HIGH** | Missing `type` property in DB schema | Doc 01, 02 | `SWP-02` | **OPEN** | Route Guard navigation |
| `BUG-13` | Command Palette search click resets workspace slug | **MEDIUM** | Un-prefixed `generateNavigationUrl` | Doc 02, 04 | `SWP-09` | **OPEN** | Command Palette click |
| `BUG-14` | Sidebar recently viewed items mix workspace items | **MEDIUM** | Unscoped `localStorage` keys | Doc 02, 04 | `SWP-09` | **OPEN** | Sidebar Recents audit |
| `BUG-15` | Activity feed renders "Updated workspaceMember" | **MEDIUM** | Missing cases in `activity.utils` | Doc 04, 05 | `SWP-10` | **OPEN** | Activity feed text check |
| `BUG-16` | Direct URL reload flickers on default redirect | **MEDIUM** | Context hydration loading state | Doc 01, 04 | `SWP-03` | **OPEN** | Browser hard refresh |
| `BUG-17` | Realtime socket reconnect refetches without header | **MEDIUM** | Un-tenanted refetch on reconnect | Doc 02, 04 | `SWP-01` | **OPEN** | Network disconnect/reconnect |
| `BUG-18` | Creating workspace redirects to Personal data | **MEDIUM** | Missing header post-creation redirect | Doc 03, 04 | `SWP-01`, `03` | **OPEN** | WS Creation wizard flow |
| `BUG-19` | Event router invalidates global `["tasks"]` key | **MEDIUM** | Global query key invalidation prefix | Doc 02, 05 | `SWP-04` | **OPEN** | Domain event bus audit |
| `BUG-20` | Unit tests pass while HTTP headers fail | **HIGH** | Excessive context & Axios mocking | Doc 05 | `SWP-11` | **OPEN** | Integration Test execution |

---

## 5. SWP Dependency Validation

Validation of execution order to guarantee zero circular dependencies:

```
                    STABILIZATION WORK PACKAGE DEPENDENCY MATRIX
SWP-01 (Axios Header Bridge)
  └── Requires: SWP-00
       ├── Enables: SWP-03, SWP-05, SWP-11
       │
SWP-02 (Mongoose Schemas & Contracts)
  └── Requires: SWP-01
       ├── Enables: SWP-03, SWP-06, SWP-07
       │
SWP-03 (Workspace Context & URL Sync)
  └── Requires: SWP-01, SWP-02
       ├── Enables: SWP-04, SWP-05, SWP-09
       │
SWP-04 (React Query Key Partitioning)
  └── Requires: SWP-03
       ├── Enables: SWP-05, SWP-11
       │
SWP-05 (Server Middleware Enforcement)
  └── Requires: SWP-01, SWP-03, SWP-04
       ├── Enables: SWP-07, SWP-08, SWP-11
       │
SWP-06 (Ownership Transfer Invariant)
  └── Requires: SWP-02
       ├── Enables: SWP-11, SWP-12
       │
SWP-07 (Settings Persistence Wiring)
  └── Requires: SWP-02, SWP-05
       ├── Enables: SWP-11, SWP-12
       │
SWP-08 (Notification Lifecycle Cleanup)
  └── Requires: SWP-05
       ├── Enables: SWP-11, SWP-12
       │
SWP-09 (Search & Command Palette URLs)
  └── Requires: SWP-03
       ├── Enables: SWP-11, SWP-12
       │
SWP-10 (Activity Log Event Formatters)
  └── Requires: SWP-00
       ├── Enables: SWP-11, SWP-12
       │
SWP-11 (Tenant Isolation Integration Suite)
  └── Requires: SWP-01 through SWP-10
       ├── Enables: SWP-12
       │
SWP-12 (Production Sign-Off & Manual QA Gate)
  └── Requires: SWP-11
```

---

## 6. Subsystem Architecture Freeze

The following 14 application subsystems are officially **LOCKED FOR FEATURE MODIFICATION**:

1. **Workspace Context** (`client/src/features/workspaces/context/WorkspaceContext.tsx`)
2. **Router Shell** (`client/src/app/router.tsx`)
3. **Axios Client** (`client/src/services/axios.ts`)
4. **React Query Key Factories** (`useProjects.ts`, `useTasks.ts`, `useWorkspaces.ts`)
5. **Realtime Engine** (`client/src/realtime/*`, `server/src/realtime/*`)
6. **Workspace Member Management** (`WorkspaceMembersTab.tsx`, `workspace-invitation.service.ts`)
7. **Workspace Settings Tabs** (`GeneralSettingsTab.tsx`, `AISettingsTab.tsx`, `RealtimeSettingsTab.tsx`)
8. **Notification Pipeline** (`NotificationItem.tsx`, `notification.service.ts`)
9. **Ownership Transfer** (`workspace-invitation.service.ts`)
10. **Project Domain** (`project.service.ts`, `ProjectsDashboardPage.tsx`)
11. **Task Domain** (`task.service.ts`, `TasksPage.tsx`)
12. **Dashboard Layout & Page** (`DashboardLayout.tsx`, `DashboardPage.tsx`)
13. **Activity Feed** (`ActivityTimeline.tsx`, `activity.utils.ts`)
14. **Global Search** (`global-search.service.ts`, `search-domain.utils.ts`)

### Scope Constraints
* No new feature parameters, UI buttons, or route paths may be added during Phase 35.6.
* Code modifications MUST be strictly confined to the whitelisted files of the active SWP.

---

## 7. Current Technical Debt Snapshot

Categorized audit of existing technical debt across 9 dimensions:

| Debt Category | Description | Severity | Estimated Effort | Recommended SWP |
|---|---|---|---|---|
| **Architecture Debt** | Disconnected Axios header setter variable | **CRITICAL** | 1 Hour | `SWP-01` |
| **Testing Debt** | 0% integration boundary tests; heavy context mocks | **HIGH** | 8 Hours | `SWP-11` |
| **UI Debt** | Dummy settings save buttons displaying unpersisted toasts | **HIGH** | 3 Hours | `SWP-07` |
| **UX Debt** | Persistent Accept/Decline buttons after invite accept | **HIGH** | 2 Hours | `SWP-08` |
| **Database Debt** | Missing `accentColor`, `aiSettings`, `type` in Mongoose | **HIGH** | 2 Hours | `SWP-02` |
| **Security Debt** | Un-demoted former owner producing multi-owner DB state | **HIGH** | 2 Hours | `SWP-06` |
| **Routing Debt** | Un-prefixed search URLs forcing legacy redirectors | **MEDIUM** | 2 Hours | `SWP-09` |
| **Format Debt** | Fallback "Updated workspaceMember" activity strings | **MEDIUM** | 1 Hour | `SWP-10` |
| **DevX Debt** | Automated tests passing while core HTTP headers fail | **HIGH** | 4 Hours | `SWP-11` |

---

## 8. Regression Risk Matrix

Subsystem risk and blast radius assessment:

```
                                  REGRESSION RISK MATRIX
Subsystem               Risk Level    Complexity    Blast Radius    Confidence    Manual QA Needed
--------------------------------------------------------------------------------------------------
Axios Interceptor       CRITICAL      Low           HIGH            High          Mandatory
Workspace Context       CRITICAL      Medium        HIGH            Medium        Mandatory
Middleware Fallback     HIGH          Medium        HIGH            Medium        Mandatory
React Query Keys        HIGH          Medium        HIGH            Medium        Mandatory
Ownership Transfer      HIGH          Low           MEDIUM          High          Mandatory
Settings Persistence    HIGH          Medium        MEDIUM          High          Mandatory
Notification Pipeline   HIGH          Low           MEDIUM          High          Mandatory
Search Navigation       MEDIUM        Low           LOW             High          Mandatory
Activity Log Format     LOW           Low           LOW             High          Mandatory
```

---

## 9. Manual QA Baseline Status

All 20 manual QA testing workflows (`QA-01` through `QA-20`) are currently recorded as **OPEN (UNVERIFIED / FAILING)**:

* `QA-01`: App Startup Cold Hydration — **OPEN**
* `QA-02`: Deep Link Route Navigation — **OPEN**
* `QA-03`: Workspace Switcher State Sync — **OPEN**
* `QA-04`: Rapid Workspace Switcher Toggling — **OPEN**
* `QA-05`: Custom Workspace Creation Wizard — **OPEN**
* `QA-06`: Project Creation Workspace Assignment — **OPEN**
* `QA-07`: Task Creation Workspace Assignment — **OPEN**
* `QA-08`: Workspace Invitation Email Dispatch — **OPEN**
* `QA-09`: Notification Bell Invitation Acceptance — **OPEN**
* `QA-10`: Invitation Token Re-acceptance Protection — **OPEN**
* `QA-11`: Ownership Transfer Single-Owner Invariant — **OPEN**
* `QA-12`: General Settings Workspace Identity — **OPEN**
* `QA-13`: Accent Color Swatch Persistence — **OPEN**
* `QA-14`: AI Settings Tab Preference Persistence — **OPEN**
* `QA-15`: Adaptive Route Guard Workspace Protection — **OPEN**
* `QA-16`: Command Palette Workspace-Prefixed URL Search — **OPEN**
* `QA-17`: Activity Feed Event Description Formatting — **OPEN**
* `QA-18`: Realtime Online Collaborator Presence — **OPEN**
* `QA-19`: Socket Reconnection Header Preservation — **OPEN**
* `QA-20`: Custom Workspace Deletion Protection — **OPEN**

---

## 10. Success Criteria

Phase 35.6 Workspace Platform V2 Stabilization shall be declared **SUCCESSFUL** when and only when:

1. All 12 Stabilization Work Packages (`SWP-01` through `SWP-12`) are completed, verified, and merged.
2. All 20 production bugs (`BUG-01` through `BUG-20`) are closed with zero unresolved regressions.
3. All 20 Manual QA Workflows (`QA-01` through `QA-20`) are executed and marked **PASS**.
4. The Supertest Tenant Isolation Integration Suite (`SWP-11`) passes 100%.
5. Outgoing REST API calls carry `X-Workspace-Slug` headers automatically.
6. Single-owner invariant (`ownerCount === 1`) is strictly enforced in database models.
7. Workspace settings (AI models, accent colors, preferences) persist across reloads.
8. Zero red 4xx/5xx network errors or unhandled console exceptions occur during testing.
9. Final release readiness sign-off is formally granted by the Principal Architecture Lead.

---

## 11. Engineering Rules Going Forward

1. **Rule 1 (Single SWP Scope)**: Execute exactly one SWP at a time. Never overlap code modifications across SWPs.
2. **Rule 2 (No Unrelated Refactoring)**: Refactoring code outside the active SWP whitelist is strictly forbidden ("No while-I'm-here changes").
3. **Rule 3 (Mandatory Verification per SWP)**: Every SWP must pass TypeScript, ESLint, Unit Tests, and Manual QA before merging.
4. **Rule 4 (No Scope Expansion)**: If a new issue is discovered during an SWP, log it as a new bug; do not expand the active SWP scope.
5. **Rule 5 (Baseline Comparative Testing)**: When uncertain about expected behavior, compare against commit `68b2b64` (Phase 34.5).
6. **Rule 6 (Forensic Document Reference)**: All code fixes MUST align with the architectural blueprints in Documents 01-07.
7. **Rule 7 (Continuous Dashboard Updates)**: Update the progress dashboard in Document 07 after completing each SWP.

---

## 12. Stabilization Dashboard (Baseline Snapshot)

```
==========================================================================================
                         PHASE 35.6 STABILIZATION PROGRESS DASHBOARD
==========================================================================================

Overall Progress:  [░░░░░░░░░░░░░░░░░░░░] 0% Complete (0 / 12 SWPs)
Active Stage:      STAGE 0 (Baseline Snapshot Complete)
Next Launch Target:SWP-01 (Tenant Identity Pipeline Repair)

------------------------------------------------------------------------------------------
SWP Execution Tracker:
  [X] SWP-00: Baseline Freeze & Production Snapshot        (Stage 0  - COMPLETED)
  [ ] SWP-01: Tenant Identity Pipeline Repair (Axios)      (Stage 1  - READY FOR LAUNCH)
  [ ] SWP-02: Mongoose Schema & Type Contract Alignment    (Stage 2  - PENDING)
  [ ] SWP-03: Workspace Context & URL Slug Sync            (Stage 3  - PENDING)
  [ ] SWP-04: React Query Key Partitioning                 (Stage 4  - PENDING)
  [ ] SWP-05: Server Middleware Fallback Protection        (Stage 5  - PENDING)
  [ ] SWP-06: Workspace Ownership Transfer Fix             (Stage 6  - PENDING)
  [ ] SWP-07: Workspace Settings Persistence Integration   (Stage 7  - PENDING)
  [ ] SWP-08: Notification Lifecycle & Action Resolution  (Stage 8  - PENDING)
  [ ] SWP-09: Command Palette & Navigation URLs           (Stage 9  - PENDING)
  [ ] SWP-10: Activity Log Description Formatters          (Stage 10 - PENDING)
  [ ] SWP-11: Tenant Isolation Integration Test Suite       (Stage 11 - PENDING)
  [ ] SWP-12: Final Manual QA & Production Release Gate   (Stage 12 - PENDING)

------------------------------------------------------------------------------------------
Production Bug Inventory Status:
  Critical Severity Open: 4 / 4
  High Severity Open:     8 / 8
  Medium Severity Open:   8 / 8
  Total Bugs Resolved:    0 / 20

Manual QA Checklist Progress: 0 / 20 Workflows Verified (0%)
Investigation Documents:      8 / 8 Completed
Repository Frozen:            YES (LOCKED FOR STABILIZATION)
Ready for SWP-01 Execution:   YES
==========================================================================================
```

---

## Final Executive Report & Sign-Off

1. **Baseline Freeze Confirmation**: The repository state on branch `feat/phase-35-workspace-experience` is officially frozen as of Document 08 (**SWP-00 Complete**).
2. **Investigation Phase Conclusion**: All 8 software forensics investigation documents (01 through 08) are complete and permanently archived in `docs/investigations/phase-35-stabilization/`.
3. **Execution Rule**: All future engineering work MUST proceed exclusively through dependency-ordered Stabilization Work Packages (`SWP-01` through `SWP-12`).

---

*End of Document 08.*  
*SWP-00 Baseline Freeze is officially COMPLETE.*  
*The repository is ready to launch **SWP-01 — Tenant Identity Pipeline Repair (Axios Header Bridge & Workspace Identity Synchronization)**.*
