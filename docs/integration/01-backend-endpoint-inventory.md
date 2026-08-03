# 01 — Backend REST API Endpoint Inventory & Consumption Audit

**Author**: Principal Systems Architect & Staff Software Engineer  
**Date**: August 2, 2026  
**Scope**: @ai-project-manager/server REST API Surface  
**Audit Purpose**: Complete catalog of all backend endpoints, methods, controllers, services, DTOs, security scoping, and frontend consumption status.

---

## 1. Authentication Module (/api/v1/auth)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/auth/register | POST | 
egister | AuthService.register | Register new user account & seed workspace | Public | N/A | None | RegisterDto | RegisterResponseData | **YES** | uthApi.register -> useRegister -> RegisterForm.tsx |
| /api/v1/auth/login | POST | login | AuthService.login | Authenticate credentials & issue JWT HTTP-only cookies | Public | N/A | None | LoginDto | LoginResponseData | **YES** | uthApi.login -> useLogin -> LoginForm.tsx |
| /api/v1/auth/refresh | POST | 
efresh | AuthService.refresh | Refresh expired access token via HTTP-only refresh cookie | Public (Cookie) | N/A | None | Cookie: 
efreshToken | RefreshResponseData | **YES** | client/src/services/axios.ts interceptor |
| /api/v1/auth/logout | POST | logout | AuthService.logout | Revoke session cookies and active refresh tokens | Authenticated | N/A | None | None | { success: true, message: string } | **YES** | uthApi.logout -> useLogout -> UserMenu.tsx |
| /api/v1/auth/me | GET | me | AuthService.getProfile | Retrieve authenticated user profile and workspace context | Authenticated | N/A | None | None | UserDto | **YES** | uthApi.me -> useCurrentUser -> AuthBootstrap.tsx |

---

## 2. User & Account Settings Module (/api/v1/users)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/users/me | PATCH | updateProfile | UserService.updateProfile | Update current user display name and bio | Authenticated | User | None | UpdateProfileDto | UserDto | **YES** | updateProfileApi -> useUpdateProfile -> ProfileSettings.tsx |
| /api/v1/users/preferences | PATCH | updatePreferences | UserService.updatePreferences | Update user UI preferences (theme, notification toggles) | Authenticated | User | None | UpdatePreferencesDto | UserDto | **YES** | updatePreferencesApi -> useUpdatePreferences -> AccountSettings.tsx, NotificationSettings.tsx |
| /api/v1/users/password | PATCH | updatePassword | UserService.changePassword | Change account password with current password validation | Authenticated | User | None | ChangePasswordDto | { success: true, message: string } | **YES** | changePasswordApi -> useChangePassword -> SecuritySettings.tsx |

---

## 3. Multi-Tenant Workspace Module (/api/v1/workspaces)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/workspaces | GET | listWorkspaces | WorkspaceService.listWorkspacesForUser | List all workspaces user belongs to | Authenticated | User | None | None | WorkspaceDto[] | **YES** | etchWorkspaces -> useWorkspaces -> WorkspaceSwitcher.tsx |
| /api/v1/workspaces | POST | createWorkspace | WorkspaceService.createWorkspace | Create new custom workspace & assign user as OWNER | Authenticated | User | None | CreateWorkspaceDto | WorkspaceDto | **YES** | createWorkspaceApi -> useCreateWorkspace -> CreateWorkspaceModal.tsx |
| /api/v1/workspaces/:workspaceId | GET | getWorkspace | WorkspaceService.getWorkspaceDetails | Fetch workspace details & active member roster | Authenticated | Tenant | Member | None | { workspace: WorkspaceDto, members: WorkspaceMemberDto[] } | **YES** | etchWorkspaceDetails -> useWorkspaceDetails -> WorkspaceMembersTab.tsx |
| /api/v1/workspaces/:workspaceId | PATCH | updateWorkspace | WorkspaceService.updateCustomWorkspace | Update workspace name and URL slug | Authenticated | Tenant | Owner | UpdateWorkspaceDto | WorkspaceDto | **YES** | updateWorkspaceApi -> useUpdateWorkspace -> DangerZone.tsx |
| /api/v1/workspaces/:workspaceId | DELETE | deleteWorkspace | WorkspaceService.deleteCustomWorkspace | Delete empty non-personal workspace | Authenticated | Tenant | Owner | None | { success: true } | **YES** | deleteWorkspaceApi -> useDeleteWorkspace -> DangerZone.tsx |
| /api/v1/workspaces/:workspaceId/members | GET | listMembers | WorkspaceService.listWorkspaceMembers | List active workspace members | Authenticated | Tenant | MEMBER_LIST | None | WorkspaceMemberDto[] | **YES** | etchWorkspaceMembers -> useWorkspaceMembers -> WorkspaceMembersTab.tsx |
| /api/v1/workspaces/:workspaceId/members/:userId | DELETE | 
emoveMember | WorkspaceService.removeWorkspaceMember | Remove workspace member or self-leave workspace | Authenticated | Tenant | MEMBER_REMOVE | None | { success: true } | **YES** | 
emoveWorkspaceMemberApi -> useRemoveWorkspaceMember -> WorkspaceMembersTab.tsx |

