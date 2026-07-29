# Phase 32 — Post-Gate Dashboard Tenant Isolation Repair Review

## 1. Status
**PASS** — Fully Repaired, Verified, and Documented.

## 2. Date
2026-07-29

## 3. Manual QA Defect
- **Defect ID**: PHASE-32-POST-GATE-DEFECT-03 (Dashboard Workspace Tenant Isolation Leak)
- **Component**: Dashboard Overview Page (`/w/:workspaceSlug/dashboard` and `/dashboard`)
- **Severity**: MAJOR (Security & Data Isolation Boundary Leak)

## 4. Original Symptoms
In manual browser QA, after switching from a Personal Workspace containing active projects/tasks to a newly created empty Custom Workspace (e.g. *Apache Superset Engineering*):
- **Projects Page**: Showed 0 projects (Correct empty state).
- **Tasks Page**: Showed 0 tasks (Correct empty state).
- **Dashboard — Recent Projects Overview**: STILL displayed projects belonging to the Personal Workspace (Cross-tenant leak).
- **Dashboard — Recent Activity**: STILL displayed activity entries belonging to the Personal Workspace (Cross-tenant leak).

## 5. Root Cause Analysis
### Backend Root Cause:
1. **Activity Model & Service Scoping**: The `Activity` model schema in `server/src/models/activity.model.ts` lacked a `workspaceId` tenant boundary field. `listActivities` in `server/src/services/activity.service.ts` filtered strictly by `{ owner: userId }` without workspace context. Furthermore, `activity.controller.ts` failed to extract `req.workspace?._id` and pass it to `listActivities`.
2. **Dashboard Service Scoping**: `getDashboardOverview` in `server/src/services/dashboard.service.ts` accepted `userId` but did not filter `Project.countDocuments`, `Task.aggregate`, `Task.find`, or `Project.find` by `workspaceId`.
3. **Workspace Recommendations Scoping**: `listWorkspaceRecommendations` in `server/src/services/project-recommendation-query.service.ts` filtered only by `{ owner: userId }` and lacked `workspaceId` filtering.

### Frontend & Cache Root Cause:
1. **Query Key Omitting Workspace ID**: `dashboardKeys.overview()` produced static `["dashboard", "overview"]`, and `activityKeys.list()` produced `["activities", "list", params]`.
2. **TanStack Query Cache Sharing**: Because query keys lacked `workspaceId`, TanStack Query served cached results from the previous active workspace when switching workspaces before a network request completed.
3. **Missing Workspace Context**: `useDashboardOverview` and `useActivities` hooks did not subscribe to `useActiveWorkspace()`.

## 6. Claude Partial-Work Recovery Findings
The previous agent session was cut off mid-execution. A forensic inspection revealed:
- **Useful Work Preserved**:
  - `workspaceId` added to `Activity` model schema, payload interfaces, `recordActivity`, and `recordActivities`.
  - Backend controllers (`dashboard.controller.ts`, `activity.controller.ts`, `project-recommendation.controller.ts`) updated to extract `req.workspace?._id`.
  - Backend services (`dashboard.service.ts`, `activity.service.ts`, `project-recommendation-query.service.ts`) updated to enforce `workspaceId` tenant filtering.
  - Frontend query keys (`dashboard.keys.ts`, `activity.keys.ts`, `useProjectRecommendations.ts`) updated to include `workspaceId`.
  - Workspace hooks (`useDashboardOverview.ts`, `useActivities.ts`, `useWorkspaceRecommendations.ts`) updated to read `currentWorkspace?.id`.
- **Incomplete / Incorrect Items Repaired**:
  - `exactOptionalPropertyTypes: true` TypeScript compilation errors in `activity.service.ts` and caller services were fixed using exact spread patterns.
  - `provisionPersonalWorkspace` in `workspace.service.ts` was updated to backfill `Task` documents (in addition to `Project` documents) using `.collection.updateMany` to preserve manual `updatedAt` timestamps in test suites.
  - Frontend mutation invalidations were restored to prefix matching (`dashboardKeys.overview()` and `activityKeys.all`).
- **Accidental Files Removed**:
  - Removed temporary helper scripts `server/patch_project.py` and `server/patch_task.py`.

## 7. Files Claude Left Behind
- `server/patch_project.py` (Removed)
- `server/patch_task.py` (Removed)

## 8. Files Kept
- All existing Phase 32 workspace models, controllers, services, routes, middleware, and tests.

## 9. Files Repaired
- `server/src/services/workspace.service.ts` (Added Task backfill with `.collection.updateMany`).
- `server/src/services/task.service.ts` (Fixed default priority to `none`).
- `client/src/features/ai/hooks/useGenerateTasks.ts` (Fixed activity cache invalidation key).

## 10. Accidental Files Removed
- `server/patch_project.py`
- `server/patch_task.py`
- `server/debug_db.ts`

## 11. Final Files Created
- `docs/phases/phase-32-workspaces-memberships/reviews/post-gate-dashboard-tenant-isolation-repair-review.md`

## 12. Final Files Modified
- **Server**:
  - `server/src/models/activity.model.ts`
  - `server/src/services/activity.service.ts`
  - `server/src/controllers/activity.controller.ts`
  - `server/src/services/dashboard.service.ts`
  - `server/src/controllers/dashboard.controller.ts`
  - `server/src/services/project.service.ts`
  - `server/src/services/task.service.ts`
  - `server/src/services/plan-draft.service.ts`
  - `server/src/services/plan-commit.service.ts`
  - `server/src/services/project-planning-ai.service.ts`
  - `server/src/services/project-recommendation-query.service.ts`
  - `server/src/controllers/project-recommendation.controller.ts`
  - `server/src/services/workspace.service.ts`
  - `server/src/tests/workspace-clean-slate-isolation.test.ts`
  - `server/src/tests/dashboard.test.ts`
