# 05 — Comprehensive Product & Feature Gap Analysis

**Author**: Principal Systems Architect & Staff Software Engineer  
**Date**: August 2, 2026  
**Scope**: In-Depth Functional Audit Across Core Subsystems (Parts 4 – 10)  
**Audit Purpose**: Provide exhaustive technical and product analysis of Workspace Management, AI Copilot, Projects, Tasks, Notifications, Activity Feeds, and Realtime Infrastructure.

---

## Part 4 — Workspace Management Audit

### A. Roster & Invitation Workflows
- **Can users invite members?**: **NO**. The frontend settings page (`WorkspaceMembersTab.tsx`) renders an "Invite Member" input field, but the backend lacks the `POST /workspaces/:id/invitations` endpoint and invitation token validation routes.
- **Can users accept invitations?**: **NO**. The backend lacks token validation (`GET /invitations/:token`) and acceptance endpoints (`POST /invitations/:token/accept`).
- **Can users reject invitations?**: **NO**.
- **Can users view members?**: **YES**. `GET /api/v1/workspaces/:id/members` returns populated member records (user ID, name, username, email, role, joined date), fully rendered in `WorkspaceMembersTab.tsx`.
- **Can users remove members?**: **YES**. Workspace Owners can remove members via `DELETE /api/v1/workspaces/:id/members/:userId`.
- **Can users leave workspace?**: **YES**. Non-owner members can self-leave using `DELETE /api/v1/workspaces/:id/members/:myUserId`. Sole owners are prevented from leaving unless another owner exists.

### B. Ownership & Administration Workflows
- **Can users transfer ownership?**: **NO**. The backend `WorkspaceMember` schema supports `OWNER` and `MEMBER` roles, but lacks a `POST /workspaces/:id/transfer-ownership` service method and API endpoint.
- **Can users promote/demote admins?**: **NO**. No role update endpoint exists (`PATCH /workspaces/:id/members/:userId/role`).
- **Can users rename workspace?**: **YES**. Workspace Owners can update workspace name and URL slug via `PATCH /api/v1/workspaces/:id`.
- **Can users delete workspace?**: **YES**. Custom non-personal empty workspaces can be deleted via `DELETE /api/v1/workspaces/:id` from `DangerZone.tsx`. Personal workspaces are protected from deletion.
- **Can users archive workspace?**: **NO**. No workspace archiving capability exists on server or client.
- **Can users switch workspace?**: **YES**. Multi-tenant workspace switching is fully functional via `WorkspaceSwitcher.tsx`, driving URL slug changes (`/w/:workspaceSlug/*`) and Socket.io room re-subscriptions.

---

## Part 5 — AI Copilot Architecture & UX Audit

### A. Copilot Subsystem Architecture
- **Where Copilot Lives**: Copilot currently resides in two forms:
  1. **Single-Project Drawer**: `ProjectCopilotSheet.tsx` (consuming `POST /projects/:projectId/copilot`).
  2. **Global AI Engine**: Backend services (`ActionExecutor`, `PlanService`, `ProactiveIntelligenceWorker`) and AI routes (`POST /copilot/actions/dry-run`, `POST /copilot/actions/confirm`).
- **How Conversations Work**: `queryProjectCopilot` sends an array of chat messages (`{ role: 'user' | 'assistant', content: string }`) along with the project context to the Gemini/Anthropic provider factory, returning generated responses, inline references, and proposed actions.
- **Why Dashboard Buttons Were Disabled**: The hero button in `AIDailyBrief.tsx` and quick action in `QuickActions.tsx` were disabled during early development because Copilot was initially restricted to project sheets.
- **Target Dashboard UX**:
  - The dashboard "Ask AI about your workspace" and "Ask AI Copilot" buttons should open the unified Command Palette (`Ctrl+K`) in AI Copilot Mode, allowing users to execute natural language queries across the entire active workspace.

---

## Part 6 — Projects Audit

### A. Backend vs Frontend Feature Matrix
| Capability | Backend Support | Frontend UI Support | Gap Status & Remediation |
| :--- | :---: | :---: | :--- |
| Create Project | `POST /projects` | `CreateProjectModal.tsx` | **Complete** |
| List / Filter Projects | `GET /projects` | `ProjectsDashboardPage.tsx` | **Complete** — Search, status, priority filters implemented. |
| View Project Details | `GET /projects/:id` | `ProjectDetailPage.tsx` | **Complete** |
| Edit Project Metadata | `PATCH /projects/:id` | `EditProjectDialog.tsx` | **Complete** |
| Soft-Delete Project | `DELETE /projects/:id` | `DeleteProjectDialog.tsx` | **Complete** |
| Archive / Restore | `POST /projects/:id/archive` | `ProjectDetailPage.tsx`, `ProjectCard.tsx` | **Complete** |
| AI Project Summary | `POST /projects/:id/generate-summary` | `ProjectSummaryCard.tsx` | **Complete** |
| AI Task Generation | `POST /projects/:id/generate-tasks` | `ProjectTaskGenerator.tsx` | **Complete** |
| AI Project Memories | `/projects/:id/memories` | `ProjectMemoriesSection.tsx` | **Complete** |
| AI Proactive Recs | `/projects/:id/recommendations` | `ProjectRecommendationsCard.tsx` | **Complete** |
| Duplicate Project | None | None | **BACKEND & FRONTEND GAP** — Add `POST /projects/:id/duplicate`. |
| Bulk Operations | None | None | **BACKEND & FRONTEND GAP** — Add bulk archive/delete capability. |

