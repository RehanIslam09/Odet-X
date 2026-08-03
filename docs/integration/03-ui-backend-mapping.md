# 03 — End-to-End UI ↔ Backend Integration Mapping & Disconnect Audit

**Author**: Principal Systems Architect & Staff Software Engineer  
**Date**: August 2, 2026  
**Scope**: Complete Mapping Matrix of User Interactions to REST & Realtime APIs  
**Audit Purpose**: Trace every UI button, input, drawer, and view to its underlying backend contract, highlighting connected workflows, disconnected links, and orphaned API endpoints.

---

## 1. Authentication & Onboarding Workflow Mapping

| User Action / UI Trigger | Consuming Component | Frontend Service / Hook | Target REST API Endpoint | HTTP Method | Realtime Socket Event | Integration Status & Diagnostics |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| Submit Register Form | RegisterForm.tsx | uthApi.register / useRegister | /api/v1/auth/register | POST | None | **Connected** — Seeds default personal workspace & sets HTTP-only cookies. |
| Submit Login Form | LoginForm.tsx | uthApi.login / useLogin | /api/v1/auth/login | POST | None | **Connected** — Authenticates session & initializes AuthBootstrap. |
| Click Logout | UserMenu.tsx | uthApi.logout / useLogout | /api/v1/auth/logout | POST | Disconnects socket | **Connected** — Revokes cookies & clears query cache. |
| App Mount / Route Change | AuthBootstrap.tsx | uthApi.me / useCurrentUser | /api/v1/auth/me | GET | Connects socket | **Connected** — Bootstraps session state and active workspace. |
| Session Expiry (401) | client/src/services/axios.ts | Axios interceptor | /api/v1/auth/refresh | POST | Re-authorizes socket | **Connected** — Transparent token refresh flow. |

---

## 2. Multi-Tenant Workspace & Member Management Mapping

| User Action / UI Trigger | Consuming Component | Frontend Service / Hook | Target REST API Endpoint | HTTP Method | Realtime Socket Event | Integration Status & Diagnostics |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| Select Workspace in Switcher | WorkspaceSwitcher.tsx | useWorkspaces | /api/v1/workspaces | GET | Joins workspace socket room | **Connected** — Triggers route navigation to /w/:workspaceSlug/dashboard. |
| Submit Create Workspace Modal | CreateWorkspaceModal.tsx | createWorkspaceApi / useCreateWorkspace | /api/v1/workspaces | POST | None | **Connected** — Creates custom workspace & navigates to new slug. |
| Open Settings -> Members Tab | WorkspaceMembersTab.tsx | etchWorkspaceMembers / useWorkspaceMembers | /api/v1/workspaces/:id/members | GET | Listens to member.added/member.removed | **Connected** — Displays active workspace member roster with roles. |
| Click 'Remove Member' button | WorkspaceMembersTab.tsx | 
emoveWorkspaceMemberApi / useRemoveWorkspaceMember | /api/v1/workspaces/:id/members/:userId | DELETE | Emits member.removed | **Connected** — Removes member or processes self-leave. |
| Update Workspace Name / Slug | DangerZone.tsx | updateWorkspaceApi / useUpdateWorkspace | /api/v1/workspaces/:id | PATCH | Emits workspace update | **Connected** — Updates workspace name & slug. |
| Delete Custom Workspace | DangerZone.tsx | deleteWorkspaceApi / useDeleteWorkspace | /api/v1/workspaces/:id | DELETE | Evicts active room members | **Connected** — Deletes empty custom workspace. |
| Submit 'Invite Member' Form | WorkspaceMembersTab.tsx | N/A (Missing Hook) | /api/v1/workspaces/:id/invitations | POST | N/A | **DISCONNECTED / BACKEND GAP** — Invitation API endpoint does not exist on server. |
| Change Member Role | WorkspaceMembersTab.tsx | N/A (Missing Hook) | /api/v1/workspaces/:id/members/:userId/role | PATCH | N/A | **DISCONNECTED / BACKEND GAP** — Role promotion/demotion API missing. |

---

## 3. Project Management Workflow Mapping

