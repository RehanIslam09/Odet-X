# 12 — Phase 34.5 Work Package Roadmap & Execution Blueprint

**Author**: Technical Program Manager, Principal Systems Architect & Lead Frontend Engineer  
**Date**: August 2, 2026  
**Scope**: Complete Work Package Specifications (WP-01 through WP-08)  

---

## Master Work Package Index

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  WP-01: Workspace Team Collaboration & Invitation Lifecycle                 │
│  WP-02: Task Kanban Board View Implementation                               │
│  WP-03: AI Copilot Unification & Global Command Palette                     │
│  WP-04: Dashboard Command Center Redesign & Feed Aggregation                │
│  WP-05: Workflow Navigation, Dynamic Breadcrumbs & Favorites                │
│  WP-06: Secondary Power-User APIs (Project Cloning & Bulk Operations)       │
│  WP-07: Design System Polish, Quiet Connection Badge & Micro-Animations     │
│  WP-08: Complete User Journey Verification & Production Certification       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Work Package Specifications

### WP-01: Workspace Team Collaboration & Invitation Lifecycle
- **Objective**: Complete the team collaboration lifecycle by implementing backend email invitations, pending invitation tables, token validation, invitation acceptance, and member role promotion/demotion.
- **Files Expected to Change**:
  - Backend: `server/src/models/workspace-invitation.model.ts` [NEW], `server/src/services/workspace-invitation.service.ts` [NEW], `server/src/controllers/workspace-invitation.controller.ts` [NEW], `server/src/routes/workspace.routes.ts`, `server/src/validators/workspace.validator.ts`.
  - Frontend: `client/src/features/workspaces/services/workspaces.api.ts`, `client/src/features/settings/components/WorkspaceMembersTab.tsx`, `client/src/features/auth/pages/AcceptInvitationPage.tsx` [NEW], `client/src/app/router.tsx`.
- **Backend Endpoints Involved**: `POST /workspaces/:id/invitations`, `GET /workspaces/:id/invitations`, `DELETE /workspaces/:id/invitations/:invitationId`, `GET /invitations/:token`, `POST /invitations/:token/accept`, `PATCH /workspaces/:id/members/:userId/role`.
- **UI Components Involved**: `WorkspaceMembersTab.tsx`, `PendingInvitationsTable.tsx` [NEW], `AcceptInvitationPage.tsx` [NEW].
- **Testing Strategy**: Unit tests for invitation token creation/validation, integration tests for role promotion, end-to-end invite acceptance flow.
- **Manual QA Checklist**:
  - [ ] Workspace Owner sends invitation email.
  - [ ] Invitation appears in Pending Invitations table.
  - [ ] Owner can revoke pending invitation.
  - [ ] Recipient opens invitation link (`/invitations/:token`) and accepts.
  - [ ] Recipient is added to workspace with specified role.
  - [ ] Owner can promote member from `MEMBER` to `OWNER` or demote.
- **Completion Gate**: 100% test pass on invitation services and zero mock UI in `WorkspaceMembersTab.tsx`.

---

### WP-02: Task Kanban Board View Implementation
- **Objective**: Build a production-grade Kanban Board view for tasks grouped by status columns, unlocking the disabled toggle button in `TaskViewToggle.tsx`.
- **Files Expected to Change**:
  - Frontend: `client/src/features/tasks/components/TaskBoardView.tsx` [NEW], `client/src/features/tasks/components/TaskBoardColumn.tsx` [NEW], `client/src/features/tasks/components/TaskBoardCard.tsx` [NEW], `client/src/features/tasks/components/TaskViewToggle.tsx`, `client/src/features/tasks/pages/TasksPage.tsx`.