---

## 4. Dashboard Module (/api/v1/dashboard)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/dashboard/overview | GET | getOverview | DashboardService.getOverview | Fetch workspace overview metrics, focus tasks & activity preview | Authenticated | Tenant | DASHBOARD_VIEW | None | DashboardOverview | **YES** | dashboardApi.getOverview -> useDashboardOverview -> DashboardPage.tsx, FocusToday.tsx, ProductivityOverview.tsx |

---

## 5. Projects Module (/api/v1/projects)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/projects | GET | list | ProjectService.listProjects | List projects with search, filter, pagination & sort | Authenticated | Tenant | PROJECT_READ | ProjectQueryDto | PaginatedProjects | **YES** | projectsApi.list -> useProjects -> ProjectsDashboardPage.tsx, RecentProjects.tsx |
| /api/v1/projects | POST | create | ProjectService.createProject | Create new project within current workspace | Authenticated | Tenant | PROJECT_CREATE | CreateProjectDto | ProjectDto | **YES** | projectsApi.create -> useCreateProject -> CreateProjectModal.tsx |
| /api/v1/projects/options | GET | getOptions | ProjectService.getOptions | Lightweight project name/ID lookup list | Authenticated | Tenant | PROJECT_READ | None | { items: ProjectOption[] } | **YES** | projectsApi.getOptions -> useProjectOptions -> Task Filters, Task Create Form |
| /api/v1/projects/:id | GET | getOne | ProjectService.getProjectById | Retrieve full project details | Authenticated | Tenant | PROJECT_READ | None | ProjectDto | **YES** | projectsApi.getById -> useProject -> ProjectDetailPage.tsx |
| /api/v1/projects/:id/summary | GET | getSummary | ProjectService.getSummary | Fetch calculated project metrics & AI summary | Authenticated | Tenant | PROJECT_READ | None | ProjectSummaryData | **YES** | projectsApi.getSummary -> useProjectSummary -> ProjectSummaryCard.tsx |
| /api/v1/projects/:id | PATCH | update | ProjectService.updateProject | Update project metadata, status, priority & timeline | Authenticated | Tenant | PROJECT_UPDATE | UpdateProjectDto | ProjectDto | **YES** | projectsApi.update -> useUpdateProject -> EditProjectDialog.tsx |
| /api/v1/projects/:id | DELETE | 
emove | ProjectService.deleteProject | Soft-delete project | Authenticated | Tenant | PROJECT_DELETE | None | { success: true } | **YES** | projectsApi.delete -> useDeleteProject -> DeleteProjectDialog.tsx |
| /api/v1/projects/:id/archive | POST | rchive | ProjectService.toggleArchive | Toggle project archived state | Authenticated | Tenant | PROJECT_ARCHIVE | None | ProjectDto | **YES** | projectsApi.archive -> useArchiveProject -> ProjectDetailPage.tsx, ProjectCard.tsx |
| /api/v1/projects/:id/generate-tasks | POST | generateTasks | AIService.generateTasks | AI-driven task breakdown generator | Authenticated | Tenant | AI_ACTION_EXECUTE | GenerateTasksDto | GeneratedTask[] | **YES** | iApi.generateTasks -> useGenerateTasks -> ProjectTaskGenerator.tsx |
| /api/v1/projects/:id/generate-summary | POST | generateSummary | AIService.generateProjectSummary | AI project executive summary generator | Authenticated | Tenant | AI_ACTION_EXECUTE | None | ProjectSummaryData | **YES** | iApi.generateProjectSummary -> useGenerateProjectSummary -> ProjectSummaryCard.tsx |
| /api/v1/projects/:projectId/copilot | POST | queryCopilot | AIService.queryProjectCopilot | Read-only AI Copilot chat for single project | Authenticated | Tenant | AI_COPILOT_QUERY | CopilotQueryDto | CopilotResultData | **YES** | iApi.queryCopilot -> useProjectCopilot -> ProjectCopilotSheet.tsx |