| User Action / UI Trigger | Consuming Component | Frontend Service / Hook | Target REST API Endpoint | HTTP Method | Realtime Socket Event | Integration Status & Diagnostics |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| View Projects Grid | ProjectsDashboardPage.tsx | projectsApi.list / useProjects | /api/v1/projects | GET | Listens to project.* | **Connected** — Supports search, status/priority filtering, pagination. |
| Submit Create Project Modal | CreateProjectModal.tsx | projectsApi.create / useCreateProject | /api/v1/projects | POST | Emits project.created | **Connected** — Invalidates project queries & redirects. |
| View Project Details | ProjectDetailPage.tsx | projectsApi.getById / useProject | /api/v1/projects/:id | GET | Listens to project.updated | **Connected** — Renders header, status badge, progress bar, and detail tabs. |
| Click 'Archive Project' | ProjectDetailPage.tsx, ProjectCard.tsx | projectsApi.archive / useArchiveProject | /api/v1/projects/:id/archive | POST | Emits project.archived | **Connected** — Toggles archive state. |
| Submit Edit Project Form | EditProjectDialog.tsx | projectsApi.update / useUpdateProject | /api/v1/projects/:id | PATCH | Emits project.updated | **Connected** — Updates project metadata. |
| Confirm Delete Project | DeleteProjectDialog.tsx | projectsApi.delete / useDeleteProject | /api/v1/projects/:id | DELETE | Emits project.deleted | **Connected** — Soft-deletes project & navigates to /projects. |
| Click 'Generate AI Summary' | ProjectSummaryCard.tsx | iApi.generateProjectSummary / useGenerateProjectSummary | /api/v1/projects/:id/generate-summary | POST | None | **Connected** — Invokes AI provider & renders summary card. |
| Submit 'Generate AI Tasks' | ProjectTaskGenerator.tsx | iApi.generateTasks / useGenerateTasks | /api/v1/projects/:id/generate-tasks | POST | Emits 	ask.created | **Connected** — Generates tasks from prompt & inserts into DB. |
| Submit Project Copilot Query | ProjectCopilotSheet.tsx | iApi.queryCopilot / useProjectCopilot | /api/v1/projects/:id/copilot | POST | None | **Connected** — Interactive AI assistant sheet for single project. |
| Click 'Duplicate Project' | N/A (Missing UI Action) | N/A (Missing Hook) | /api/v1/projects/:id/duplicate | POST | N/A | **DISCONNECTED / BACKEND GAP** — Project cloning capability missing. |

---

## 4. Task Management & Notes Workspace Mapping

| User Action / UI Trigger | Consuming Component | Frontend Service / Hook | Target REST API Endpoint | HTTP Method | Realtime Socket Event | Integration Status & Diagnostics |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| View Tasks List | TasksPage.tsx | 	asksApi.list / useTasks | /api/v1/tasks | GET | Listens to 	ask.* | **Connected** — Paginated task table with search, priority, status filters. |
| Submit Create Task Modal | CreateTaskModal.tsx | 	asksApi.create / useCreateTask | /api/v1/tasks | POST | Emits 	ask.created | **Connected** — Creates task and invalidates task & dashboard queries. |
| Toggle Task Status Dropdown | TaskStatusSelect.tsx, TaskPropertiesPanel.tsx | 	asksApi.update / useUpdateTask | /api/v1/tasks/:id | PATCH | Emits 	ask.updated | **Connected** — Inline status updates with optimist UI feedback. |
| Toggle Task Priority Dropdown | TaskPrioritySelect.tsx | 	asksApi.update / useUpdateTask | /api/v1/tasks/:id | PATCH | Emits 	ask.updated | **Connected** — Inline priority updates. |
| Click 'Auto-Generate Labels' | TaskPropertiesPanel.tsx | iApi.generateTaskLabels / useGenerateTaskLabels | /api/v1/tasks/:id/generate-labels | POST | Emits 	ask.updated | **Connected** — AI analyzes task description and assigns labels. |
| Edit Markdown Specification | TaskNotesWorkspacePage.tsx | 	asksApi.updateNotes / useTaskNotesAutosave | /api/v1/tasks/:id/notes | PATCH | Emits 	ask.updated & viewing awareness | **Connected** — Fullscreen markdown workspace with debounced auto-save. |
| Switch to Board View | TaskViewToggle.tsx | N/A | N/A | N/A | N/A | **PLACEHOLDER / FRONTEND GAP** — Button disabled with 'Board view is coming soon' tooltip. |
| Select Multiple Tasks for Bulk Action | TaskToolbar.tsx | N/A | /api/v1/tasks/bulk | PATCH/DELETE | N/A | **DISCONNECTED / BACKEND GAP** — Bulk task operation endpoints missing. |

---

## 5. Global Search, Notifications & Realtime Activity Mapping

| User Action / UI Trigger | Consuming Component | Frontend Service / Hook | Target REST API Endpoint | HTTP Method | Realtime Socket Event | Integration Status & Diagnostics |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| Press Cmd/Ctrl+K or Search Icon | DashboardNavbar.tsx, GlobalSearchCommandPalette.tsx | searchApi.search / useGlobalSearch | /api/v1/search | GET | None | **Connected** — Unified search modal across projects, tasks, members. |
| View Unread Notification Badge | DashboardNavbar.tsx | 
otificationApi.getUnreadCount / useUnreadNotificationCount | /api/v1/notifications/unread-count | GET | Listens to notification push | **Connected** — Live unread counter badge. |
| Open Notifications Page | NotificationsPage.tsx | 
otificationApi.getNotifications / useNotifications | /api/v1/notifications | GET | Realtime notification events | **Connected** — Cursor-paginated notification feed. |
| Click 'Mark All Read' | NotificationsPage.tsx | 
otificationApi.markAllAsRead / useMarkAllNotificationsAsRead | /api/v1/notifications/read-all | PATCH | Resets unread counter | **Connected** — Updates notification statuses in bulk. |
| View Workspace Audit Log | ActivityPage.tsx | ctivityApi.getActivities / useActivities | /api/v1/activities | GET | Listens to ctivity.created | **Connected** — Infinite-scroll workspace activity feed. |
| Open Task Activity Tab | TaskActivityTimeline.tsx | ctivityApi.getActivities | /api/v1/activities?entityType=task&entityId=:id | GET | Realtime event updates | **Connected** — Entity-scoped audit log timeline. |
