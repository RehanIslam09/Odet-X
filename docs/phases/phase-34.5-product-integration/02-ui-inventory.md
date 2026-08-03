# 02 — Comprehensive Frontend UI Inventory & Interactive Component Audit

**Author**: Staff UX Designer & Principal Frontend Engineer  
**Date**: August 2, 2026  
**Scope**: `@ai-project-manager/client` UI Catalog  

---

## 1. Page Roster

| Page Component | Route Path | Purpose | Key UI Controls | Status |
| :--- | :--- | :--- | :--- | :---: |
| `LoginPage.tsx` | `/auth/login` | Login form | Email input, password input, submit button, register link | **Complete** |
| `RegisterPage.tsx` | `/auth/register` | Registration form | Name, username, email, password inputs, submit button | **Complete** |
| `DashboardPage.tsx` | `/w/:workspaceSlug/dashboard` | Main command center | Hero brief, quick actions, focus tasks, activity feed, recommendations | **Needs AI Wiring & Redesign** |
| `ProjectsDashboardPage.tsx` | `/w/:workspaceSlug/projects` | Workspace projects grid | Search input, filter dropdowns, project cards, create modal trigger | **Complete** |
| `ProjectDetailPage.tsx` | `/w/:workspaceSlug/projects/:projectId` | Detailed project page | Status badge, archive button, edit/delete dialogs, tab navigation | **Complete** |
| `TasksPage.tsx` | `/w/:workspaceSlug/tasks` | Task workspace | Filter bar, task search, view toggle, task table, create modal trigger | **Needs Board View** |
| `TaskDetailPage.tsx` | `/w/:workspaceSlug/tasks/:taskId` | Single task detail | Property editor panel, status/priority select, label generator, notes link | **Complete** |
| `TaskNotesWorkspacePage.tsx` | `/w/:workspaceSlug/tasks/:taskId/notes` | Markdown spec workspace | Editor textarea, live preview, auto-save status pill, collaborator avatars | **Complete** |
| `ActivityPage.tsx` | `/w/:workspaceSlug/activities` | Audit trail feed | Infinite scroll timeline, timestamp badges, entity links | **Complete** |
| `NotificationsPage.tsx` | `/w/:workspaceSlug/notifications` | User notification inbox | Notification list, mark read buttons, mark all read trigger, entity redirect | **Complete** |
| `SettingsPage.tsx` | `/w/:workspaceSlug/settings/*` | Settings layout container | Sidebar navigation tabs | **Complete** |
| `WorkspaceMembersTab.tsx` | `/w/:workspaceSlug/settings/members` | Workspace member roster | Member table, role badge, remove button, invite email form | **Needs Invitation API** |
| `DangerZone.tsx` | `/w/:workspaceSlug/settings/danger-zone` | Workspace settings & deletion | Workspace rename form, URL slug input, delete workspace button | **Complete** |

---

## 2. Dialogs, Side-Sheets & Command Palettes

1. **`CreateWorkspaceModal.tsx`**: Modal for creating new workspace (`POST /workspaces`).
2. **`CreateProjectModal.tsx`**: Modal for creating new project (`POST /projects`).
3. **`EditProjectDialog.tsx`**: Dialog for editing project details (`PATCH /projects/:id`).
4. **`DeleteProjectDialog.tsx`**: Confirmation dialog for deleting project (`DELETE /projects/:id`).
5. **`CreateTaskModal.tsx`**: Modal for creating new task (`POST /tasks`).
6. **`EditTaskDialog.tsx`**: Dialog for editing task attributes (`PATCH /tasks/:id`).
7. **`DeleteTaskDialog.tsx`**: Confirmation dialog for deleting task (`DELETE /tasks/:id`).
8. **`ProjectCopilotSheet.tsx`**: Right-side drawer for project-level Copilot queries (`POST /projects/:projectId/copilot`).
9. **`CreateProjectMemoryDialog.tsx`**: Dialog for creating project memory entry (`POST /projects/:projectId/memories`).
10. **`EditProjectMemoryDialog.tsx`**: Dialog for editing project memory entry (`PATCH /projects/:projectId/memories/:memoryId`).
11. **`GlobalSearchCommandPalette.tsx`**: Command palette overlay (`Cmd/Ctrl+K`) for global entity search (`GET /search`).

---

## 3. Toolbars, Navigation & Framework Components

1. **`DashboardNavbar.tsx`**: Header bar containing global search trigger, connection status badge, task collaborator avatars, notification icon with unread badge, user dropdown menu.
2. **`DashboardSidebar.tsx`**: Left sidebar containing workspace switcher, core navigation links, presence roster, mobile toggle.
3. **`WorkspaceSwitcher.tsx`**: Dropdown listing user workspaces and create workspace modal trigger.
4. **`TaskToolbar.tsx`**: Task view filter toolbar containing task search input, status filter, priority filter, project filter, sort select, view mode toggle.
5. **`TaskNotesToolbar.tsx`**: Top header for task notes workspace with back link, save status indicator, and live viewing presence avatars.
6. **`QuickActions.tsx`**: Dashboard quick action card with create buttons and Copilot trigger.
7. **`AIDailyBrief.tsx`**: Dashboard hero card displaying workspace intelligence summary and AI button.