---

## Part 7 — Tasks Audit

### A. Backend vs Frontend Feature Matrix
| Capability | Backend Support | Frontend UI Support | Gap Status & Remediation |
| :--- | :---: | :---: | :--- |
| Task List View | `GET /tasks` | `TasksPage.tsx` | **Complete** — Table view with pagination, search, status & priority filters. |
| Task Board View (Kanban) | `GET /tasks`, `PATCH /tasks/:id` | `TaskViewToggle.tsx` (Disabled) | **FRONTEND GAP** — Build drag-and-drop / column Kanban board view. |
| Create Task | `POST /tasks` | `CreateTaskModal.tsx` | **Complete** |
| Edit Task Attributes | `PATCH /tasks/:id` | `TaskPropertiesPanel.tsx`, `EditTaskDialog.tsx` | **Complete** |
| Single Task Detail View | `GET /tasks/:id` | `TaskDetailPage.tsx` | **Complete** |
| Markdown Specification Workspace | `PATCH /tasks/:id/notes` | `TaskNotesWorkspacePage.tsx` | **Complete** — Realtime autosave & live collaborator viewing awareness. |
| AI Task Label Generation | `POST /tasks/:id/generate-labels` | `TaskPropertiesPanel.tsx` | **Complete** |
| Archive Task | `POST /tasks/:id/archive` | `TaskToolbar.tsx` | **Complete** |
| Bulk Task Operations | None | None | **BACKEND & FRONTEND GAP** — Bulk selection & status update missing. |

---

## Part 8 — Notifications Audit

### A. Capabilities & Verification
- **Unread Counter Badge**: **Complete**. `GET /notifications/unread-count` is polled and updated via realtime Socket.io push notifications in `DashboardNavbar.tsx`.
- **Realtime Push**: **Complete**. Socket event relay receives notification envelopes and invalidates notification query caches instantly.
- **Mark Single Read**: **Complete**. `PATCH /notifications/:id/read` marks individual items read upon click.
- **Mark All Read**: **Complete**. `PATCH /notifications/read-all` clears all unread notifications in one click.
- **Entity Navigation**: **Complete**. Clicking a notification inspects `resource.type` and `resource.id`, navigating directly to `/projects/:id` or `/tasks/:id`.
- **Feed Pagination**: **Complete**. `GET /notifications` supports cursor-based pagination for smooth infinite scrolling.

---

## Part 9 — Activities Audit

### A. Capabilities & Verification
- **Audit Feed Generation**: **Complete**. `GET /activities` returns workspace audit trail events (created by domain event bus).
- **Entity Scoping**: **Complete**. Supports filtering by `entityType` (`task`, `project`, `workspaceMember`) and `entityId`.
- **Realtime Activity Streaming**: **Complete**. `activity.created` domain events trigger live feed updates without page refresh.
- **Infinite Scrolling**: **Complete**. Integrated using TanStack Query infinite query in `ActivityPage.tsx`.

---

## Part 10 — Realtime Collaboration & Infrastructure Audit

### A. Capabilities & User Visibility Matrix
| Realtime Capability | Socket Channel / Event | Client Handler / Hook | User-Visible Surface | Status |
| :--- | :--- | :--- | :--- | :---: |
| Active Presence | `workspace:presence` | `usePresenceAwareness` | Sidebar member list online/idle badges | **Complete** |
| Viewing Awareness | `workspace:viewing` | `usePresenceAwareness` | Header avatar pile in `TaskNotesWorkspacePage.tsx` | **Complete** |
| Live Query Sync | `domain:event` | `event-router.ts` | Instant UI refresh on task/project/activity changes | **Complete** |
| Reconnect & Backoff | Socket.io transport | `realtime-client.ts` | Navbar connection badge (`Connected` / `Reconnecting`) | **Complete** |
| Room Scoping | `join:workspace` / `leave:workspace` | `RealtimeProvider.tsx` | Isolates realtime traffic to active workspace | **Complete** |
| Workspace Eviction | `workspace:evicted` | `RealtimeProvider.tsx` | Automatic redirect if user is removed from workspace | **Complete** |