- **Backend Endpoints Involved**: `GET /api/v1/tasks`, `PATCH /api/v1/tasks/:id`.
- **UI Components Involved**: `TaskBoardView.tsx`, `TaskViewToggle.tsx`, `TaskStatusSelect.tsx`, `TaskPriorityBadge.tsx`.
- **Testing Strategy**: Unit tests for board column rendering and task status mutation callbacks.
- **Manual QA Checklist**:
  - [ ] User clicks 'Board View' toggle in `TaskToolbar.tsx`.
  - [ ] Board renders 5 status columns (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`).
  - [ ] User can change task status directly from board cards.
  - [ ] Task mutations update server via `PATCH /tasks/:id` and reflect in real time.
- **Completion Gate**: Zero disabled tooltips on `TaskViewToggle.tsx` and successful task status transitions in board view.

---

### WP-03: AI Copilot Unification & Global Command Palette
- **Objective**: Unify all AI triggers (Dashboard Hero, Quick Actions, Navbar, Command Palette, Project Sheet) into one Global Copilot Modal/Drawer.
- **Files Expected to Change**:
  - Frontend: `client/src/features/ai/components/GlobalCopilotModal.tsx` [NEW], `client/src/features/commands/components/GlobalSearchCommandPalette.tsx`, `client/src/features/dashboard/components/AIDailyBrief.tsx`, `client/src/features/dashboard/components/QuickActions.tsx`, `client/src/components/layout/DashboardNavbar.tsx`, `client/src/components/layout/DashboardLayout.tsx`.
- **Backend Endpoints Involved**: `POST /api/v1/copilot/actions/dry-run`, `POST /api/v1/copilot/actions/confirm`, `POST /api/v1/projects/:projectId/copilot`, `GET /api/v1/search`, `GET /api/v1/recommendations`.
- **UI Components Involved**: `GlobalCopilotModal.tsx`, `GlobalSearchCommandPalette.tsx`, `AIDailyBrief.tsx`, `QuickActions.tsx`.
- **Testing Strategy**: Test Global Copilot open/close triggers, prompt submission, dry-run state diff rendering, and action confirmation.
- **Manual QA Checklist**:
  - [ ] User clicks "Ask AI about your workspace" on dashboard -> Global Copilot opens.
  - [ ] User clicks "Ask AI Copilot" in quick actions -> Global Copilot opens.
  - [ ] User presses `Cmd/Ctrl+K` -> Command Palette opens with AI Copilot search mode.
  - [ ] Natural language action proposals render dry-run diff card with "Confirm & Execute" button.
- **Completion Gate**: All disabled AI flags removed; single unified Copilot experience active.

---

### WP-04: Dashboard Command Center Redesign & Feed Aggregation
- **Objective**: Redesign the main dashboard into a live command center answering key productivity questions with active focus tasks, live activity streams, and AI recommendations.
- **Files Expected to Change**:
  - Frontend: `client/src/features/dashboard/pages/DashboardPage.tsx`, `client/src/features/dashboard/components/DashboardHero.tsx`, `client/src/features/dashboard/components/FocusToday.tsx`, `client/src/features/dashboard/components/RecentProjects.tsx`, `client/src/features/dashboard/components/DashboardSkeleton.tsx`.
- **Backend Endpoints Involved**: `GET /api/v1/dashboard/overview`, `GET /api/v1/recommendations`, `GET /api/v1/activities`, `GET /api/v1/tasks`.
- **UI Components Involved**: `DashboardPage.tsx`, `AIDailyBrief.tsx`, `FocusToday.tsx`, `RecentProjects.tsx`, `ActivityTimeline.tsx`.
- **Testing Strategy**: Dashboard data fetching tests, empty state rendering, realtime event update verification.
- **Manual QA Checklist**:
  - [ ] Dashboard displays personalized greeting, pending task count, and active focus tasks.
  - [ ] Task status changes on focus tasks update server state immediately.
  - [ ] Realtime activity log updates live as actions occur elsewhere in the workspace.
- **Completion Gate**: Clean dashboard layout verified with zero static/mock placeholder cards.

---

### WP-05: Workflow Navigation, Dynamic Breadcrumbs & Favorites
- **Objective**: Introduce dynamic breadcrumb navigation, pinned/favorite items in sidebar, and recently viewed route tracking.
- **Files Expected to Change**:
  - Frontend: `client/src/components/common/Breadcrumbs.tsx` [NEW], `client/src/store/favorites.store.ts` [NEW], `client/src/components/layout/DashboardNavbar.tsx`, `client/src/components/layout/DashboardSidebar.tsx`, `client/src/features/projects/pages/ProjectDetailPage.tsx`, `client/src/features/tasks/pages/TaskDetailPage.tsx`.
- **Backend Endpoints Involved**: N/A (Client navigation state).
- **UI Components Involved**: `Breadcrumbs.tsx`, `DashboardNavbar.tsx`, `DashboardSidebar.tsx`.
- **Testing Strategy**: Unit tests for path-to-breadcrumb parser and localStorage favorites store.
- **Manual QA Checklist**:
  - [ ] Navigating to `/w/:slug/tasks/:id/notes` displays `Workspace > Tasks > [Task Title] > Notes`.
  - [ ] User clicks star icon on project page -> Project appears in Sidebar Pinned section.
  - [ ] User clicks pinned item -> Navigates directly to project.
- **Completion Gate**: Breadcrumbs rendered on all deep routes and persistent favorites functional.

---

### WP-06: Secondary Power-User APIs (Project Cloning & Bulk Operations)
- **Objective**: Add backend service methods and REST endpoints for project cloning (`POST /projects/:id/duplicate`) and bulk task operations (`PATCH /tasks/bulk`, `DELETE /tasks/bulk`). Connect UI triggers.
- **Files Expected to Change**:
  - Backend: `server/src/services/project.service.ts`, `server/src/controllers/project.controller.ts`, `server/src/routes/project.routes.ts`, `server/src/services/task.service.ts`, `server/src/controllers/task.controller.ts`, `server/src/routes/task.routes.ts`.
  - Frontend: `client/src/features/projects/services/projects.api.ts`, `client/src/features/projects/pages/ProjectDetailPage.tsx`, `client/src/features/tasks/services/tasks.api.ts`, `client/src/features/tasks/components/TaskToolbar.tsx`, `client/src/features/tasks/pages/TasksPage.tsx`.
- **Backend Endpoints Involved**: `POST /api/v1/projects/:id/duplicate`, `PATCH /api/v1/tasks/bulk`, `DELETE /api/v1/tasks/bulk`.
- **UI Components Involved**: `ProjectDetailPage.tsx`, `ProjectCard.tsx`, `TaskToolbar.tsx`, `TasksPage.tsx`.
- **Testing Strategy**: Service unit tests for project cloning and bulk task updates.
- **Manual QA Checklist**:
  - [ ] User clicks 'Duplicate Project' -> Project structure and tasks are cloned into new project.
  - [ ] User selects multiple task checkboxes in task list -> Bulk action bar appears.
  - [ ] User performs bulk status change or bulk delete -> Server updates tasks in bulk.
- **Completion Gate**: 100% test pass on project duplication and bulk task updates.

---

### WP-07: Design System Polish, Quiet Connection Badge & Micro-Animations
- **Objective**: Polish styling tokens, reduce visual clutter (hide connection badge when connected), eliminate duplicate avatar displays, and add subtle CSS transitions across all cards and buttons.
- **Files Expected to Change**:
  - Frontend: `client/src/index.css`, `client/src/components/layout/DashboardNavbar.tsx`, `client/src/components/layout/DashboardSidebar.tsx`, `client/src/components/ui/button.tsx`, `client/src/components/ui/card.tsx`.
- **Backend Endpoints Involved**: N/A.
- **UI Components Involved**: `DashboardNavbar.tsx`, `DashboardSidebar.tsx`, UI primitives.
- **Testing Strategy**: Visual regression review, responsive layout verification.
- **Manual QA Checklist**:
  - [ ] Navbar connection badge is hidden when socket status is `CONNECTED`.
  - [ ] Connection badge appears only during network drop (`Reconnecting...` or `Offline`).
  - [ ] All interactive buttons and cards feature smooth hover transitions (`transition-all duration-200`).
- **Completion Gate**: Zero visual clutter and verified design consistency across dark mode.

---

### WP-08: Complete User Journey Verification & Production Certification
- **Objective**: Execute end-to-end manual QA across all user journeys, perform automated test suite runs (typecheck, lint, unit, integration, realtime), and issue Phase 34.5 Final Production Certification.
- **Files Expected to Change**:
  - Documentation: `docs/phases/phase-34.5-product-integration/14-final-completion-checklist.md`.
- **Backend Endpoints Involved**: All 41+ REST endpoints.
- **UI Components Involved**: All frontend pages & components.
- **Testing Strategy**: Full test suite run (`npm test`), TypeScript check (`tsc --noEmit`), ESLint check.
- **Manual QA Checklist**:
  - [ ] User Registration -> Login -> Workspace Creation -> Project Creation -> Task Creation -> Notes Edit -> Realtime Sync -> Notifications -> Settings.
  - [ ] Zero console errors, zero disabled placeholders, zero dead UI.
- **Completion Gate**: 100% test pass and formal sign-off in `14-final-completion-checklist.md`.
