# 03 — Complete Endpoint ↔ UI Mapping Matrix

**Author**: Lead Product Architect & Principal Systems Engineer  
**Date**: August 2, 2026  
**Scope**: Full End-to-End Audit of Every Server REST Endpoint and Socket Event  

---

## 1. REST Endpoint ↔ UI Component Audit Matrix

| Endpoint Route | Method | Consumed by Client Service | Target UI Component / Page | Is Discoverable? | Is Intuitive? | Workflow Status & Gaps |
| :--- | :---: | :--- | :--- | :---: | :---: | :--- |
| `/api/v1/auth/register` | `POST` | `authApi.register` | `RegisterForm.tsx` | YES | YES | **Complete** |
| `/api/v1/auth/login` | `POST` | `authApi.login` | `LoginForm.tsx` | YES | YES | **Complete** |
| `/api/v1/auth/refresh` | `POST` | Axios interceptor | System HTTP transport | YES | YES | **Complete** |
| `/api/v1/auth/logout` | `POST` | `authApi.logout` | `UserMenu.tsx` | YES | YES | **Complete** |
| `/api/v1/auth/me` | `GET` | `authApi.me` | `AuthBootstrap.tsx` | YES | YES | **Complete** |
| `/api/v1/users/me` | `PATCH` | `updateProfileApi` | `ProfileSettings.tsx` | YES | YES | **Partial** — Avatar upload endpoint missing on backend. |
| `/api/v1/users/preferences` | `PATCH` | `updatePreferencesApi` | `AccountSettings.tsx`, `NotificationSettings.tsx` | YES | YES | **Complete** |
| `/api/v1/users/password` | `PATCH` | `changePasswordApi` | `SecuritySettings.tsx` | YES | YES | **Complete** |
| `/api/v1/workspaces` | `GET` | `fetchWorkspaces` | `WorkspaceSwitcher.tsx` | YES | YES | **Complete** |
| `/api/v1/workspaces` | `POST` | `createWorkspaceApi` | `CreateWorkspaceModal.tsx` | YES | YES | **Complete** |
| `/api/v1/workspaces/:id` | `GET` | `fetchWorkspaceDetails` | `WorkspaceMembersTab.tsx` | YES | YES | **Complete** |
| `/api/v1/workspaces/:id` | `PATCH` | `updateWorkspaceApi` | `DangerZone.tsx` | YES | YES | **Complete** |
| `/api/v1/workspaces/:id` | `DELETE` | `deleteWorkspaceApi` | `DangerZone.tsx` | YES | YES | **Complete** |
| `/api/v1/workspaces/:id/members` | `GET` | `fetchWorkspaceMembers` | `WorkspaceMembersTab.tsx` | YES | YES | **Complete** |
| `/api/v1/workspaces/:id/members/:userId` | `DELETE` | `removeWorkspaceMemberApi` | `WorkspaceMembersTab.tsx` | YES | YES | **Complete** — Supports member removal & self-leave. |
| `/api/v1/dashboard/overview` | `GET` | `dashboardApi.getOverview` | `DashboardPage.tsx`, `FocusToday.tsx` | YES | YES | **Complete** |
| `/api/v1/projects` | `GET` | `projectsApi.list` | `ProjectsDashboardPage.tsx`, `RecentProjects.tsx` | YES | YES | **Complete** |
| `/api/v1/projects` | `POST` | `projectsApi.create` | `CreateProjectModal.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/options` | `GET` | `projectsApi.getOptions` | Task filter toolbar, Task create form | YES | YES | **Complete** |
| `/api/v1/projects/:id` | `GET` | `projectsApi.getById` | `ProjectDetailPage.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:id/summary` | `GET` | `projectsApi.getSummary` | `ProjectSummaryCard.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:id` | `PATCH` | `projectsApi.update` | `EditProjectDialog.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:id` | `DELETE` | `projectsApi.delete` | `DeleteProjectDialog.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:id/archive` | `POST` | `projectsApi.archive` | `ProjectDetailPage.tsx`, `ProjectCard.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:id/generate-tasks` | `POST` | `aiApi.generateTasks` | `ProjectTaskGenerator.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:id/generate-summary` | `POST` | `aiApi.generateProjectSummary` | `ProjectSummaryCard.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/copilot` | `POST` | `aiApi.queryCopilot` | `ProjectCopilotSheet.tsx` | YES | YES | **Complete** — Unify with Global Copilot in WP-03. |
| `/api/v1/projects/:projectId/plans/active` | `GET` | `aiApi.getActivePlanDraft` | Project Plan Tab | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/plans` | `POST` | `aiApi.generatePlanDraft` | Project Plan Tab | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/plans/:draftId` | `GET` | `aiApi.getPlanDraft` | Project Plan Tab | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/plans/:draftId` | `PATCH` | `aiApi.updatePlanDraft` | Project Plan Tab | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/plans/:draftId` | `DELETE` | `aiApi.discardPlanDraft` | Project Plan Tab | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/plans/:draftId/commit` | `POST` | `aiApi.commitPlanDraft` | Project Plan Tab | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/memories` | `GET` | `projectMemoryApi.list` | `ProjectMemoriesSection.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/memories` | `POST` | `projectMemoryApi.create` | `CreateProjectMemoryDialog.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/memories/:memoryId` | `PATCH` | `projectMemoryApi.update` | `EditProjectMemoryDialog.tsx` | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/memories/:memoryId` | `DELETE` | `projectMemoryApi.delete` | `ProjectMemoriesSection.tsx` | YES | YES | **Complete** |
| `/api/v1/recommendations` | `GET` | `projectRecommendationsApi.listWorkspace` | Dashboard AI Recommendations | YES | YES | **Complete** |
| `/api/v1/projects/:projectId/recommendations` | `GET` | `projectRecommendationsApi.listProject` | `ProjectRecommendationsCard.tsx` | YES | YES | **Complete** |
| `/api/v1/recommendations/:id` | `GET` | `projectRecommendationsApi.getById` | Recommendation popover | YES | YES | **Complete** |
| `/api/v1/recommendations/:id/dismiss` | `PATCH` | `projectRecommendationsApi.dismiss` | Recommendation dismissal button | YES | YES | **Complete** |
| `/api/v1/tasks` | `GET` | `tasksApi.list` | `TasksPage.tsx`, `FocusToday.tsx` | YES | YES | **Complete** — Kanban view missing. |
| `/api/v1/tasks` | `POST` | `tasksApi.create` | `CreateTaskModal.tsx` | YES | YES | **Complete** |
| `/api/v1/tasks/:id` | `GET` | `tasksApi.getById` | `TaskDetailPage.tsx` | YES | YES | **Complete** |
| `/api/v1/tasks/:id` | `PATCH` | `tasksApi.update` | `TaskPropertiesPanel.tsx`, `EditTaskDialog.tsx` | YES | YES | **Complete** |
| `/api/v1/tasks/:id` | `DELETE` | `tasksApi.delete` | `DeleteTaskDialog.tsx` | YES | YES | **Complete** |
| `/api/v1/tasks/:id/notes` | `PATCH` | `tasksApi.updateNotes` | `TaskNotesWorkspacePage.tsx` | YES | YES | **Complete** |
| `/api/v1/tasks/:id/archive` | `POST` | `tasksApi.archive` | `TaskToolbar.tsx` | YES | YES | **Complete** |
| `/api/v1/tasks/:id/generate-labels` | `POST` | `aiApi.generateTaskLabels` | `TaskPropertiesPanel.tsx` | YES | YES | **Complete** |
| `/api/v1/copilot/actions/dry-run` | `POST` | `aiApi.dryRunCopilotAction` | Copilot Action Proposal UI | YES | YES | **Complete** |
| `/api/v1/copilot/actions/confirm` | `POST` | `aiApi.confirmCopilotAction` | Copilot Action Proposal UI | YES | YES | **Complete** |
| `/api/v1/search` | `GET` | `searchApi.search` | `GlobalSearchCommandPalette.tsx` | YES | YES | **Complete** |
| `/api/v1/notifications` | `GET` | `notificationApi.getNotifications` | `NotificationsPage.tsx` | YES | YES | **Complete** |
| `/api/v1/notifications/unread-count` | `GET` | `notificationApi.getUnreadCount` | `DashboardNavbar.tsx` | YES | YES | **Complete** |
| `/api/v1/notifications/:id/read` | `PATCH` | `notificationApi.markAsRead` | `NotificationsPage.tsx` | YES | YES | **Complete** |
| `/api/v1/notifications/read-all` | `PATCH` | `notificationApi.markAllAsRead` | `NotificationsPage.tsx` | YES | YES | **Complete** |
| `/api/v1/activities` | `GET` | `activityApi.getActivities` | `ActivityPage.tsx`, `TaskActivityTimeline.tsx` | YES | YES | **Complete** |

---

## 2. Missing Backend Endpoints Required by Frontend Roadmap

1. `POST /api/v1/workspaces/:workspaceId/invitations` — Send email invitation to new workspace member.
2. `GET /api/v1/invitations/:token` — Validate invitation token details.
3. `POST /api/v1/invitations/:token/accept` — Accept invitation and join workspace.
4. `POST /api/v1/invitations/:token/reject` — Decline invitation.
5. `PATCH /api/v1/workspaces/:workspaceId/members/:userId/role` — Promote or demote workspace member role (`OWNER` / `MEMBER`).
6. `POST /api/v1/workspaces/:workspaceId/transfer-ownership` — Transfer workspace primary ownership to another member.
7. `POST /api/v1/projects/:id/duplicate` — Duplicate project structure and tasks.
8. `PATCH /api/v1/tasks/bulk` — Bulk update task status/priority.
9. `DELETE /api/v1/tasks/bulk` — Bulk delete tasks.
10. `POST /api/v1/users/me/avatar` — Upload custom user avatar image.
