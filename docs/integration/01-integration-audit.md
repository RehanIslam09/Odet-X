# REST API ↔ Frontend Integration Audit Matrix

**Date**: August 1, 2026  
**Status**: Comprehensive Endpoint & UI Integration Mapping  

---

## 1. Executive Summary

This audit catalogs all REST API endpoints defined in `@ai-project-manager/server` against their corresponding client-side consumption in `@ai-project-manager/client`.

---

## 2. Comprehensive Endpoint Audit Matrix

| Endpoint Route | HTTP Method | Server Handler | Target Workspace Scoping | Client Service / Hook | Consuming UI Component / Page | Status & Identified Gaps |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth/register` | `POST` | `register` | N/A | `registerUserApi` / `useRegister` | `RegisterForm.tsx` | **Complete** — Fully integrated. |
| `/api/v1/auth/login` | `POST` | `login` | N/A | `loginUserApi` / `useLogin` | `LoginForm.tsx` | **Complete** — Fully integrated. |
| `/api/v1/auth/logout` | `POST` | `logout` | N/A | `logoutUserApi` / `useLogout` | `UserDropdown.tsx` | **Complete** — Fully integrated. |
| `/api/v1/auth/me` | `GET` | `me` | N/A | `fetchCurrentUserApi` / `useCurrentUser` | `AuthBootstrap.tsx` | **Complete** — Fully integrated. |
| `/api/v1/auth/refresh` | `POST` | `refresh` | N/A | `axios` interceptor | Axios HTTP transport layer | **Complete** — Fully integrated. |
| `/api/v1/workspaces` | `GET` | `listWorkspaces` | User Scoped | `fetchWorkspaces` / `useWorkspaces` | `WorkspaceSwitcher.tsx` | **Complete** — Fully integrated. |
| `/api/v1/workspaces` | `POST` | `createWorkspace` | User Scoped | `createWorkspaceApi` / `useCreateWorkspace` | `CreateWorkspaceModal.tsx` | **Complete** — Fully integrated. |
| `/api/v1/workspaces/:id` | `GET` | `getWorkspace` | Tenant Scoped | `fetchWorkspaceDetails` | Unused in UI settings | **GAP IDENTIFIED**: Workspace Details & Member Management UI missing in Settings. |
| `/api/v1/workspaces/:id` | `PATCH` | `updateWorkspace` | Tenant Scoped | `updateWorkspaceApi` | Unused in UI settings | **GAP IDENTIFIED**: Workspace update settings UI missing. |
| `/api/v1/workspaces/:id` | `DELETE` | `deleteWorkspace` | Tenant Scoped | `deleteWorkspaceApi` | Unused in UI settings | **GAP IDENTIFIED**: Custom workspace deletion UI missing in settings. |
| `/api/v1/workspaces/:id/members` | `GET` | `listMembers` | Tenant Scoped | `fetchWorkspaceMembers` | Unused in UI settings | **GAP IDENTIFIED**: Workspace Member List UI missing. |
| `/api/v1/workspaces/:id/members/:userId` | `DELETE` | `removeMember` | Tenant Scoped | `removeWorkspaceMemberApi` | Unused in UI settings | **GAP IDENTIFIED**: Member removal & self-leave UI missing. |
| `/api/v1/dashboard/overview` | `GET` | `getOverview` | Tenant Scoped | `fetchDashboardOverview` / `useDashboardOverview` | `DashboardPage.tsx`, `FocusToday.tsx`, `ProductivityOverview.tsx` | **Complete** — Integrated. |
| `/api/v1/projects` | `GET` | `list` | Tenant Scoped | `fetchProjects` / `useProjects` | `ProjectsDashboardPage.tsx`, `RecentProjects.tsx` | **Complete** — Integrated. |
| `/api/v1/projects` | `POST` | `create` | Tenant Scoped | `createProjectApi` / `useCreateProject` | `CreateProjectModal.tsx` | **Complete** — Integrated. |
| `/api/v1/projects/options` | `GET` | `getOptions` | Tenant Scoped | `fetchProjectOptions` / `useProjectOptions` | Task Filters, Task Create Form | **Complete** — Integrated. |
| `/api/v1/projects/:id` | `GET` | `getOne` | Tenant Scoped | `fetchProjectById` / `useProject` | `ProjectDetailPage.tsx` | **Complete** — Integrated. |
| `/api/v1/projects/:id` | `PATCH` | `update` | Tenant Scoped | `updateProjectApi` / `useUpdateProject` | `EditProjectDialog.tsx` | **Complete** — Integrated. |
| `/api/v1/projects/:id` | `DELETE` | `remove` | Tenant Scoped | `deleteProjectApi` / `useDeleteProject` | `DeleteProjectDialog.tsx` | **Complete** — Integrated. |
| `/api/v1/projects/:id/archive` | `POST` | `archive` | Tenant Scoped | `archiveProjectApi` / `useArchiveProject` | `ProjectCard.tsx`, `ProjectDetailPage.tsx` | **Complete** — Integrated. |
| `/api/v1/projects/:id/summary` | `GET` | `getSummary` | Tenant Scoped | `fetchProjectSummary` | `ProjectSummaryCard.tsx` | **Complete** — Integrated. |
| `/api/v1/projects/:id/generate-tasks` | `POST` | `generateTasks` | Tenant Scoped | `generateProjectTasks` | `ProjectTaskGenerator.tsx` | **Complete** — Integrated. |
| `/api/v1/projects/:id/generate-summary` | `POST` | `generateSummary` | Tenant Scoped | `generateProjectSummary` | `ProjectSummaryCard.tsx` | **Complete** — Integrated. |
| `/api/v1/projects/:id/copilot` | `POST` | `queryCopilot` | Tenant Scoped | `queryProjectCopilot` / `useProjectCopilot` | `ProjectCopilotSheet.tsx` | **Complete** — Integrated. |
| `/api/v1/tasks` | `GET` | `list` | Tenant Scoped | `fetchTasks` / `useTasks` | `TasksPage.tsx`, `FocusToday.tsx` | **Complete** — Integrated. |
| `/api/v1/tasks` | `POST` | `create` | Tenant Scoped | `createTaskApi` / `useCreateTask` | `CreateTaskModal.tsx` | **Complete** — Integrated. |
| `/api/v1/tasks/:id` | `GET` | `getOne` | Tenant Scoped | `fetchTaskById` / `useTask` | `TaskDetailPage.tsx` | **Complete** — Integrated. |
| `/api/v1/tasks/:id` | `PATCH` | `update` | Tenant Scoped | `updateTaskApi` / `useUpdateTask` | `TaskPropertiesPanel.tsx`, `EditTaskDialog.tsx` | **Complete** — Integrated. |
| `/api/v1/tasks/:id` | `DELETE` | `remove` | Tenant Scoped | `deleteTaskApi` / `useDeleteTask` | `DeleteTaskDialog.tsx` | **Complete** — Integrated. |
| `/api/v1/tasks/:id/notes` | `PATCH` | `updateNotes` | Tenant Scoped | `updateTaskNotesApi` / `useTaskNotesAutosave` | `TaskNotesWorkspacePage.tsx` | **Complete** — Integrated. |
| `/api/v1/tasks/:id/archive` | `POST` | `archive` | Tenant Scoped | `archiveTaskApi` / `useArchiveTask` | `TaskToolbar.tsx` | **Complete** — Integrated. |
| `/api/v1/tasks/:id/generate-labels` | `POST` | `generateLabels` | Tenant Scoped | `generateTaskLabels` | `TaskPropertiesPanel.tsx` | **Complete** — Integrated. |
| `/api/v1/activities` | `GET` | `getActivities` | Tenant Scoped | `fetchActivities` / `useActivities` | `ActivityPage.tsx`, `ActivityTimeline.tsx` | **Complete** — Integrated. |
| `/api/v1/notifications` | `GET` | `getNotificationsHandler` | User Scoped | `fetchNotifications` / `useNotifications` | `NotificationsPage.tsx`, `NotificationPopover.tsx` | **Complete** — Integrated. |
| `/api/v1/notifications/unread-count` | `GET` | `getUnreadCountHandler` | User Scoped | `fetchUnreadCount` / `useUnreadCount` | `NotificationPopover.tsx`, Header Bell | **Complete** — Integrated. |
| `/api/v1/notifications/:id/read` | `PATCH` | `markAsReadHandler` | User Scoped | `markNotificationAsRead` | `NotificationsPage.tsx`, `NotificationPopover.tsx` | **Complete** — Integrated. |
| `/api/v1/notifications/read-all` | `PATCH` | `markAllAsReadHandler` | User Scoped | `markAllNotificationsAsRead` | `NotificationsPage.tsx`, `NotificationPopover.tsx` | **Complete** — Integrated. |
| `/api/v1/recommendations` | `GET` | `listWorkspace` | Tenant Scoped | `fetchWorkspaceRecommendations` | `WorkspaceRecommendationsCard.tsx` | **Complete** — Integrated. |
| `/api/v1/recommendations/:id/dismiss` | `PATCH` | `dismiss` | Tenant Scoped | `dismissRecommendation` | `WorkspaceRecommendationsCard.tsx` | **Complete** — Integrated. |
| `/api/v1/search` | `GET` | `search` | Tenant Scoped | `searchApi` / `useSearch` | `CommandPaletteDialog.tsx`, `GlobalSearchInput.tsx` | **Complete** — Integrated. |
| `/api/v1/users/me` | `PATCH` | `updateProfile` | User Scoped | `updateProfileApi` | `ProfileSettings.tsx` | **Complete** — Integrated. |
| `/api/v1/users/preferences` | `PATCH` | `updatePreferences` | User Scoped | `updatePreferencesApi` | `AppearanceSettings.tsx`, `NotificationSettings.tsx` | **Complete** — Integrated. |
| `/api/v1/users/password` | `PATCH` | `updatePassword` | User Scoped | `updatePasswordApi` | `SecuritySettings.tsx` | **Complete** — Integrated. |
