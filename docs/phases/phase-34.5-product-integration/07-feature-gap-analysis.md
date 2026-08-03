# 07 — Exhaustive Feature & API Integration Gap Analysis

**Author**: Lead Product Architect & Principal Systems Engineer  
**Date**: August 2, 2026  
**Scope**: Complete Functional & API Gap Inventory Across Feature Domains  

---

## 1. Domain-by-Domain Feature Gap Analysis

### Domain 1: Multi-Tenant Workspaces & Member Collaboration
- **Gap 1.1 — Member Invitation API & UI**:
  - *Status*: Backend endpoint `POST /workspaces/:id/invitations` is missing. Frontend `WorkspaceMembersTab.tsx` contains an email invite input field that cannot submit.
  - *Remediation*: Implement `WorkspaceInvitation` schema model, `POST /workspaces/:id/invitations` service & controller, invitation token generator, `GET /invitations/:token`, `POST /invitations/:token/accept`, and wire `WorkspaceMembersTab.tsx` invite form.
- **Gap 1.2 — Member Role Management**:
  - *Status*: Backend supports `OWNER` and `MEMBER` roles, but lacks `PATCH /workspaces/:id/members/:userId/role`.
  - *Remediation*: Implement role promotion/demotion endpoint and wire role selector dropdown in `WorkspaceMembersTab.tsx`.
- **Gap 1.3 — Workspace Ownership Transfer**:
  - *Status*: Backend lacks `POST /workspaces/:id/transfer-ownership`.
  - *Remediation*: Add ownership transfer service method & endpoint for workspace Owners.

### Domain 2: AI Copilot & Command Center Unification
- **Gap 2.1 — Dashboard AI Buttons Unification**:
  - *Status*: `AIDailyBrief.tsx` and `QuickActions.tsx` contain disabled "Ask AI" buttons.
  - *Remediation*: Wire click handlers to open `GlobalCopilotModal.tsx` / `GlobalSearchCommandPalette.tsx` in Copilot mode.
- **Gap 2.2 — Unified Copilot Context Pipeline**:
  - *Status*: Copilot exists in `ProjectCopilotSheet.tsx` for projects and `CopilotActionExecutor` for backend actions, but lacks a single global drawer/modal.
  - *Remediation*: Create `GlobalCopilotModal.tsx` that routes queries to workspace recommendations, project copilot, or action dry-run/confirm based on prompt context.

### Domain 3: Task Management & Kanban Board
- **Gap 3.1 — Kanban Board View**:
  - *Status*: `TaskViewToggle.tsx` contains a disabled button for Board View.
  - *Remediation*: Create `TaskBoardView.tsx` component rendering tasks grouped by status columns (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with drag-and-drop or column select triggers.
- **Gap 3.2 — Bulk Task Operations**:
  - *Status*: Backend lacks `PATCH /tasks/bulk` and `DELETE /tasks/bulk`.
  - *Remediation*: Implement bulk update/delete endpoints and add table multi-select checkboxes in `TasksPage.tsx`.

### Domain 4: Project Management & Power-User Tools
- **Gap 4.1 — Project Duplication**:
  - *Status*: Backend lacks `POST /projects/:id/duplicate`.
  - *Remediation*: Implement project cloning service method & endpoint; add "Duplicate Project" action in `ProjectDetailPage.tsx` and `ProjectCard.tsx`.

### Domain 5: User Settings & Profile
- **Gap 5.1 — User Avatar Upload**:
  - *Status*: Avatar upload button in `ProfileSettings.tsx` is disabled.
  - *Remediation*: Implement `POST /users/me/avatar` endpoint and wire file upload input.