---

## 6. AI Project Planning Module (/api/v1/projects/:projectId/plans)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/projects/:projectId/plans/active | GET | getActiveDraft | PlanService.getActiveDraft | Fetch current active AI plan draft for project | Authenticated | Tenant | PROJECT_READ | None | PlanDraft \| null | **YES** | iApi.getActivePlanDraft -> usePlanDraft -> Project Plan Tab |
| /api/v1/projects/:projectId/plans | POST | generatePlan | PlanService.generatePlan | Generate new AI plan draft | Authenticated | Tenant | AI_ACTION_EXECUTE | GeneratePlanDto | PlanDraft | **YES** | iApi.generatePlanDraft -> usePlanDraft -> Project Plan Tab |
| /api/v1/projects/:projectId/plans/:draftId | GET | getDraft | PlanService.getDraft | Fetch specific plan draft by ID | Authenticated | Tenant | PROJECT_READ | None | PlanDraft | **YES** | iApi.getPlanDraft -> usePlanDraft |
| /api/v1/projects/:projectId/plans/:draftId | PATCH | updateDraft | PlanService.updateDraft | Edit plan draft tasks & milestones | Authenticated | Tenant | PROJECT_UPDATE | UpdatePlanDto | PlanDraft | **YES** | iApi.updatePlanDraft -> usePlanDraft |
| /api/v1/projects/:projectId/plans/:draftId | DELETE | discardDraft | PlanService.discardDraft | Discard draft plan | Authenticated | Tenant | PROJECT_UPDATE | None | { success: true } | **YES** | iApi.discardPlanDraft -> usePlanDraft |
| /api/v1/projects/:projectId/plans/:draftId/commit | POST | commitDraft | PlanCommitService.commitDraft | Commit draft plan to production tasks/milestones | Authenticated | Tenant | PROJECT_UPDATE | None | CommitPlanResultData | **YES** | iApi.commitPlanDraft -> usePlanDraft |

---

## 7. Project Memory Module (/api/v1/projects/:projectId/memories)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/projects/:projectId/memories | GET | list | ProjectMemoryService.list | List memory records for project context | Authenticated | Tenant | PROJECT_READ | ProjectMemoryQueryDto | ProjectMemory[] | **YES** | projectMemoryApi.list -> useProjectMemories -> ProjectMemoriesSection.tsx |
| /api/v1/projects/:projectId/memories | POST | create | ProjectMemoryService.create | Add key decision/memory to project | Authenticated | Tenant | PROJECT_UPDATE | CreateMemoryDto | ProjectMemory | **YES** | projectMemoryApi.create -> useCreateProjectMemory -> CreateProjectMemoryDialog.tsx |
| /api/v1/projects/:projectId/memories/:memoryId | PATCH | update | ProjectMemoryService.update | Update memory entry | Authenticated | Tenant | PROJECT_UPDATE | UpdateMemoryDto | ProjectMemory | **YES** | projectMemoryApi.update -> useUpdateProjectMemory -> EditProjectMemoryDialog.tsx |
| /api/v1/projects/:projectId/memories/:memoryId | DELETE | 
emove | ProjectMemoryService.remove | Delete memory entry | Authenticated | Tenant | PROJECT_UPDATE | None | { success: true } | **YES** | projectMemoryApi.delete -> useDeleteProjectMemory -> ProjectMemoriesSection.tsx |