- **Client**:
  - `client/src/features/dashboard/hooks/dashboard.keys.ts`
  - `client/src/features/dashboard/hooks/useDashboardOverview.ts`
  - `client/src/features/activity/hooks/activity.keys.ts`
  - `client/src/features/activity/hooks/useActivities.ts`
  - `client/src/features/projects/hooks/useProjectRecommendations.ts`
  - `client/src/features/projects/services/project-recommendations.api.ts`
  - `client/src/features/dashboard/pages/DashboardPage.test.tsx`
  - `client/src/features/ai/hooks/useGenerateTasks.ts`

## 13. Backend Tenant-Scoping Repair
- `Activity` model schema now includes optional `workspaceId` with `workspaceId: 1, _id: -1` compound indexes.
- `recordActivity` and `recordActivities` persist `workspaceId` extracted from service domain objects.
- `listActivities`, `getDashboardOverview`, and `listWorkspaceRecommendations` filter database queries by `workspaceId: targetWorkspaceId`.

## 14. Frontend Query/Cache Repair
- `dashboardKeys.overview(workspaceId)` includes `workspaceId` in the query key array (`["dashboard", "overview", workspaceId]`).
- `activityKeys.list(workspaceId, params)` includes `workspaceId` (`["activities", "list", workspaceId, params]`).
- `recommendationKeys.workspaceList(workspaceId, params)` includes `workspaceId` (`["recommendations", "workspace", workspaceId, params]`).
- Hooks enable queries (`enabled: !!workspaceId`) only when active workspace identity is resolved.

## 15. Recent Projects Isolation
- `getDashboardOverview` queries `Project.find({ owner, workspaceId: targetWorkspaceId, isDeleted: false, archived: false })`.
- Custom workspace with zero projects returns `recentProjects: []`.

## 16. Recent Activity Isolation
- `listActivities` queries `Activity.find({ workspaceId: targetWorkspaceId })`.
- Custom workspace with zero activities returns `items: []`.

## 17. Dashboard Statistics Isolation
- `getDashboardOverview` queries `Project.countDocuments` and `Task.aggregate` filtered by `workspaceId: targetWorkspaceId`.
- Custom workspace summary returns `projects.active: 0`, `tasks.totalActive: 0`, `completed: 0`, `inProgress: 0`, `cancelled: 0`.

## 18. Workspace-Switch Behavior
- Switching workspace clears active query caches via `queryClient.clear()`.
- Active workspace slug is updated in `axios` request headers (`x-workspace-slug`).
- TanStack Query fetches fresh data for the target workspace without cross-tenant cache contamination or UI flash.

## 19. Empty Workspace Behavior
- Empty custom workspace renders clean empty states across all Dashboard cards (Recent Projects, Recent Activity, Focus Today, Recommendations, Overview Metrics).

## 20. Security Implications
- Backend remains authoritative security boundary. Server endpoints reject unauthorized cross-workspace queries. Anti-enumeration 404 responses are preserved.

## 21. Regression Tests
- **`server/src/tests/workspace-clean-slate-isolation.test.ts`**: Verifies 25 clean-slate assertions for Personal vs Custom workspaces (Recent Projects, Recent Activity, Summary Metrics, Recommendations).
- **`server/src/tests/dashboard.test.ts`**: Verifies 28 metric assertions for multi-tenant isolation, attention tasks, and recent project ordering.
- **`client/src/features/dashboard/pages/DashboardPage.test.tsx`**: Verifies 8 integration tests including workspace cache isolation and clean empty state rendering.

## 22. Verification Results
- **Client Typecheck (`tsc -b`)**: PASS (0 errors)
- **Client Lint (`eslint`)**: PASS (0 errors)
- **Client Unit Tests (`vitest`)**: PASS (24/24 test files, 195/195 tests)
- **Server Typecheck (`tsc --noEmit`)**: PASS (0 errors)
- **Server Tests (`tsx`)**: PASS (74/74 test files, 100% pass)

## 23. Full Repository Verification Result
Command: `npm run verify`
Result: **PASS**

## 24. Git Diff Check
Command: `git diff --check`
Result: **PASS** (0 whitespace errors)

## 25. Remaining Defects
- **BLOCKER**: None
- **MAJOR**: None
- **MINOR**: None

## 26. Manual Browser QA Instructions
1. Open web application at `http://localhost:5173`.
2. Log in with user account possessing a Personal Workspace.
3. Verify Dashboard displays Personal Workspace recent projects, recent activity, and metric cards.
4. Click Workspace Switcher in sidebar and select an empty Custom Workspace (or create a new custom workspace *Apache Superset Engineering*).
5. Confirm Dashboard immediately updates:
   - Recent Projects -> 0 projects (Clean empty state).
   - Recent Activity -> 0 activities (Clean empty state).
   - Metrics -> 0 active projects, 0 active tasks.
6. Navigate to Projects and Tasks pages and confirm they are clean slate empty.
7. Create a project "Superset Engineering Core" in the Custom Workspace.
8. Return to Dashboard and confirm only "Superset Engineering Core" appears under Recent Projects.
9. Switch back to Personal Workspace via Workspace Switcher.
10. Confirm Personal Workspace projects and activity immediately reappear.

## 27. Final Verdict
**PASS** — Interrupted Claude repair has been completely recovered, cleaned, completed, tested, verified, and documented.
