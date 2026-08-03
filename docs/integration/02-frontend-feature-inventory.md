# 02 — Frontend Feature & UI Component Inventory Audit

**Author**: Principal Systems Architect & Staff Software Engineer  
**Date**: August 2, 2026  
**Scope**: `@ai-project-manager/client` Feature Modules, Pages & Components  
**Audit Purpose**: Complete catalog of all frontend pages, components, dialogs, drawers, menus, toolbars, quick actions, navbar items, settings pages, context menus, floating buttons, and command palette entries.

---

## 1. Feature Page Roster & Integration Matrix

| Page Component | Route Path | Purpose | Query Hook | Mutation Hook | Realtime Subscriptions | Loading State | Error State | Empty State | Status / Identified Gaps |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `LoginPage.tsx` | `/auth/login` | User login form | N/A | `useLogin` | None | Spinner on submit button | Form alert banner | N/A | **Complete** |
| `RegisterPage.tsx` | `/auth/register` | New user registration form | N/A | `useRegister` | None | Spinner on submit button | Form alert banner | N/A | **Complete** |
| `DashboardPage.tsx` | `/w/:workspaceSlug/dashboard` | Main AI & productivity dashboard | `useDashboardOverview`, `useWorkspaceRecommendations` | `useDismissRecommendation` | Workspace domain events, presence | `DashboardSkeleton.tsx` | `ErrorState.tsx` with retry | Custom empty dashboard card | **Complete** — Copilot button wired |
| `ProjectsDashboardPage.tsx` | `/w/:workspaceSlug/projects` | Workspace projects grid/list view | `useProjects` | `useCreateProject`, `useArchiveProject`, `useDeleteProject` | `project.created`, `project.updated`, `project.archived`, `project.deleted` | Project grid skeleton | Inline error state | `ProjectEmptyState.tsx` | **Complete** |
| `ProjectDetailPage.tsx` | `/w/:workspaceSlug/projects/:projectId` | Detailed project view with tabs | `useProject`, `useProjectSummary`, `useProjectRecommendations`, `useProjectMemories`, `usePlanDraft` | `useUpdateProject`, `useDeleteProject`, `useArchiveProject`, `useDismissRecommendation`, `useCreateProjectMemory`, `useGenerateTasks`, `useGenerateProjectSummary` | Project domain events, task domain events | `ProjectDetailSkeleton` | `ErrorState` with back button | `ProjectTasksEmptyState` | **Complete** |
| `TasksPage.tsx` | `/w/:workspaceSlug/tasks` | Task workspace page (list & filters) | `useTasks`, `useProjectOptions` | `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useArchiveTask` | `task.created`, `task.updated`, `task.archived`, `task.deleted` | `TaskSkeleton.tsx` | `TaskNotFoundState.tsx` | `TaskEmptyState.tsx` | **Complete** — List view complete; Board view coming soon |
| `TaskDetailPage.tsx` | `/w/:workspaceSlug/tasks/:taskId` | Single task detail view | `useTask` | `useUpdateTask`, `useDeleteTask`, `useGenerateTaskLabels` | Task domain events, viewing awareness | `TaskDetailSkeleton` | `TaskNotFoundState` | N/A | **Complete** |
| `TaskNotesWorkspacePage.tsx` | `/w/:workspaceSlug/tasks/:taskId/notes` | Markdown specification workspace | `useTask` | `useTaskNotesAutosave` | `task.updated`, viewing awareness | Editor skeleton | Save status error pill | Blank editor fallback | **Complete** — Realtime viewing awareness integrated |
| `ActivityPage.tsx` | `/w/:workspaceSlug/activities` | Audit trail log feed | `useActivities` | None | `activity.created` | `ActivityListSkeleton` | `ActivityErrorState` | `ActivityEmptyState` | **Complete** — Live infinite scroll & realtime updates |
| `NotificationsPage.tsx` | `/w/:workspaceSlug/notifications` | User notification inbox | `useNotifications`, `useUnreadNotificationCount` | `useMarkNotificationAsRead`, `useMarkAllNotificationsAsRead` | Notification realtime event relay | Inbox skeleton | Inline error alert | Notification empty state | **Complete** |
| `SettingsPage.tsx` | `/w/:workspaceSlug/settings/*` | Main settings container layout | N/A | N/A | None | Layout loader | Error boundary | N/A | **Complete** |
| `ProfileSettings.tsx` | `/w/:workspaceSlug/settings/profile` | Edit user profile info | `useCurrentUser` | `useUpdateProfile` | None | Form skeleton | Inline toast error | N/A | **Partial** — Avatar upload button disabled |
| `AccountSettings.tsx` | `/w/:workspaceSlug/settings/account` | Account preferences & theme | `useCurrentUser` | `useUpdatePreferences` | None | Form skeleton | Toast alert | N/A | **Complete** |
| `WorkspaceMembersTab.tsx` | `/w/:workspaceSlug/settings/members` | Workspace member roster | `useWorkspaceMembers`, `useWorkspaceDetails` | `useRemoveWorkspaceMember` | `member.added`, `member.removed` | Member table skeleton | Inline alert | Empty search roster | **Complete** — Inviting members backend API missing |
| `AppearanceSettings.tsx` | `/w/:workspaceSlug/settings/appearance` | Interface appearance settings | `useCurrentUser` | `useUpdatePreferences` | None | Skeleton | Toast alert | N/A | **Partial** — Interface density selector disabled |
| `NotificationSettings.tsx` | `/w/:workspaceSlug/settings/notifications` | Email & push notification toggles | `useCurrentUser` | `useUpdatePreferences` | None | Skeleton | Toast alert | N/A | **Complete** |
| `SecuritySettings.tsx` | `/w/:workspaceSlug/settings/security` | Password change & session security | `useCurrentUser` | `useChangePassword` | None | Skeleton | Inline form error | N/A | **Partial** — 2FA toggle marked as Coming Soon |
| `DangerZone.tsx` | `/w/:workspaceSlug/settings/danger-zone` | Workspace update & deletion | `useWorkspaceDetails` | `useUpdateWorkspace`, `useDeleteWorkspace` | None | Skeleton | Alert dialog error | N/A | **Complete** — Custom workspace deletion connected |