---

## 8. AI Proactive Recommendations Module (/api/v1/recommendations, /api/v1/projects/:projectId/recommendations)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/recommendations | GET | listWorkspace | ProjectRecommendationService.listWorkspace | List workspace proactive AI recommendations | Authenticated | Tenant | PROJECT_READ | RecommendationQueryDto | PaginatedRecommendations | **YES** | projectRecommendationsApi.listWorkspace -> useWorkspaceRecommendations -> Dashboard AI Widgets |
| /api/v1/projects/:projectId/recommendations | GET | listProject | ProjectRecommendationService.listProject | List recommendations for specific project | Authenticated | Tenant | PROJECT_READ | RecommendationQueryDto | PaginatedRecommendations | **YES** | projectRecommendationsApi.listProject -> useProjectRecommendations -> ProjectRecommendationsCard.tsx |
| /api/v1/recommendations/:id | GET | getOne | ProjectRecommendationService.getOne | Fetch single recommendation details | Authenticated | Tenant | PROJECT_READ | None | ProjectRecommendation | **YES** | projectRecommendationsApi.getById |
| /api/v1/recommendations/:id/dismiss | PATCH | dismiss | ProjectRecommendationService.dismiss | Dismiss proactive recommendation | Authenticated | Tenant | PROJECT_UPDATE | DismissRecommendationDto | { recommendation: ProjectRecommendation } | **YES** | projectRecommendationsApi.dismiss -> useDismissRecommendation -> ProjectRecommendationsCard.tsx |

---

## 9. Tasks Module (/api/v1/tasks)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/tasks | GET | list | TaskService.listTasks | List tasks with filters, search, sorting & pagination | Authenticated | Tenant | TASK_READ | TaskQueryDto | PaginatedTasks | **YES** | 	asksApi.list -> useTasks -> TasksPage.tsx, FocusToday.tsx |
| /api/v1/tasks | POST | create | TaskService.createTask | Create new task in workspace | Authenticated | Tenant | TASK_CREATE | CreateTaskDto | TaskDto | **YES** | 	asksApi.create -> useCreateTask -> CreateTaskModal.tsx |
| /api/v1/tasks/:id | GET | getOne | TaskService.getTaskById | Get detailed task information | Authenticated | Tenant | TASK_READ | None | TaskDto | **YES** | 	asksApi.getById -> useTask -> TaskDetailPage.tsx |
| /api/v1/tasks/:id | PATCH | update | TaskService.updateTask | Update task fields (status, priority, title, due date) | Authenticated | Tenant | TASK_UPDATE | UpdateTaskDto | TaskDto | **YES** | 	asksApi.update -> useUpdateTask -> TaskPropertiesPanel.tsx, EditTaskDialog.tsx |
| /api/v1/tasks/:id | DELETE | 
emove | TaskService.deleteTask | Soft-delete task | Authenticated | Tenant | TASK_DELETE | None | { success: true } | **YES** | 	asksApi.delete -> useDeleteTask -> DeleteTaskDialog.tsx |
| /api/v1/tasks/:id/notes | PATCH | updateNotes | TaskService.updateTaskNotes | Save markdown notes document | Authenticated | Tenant | TASK_UPDATE | UpdateTaskNotesDto | TaskDto | **YES** | 	asksApi.updateNotes -> useTaskNotesAutosave -> TaskNotesWorkspacePage.tsx |
| /api/v1/tasks/:id/archive | POST | rchive | TaskService.toggleArchive | Toggle task archive state | Authenticated | Tenant | TASK_UPDATE | None | TaskDto | **YES** | 	asksApi.archive -> useArchiveTask -> TaskToolbar.tsx |
| /api/v1/tasks/:id/generate-labels | POST | generateLabels | AIService.generateTaskLabels | AI automatic task label generator | Authenticated | Tenant | AI_ACTION_EXECUTE | None | GeneratedLabelsData | **YES** | iApi.generateTaskLabels -> useGenerateTaskLabels -> TaskPropertiesPanel.tsx |

---

## 10. Copilot Action Execution Module (/api/v1/copilot/actions)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/copilot/actions/dry-run | POST | dryRunAction | ActionExecutor.dryRun | Compute state diff for proposed AI action | Authenticated | Tenant | AI_COPILOT_QUERY | DryRunActionDto | ActionDryRunResultData | **YES** | iApi.dryRunCopilotAction -> useCopilotAction -> Copilot Proposal UI |
| /api/v1/copilot/actions/confirm | POST | confirmAction | ActionExecutor.confirm | Execute proposed AI state mutation | Authenticated | Tenant | AI_ACTION_EXECUTE | ConfirmActionDto | ActionConfirmResultData | **YES** | iApi.confirmCopilotAction -> useCopilotAction -> Copilot Proposal UI |

---

## 11. Global Search Module (/api/v1/search)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/search | GET | search | SearchService.executeSearch | Unified search across projects, tasks, members | Authenticated | Tenant | SEARCH_EXECUTE | SearchQueryDto | GlobalSearchResponseData | **YES** | searchApi.search -> useGlobalSearch -> GlobalSearchCommandPalette.tsx |

---

## 12. Notifications Module (/api/v1/notifications)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/notifications | GET | getNotificationsHandler | NotificationService.getNotifications | Fetch user notification feed with cursor pagination | Authenticated | User | None | NotificationQueryDto | CursorPaginatedNotifications | **YES** | 
otificationApi.getNotifications -> useNotifications -> NotificationsPage.tsx |
| /api/v1/notifications/unread-count | GET | getUnreadCountHandler | NotificationService.getUnreadCount | Get count of unread notifications | Authenticated | User | None | None | { count: number } | **YES** | 
otificationApi.getUnreadCount -> useUnreadNotificationCount -> DashboardNavbar.tsx |
| /api/v1/notifications/:id/read | PATCH | markAsReadHandler | NotificationService.markAsRead | Mark single notification as read | Authenticated | User | None | None | { success: true } | **YES** | 
otificationApi.markAsRead -> useMarkNotificationAsRead -> NotificationsPage.tsx |
| /api/v1/notifications/read-all | PATCH | markAllAsReadHandler | NotificationService.markAllAsRead | Mark all notifications read | Authenticated | User | None | None | { modifiedCount: number } | **YES** | 
otificationApi.markAllAsRead -> useMarkAllNotificationsAsRead -> NotificationsPage.tsx |

---

## 13. Activity Log Module (/api/v1/activities)

| Route | Method | Controller | Service | Purpose | Auth | Scope | Permissions | Request DTO | Response DTO | Consumed by Frontend? | Consumption Location / Reason |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: | :--- |
| /api/v1/activities | GET | getActivities | ActivityService.getActivities | List workspace audit trail events | Authenticated | Tenant | PROJECT_READ | ActivityQueryDto | CursorPaginatedActivities | **YES** | ctivityApi.getActivities -> useActivities -> ActivityPage.tsx, TaskActivityTimeline.tsx, EntityActivityTimeline.tsx |

---

## 14. Endpoint Consumption Summary & Verdict

- **Total REST Endpoints Defined**: 41
- **Endpoints Consumed by Frontend**: 41 (100% route coverage achieved across API service files)
- **Identified Backend Endpoint Gaps (Missing Backend APIs)**:
  1. **Workspace Invitations**: Backend lacks POST /workspaces/:id/invitations, GET /invitations/:token, POST /invitations/:token/accept, POST /invitations/:token/reject.
  2. **Role Management**: Backend lacks PATCH /workspaces/:id/members/:userId/role for promoting/demoting admins.
  3. **Ownership Transfer**: Backend lacks POST /workspaces/:id/transfer-ownership.
  4. **Workspace Archiving**: Backend lacks POST /workspaces/:id/archive.
  5. **Avatar Upload**: Backend lacks avatar upload endpoint (POST /users/me/avatar), leaving the avatar button in Profile Settings disabled.
  6. **Project Duplication**: Backend lacks POST /projects/:id/duplicate.
  7. **Bulk Task Operations**: Backend lacks bulk update/delete endpoints (PATCH /tasks/bulk, DELETE /tasks/bulk).