---

## 2. Interactive Component, Dialog & Navigation Inventory

### A. Navigation & Framework Components
- **`DashboardNavbar.tsx`**: Top header navbar containing:
  - Global Search Trigger button (`Ctrl+K` shortcut hint) -> Opens `GlobalSearchCommandPalette.tsx`.
  - Realtime Socket connection indicator badge (`Connected` / `Reconnecting...`).
  - Active viewing awareness avatar pile when inside task notes.
  - Notification Bell Icon with unread badge count (`useUnreadNotificationCount`) -> Navigates to `/notifications`.
  - User Menu Dropdown (`UserMenu.tsx`) -> Profile link, Settings link, Logout action.
- **`DashboardSidebar.tsx`**: Primary left navigation sidebar:
  - Workspace Switcher (`WorkspaceSwitcher.tsx`) -> Workspace list & `CreateWorkspaceModal` trigger.
  - Core Navigation Items (`Dashboard`, `Projects`, `Tasks`, `Activities`, `Notifications`, `Settings`).
  - Active workspace member presence list (`usePresenceAwareness`).
  - Mobile collapse sidebar toggle.
- **`WorkspaceSwitcher.tsx`**: Workspace selection menu:
  - Lists personal and non-personal workspaces.
  - Highlights active workspace based on URL slug (`/w/:workspaceSlug`).
  - Trigger for `CreateWorkspaceModal.tsx`.

### B. Dialogs & Side-Sheets
- **`CreateWorkspaceModal.tsx`**: Modal form for creating a new custom workspace (`POST /workspaces`).
- **`CreateProjectModal.tsx`**: Modal for creating a new project (`POST /projects`).
- **`EditProjectDialog.tsx`**: Modal for updating project title, description, status, priority, and target completion date (`PATCH /projects/:id`).
- **`DeleteProjectDialog.tsx`**: Confirmation modal for soft-deleting a project (`DELETE /projects/:id`).
- **`CreateTaskModal.tsx`**: Modal for creating a new task within workspace or project context (`POST /tasks`).
- **`EditTaskDialog.tsx`**: Modal for updating task attributes (`PATCH /tasks/:id`).
- **`DeleteTaskDialog.tsx`**: Confirmation modal for deleting a task (`DELETE /tasks/:id`).
- **`ProjectCopilotSheet.tsx`**: Right-side drawer for interactive AI Copilot queries on project context (`POST /projects/:projectId/copilot`).
- **`CreateProjectMemoryDialog.tsx`**: Modal for creating project memory entry (`POST /projects/:projectId/memories`).
- **`EditProjectMemoryDialog.tsx`**: Modal for editing existing project memory (`PATCH /projects/:projectId/memories/:memoryId`).
- **`GlobalSearchCommandPalette.tsx`**: Modal overlay (`Cmd/Ctrl+K` or Raycast-style) for global search across projects, tasks, and members (`GET /search`).

### C. Toolbars & Quick Actions
- **`QuickActions.tsx`**: Dashboard quick action buttons:
  - `Create Project` -> Opens `CreateProjectModal`.
  - `Create Task` -> Opens `CreateTaskModal`.
  - `Ask AI Copilot` -> Opens Command Palette or triggers global Copilot.
  - `Workspace Settings` -> Navigates to `/settings`.
- **`AIDailyBrief.tsx`**: Dashboard hero widget:
  - Displays proactive workspace productivity summary.
  - Action button: `Ask AI about your workspace` -> Launches Copilot query mode.
- **`TaskToolbar.tsx`**: Task list view toolbar:
  - Task search input (`TaskSearch.tsx`).
  - Status filter dropdown (`TaskFilters.tsx`).
  - Priority filter dropdown.
  - Project filter dropdown.
  - Sort selection.
  - Task view toggle (`TaskViewToggle.tsx` - List vs Board).
  - Bulk actions / Archive trigger (`useArchiveTask`).
- **`TaskNotesToolbar.tsx`**: Markdown notes workspace header bar:
  - Back to task detail link.
  - Auto-save indicator (`Saved` / `Saving...` / `Error`).
  - Live collaborator presence avatars.

---

## 3. Disconnected & Missing Frontend Interactions Summary

1. **Dashboard Hero AI Button**: Previously disabled with "coming soon" tooltip; now needs clean wiring to trigger AI Copilot or Command Palette query mode.
2. **Task Board View**: The toggle exists in `TaskViewToggle.tsx`, but clicking "Board View" shows a "Board view is coming soon" tooltip. No Kanban view component exists.
3. **Workspace Member Invitation Form**: `WorkspaceMembersTab.tsx` contains an email entry input, but submitting it fails or is mock-disabled because `POST /workspaces/:id/invitations` endpoint does not exist on the server.
4. **User Avatar Upload**: Avatar upload button in `ProfileSettings.tsx` is disabled because the server lacks `POST /users/me/avatar`.
5. **Project Duplication**: No UI action or button exists in `ProjectDetailPage.tsx` or `ProjectCard.tsx` because the server lacks project cloning.
