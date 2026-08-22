# Phase 35.6 — Investigation 10: Workspace Scoping Contract, Authorization Matrix & Visibility Rules
## Document 10: Definitive Engineering Contract for Scoping, Visibility, and Role-Based Access Control

**Status**: Completed — AUTHORITATIVE CONTRACT & ARCHITECTURE BLUEPRINT (No Code Modified)  
**Phase**: 35.6 (Software Forensics & Architecture Analysis)  
**Date**: 2026-08-05  
**Lead Architect**: Principal Software Architect / Lead Security Architect / Staff Systems Engineer  
**Classification**: Permanent Specification — Immutable Contract for SWP-04 through SWP-12 Execution  

---

> [!IMPORTANT]
> This document establishes the **Workspace Scoping Contract, Authorization Matrix & Visibility Rules** for the Workspace Platform.
> It resolves the systemic legacy anti-pattern identified in Investigation 09 (*User-Centric Ownership Filtering in Multi-Tenant Workspace Contexts*) by defining exact mongo query standards, visibility rules, role permissions, and golden query templates.
> NO SOURCE CODE MODIFICATIONS OR TESTS HAVE BEEN RUN DURING THIS TASK.

---

## 1. Executive Summary & Core Architectural Contract

### The Core Architectural Shift
In single-tenant paradigms (Phase 34.5), resource visibility and authorization were conflated: checking `resource.owner == userId` served as both a tenant boundary and a permission gate.

In multi-tenant collaborative workspaces (Phase 35), **Visibility and Authorization are strictly decoupled**:
1. **Workspace Membership Grants Visibility**: Any user with a valid `WorkspaceMember` record in a workspace has read access to shared workspace entities (projects, tasks, activities, recommendations, project memories, search).
2. **Role & Resource Context Enforces Authorization**: Write actions (`CREATE`, `UPDATE`, `DELETE`, `ARCHIVE`, `INVITE`) are governed by `PermissionEngine` based on `WorkspaceRole` (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) and optional resource context (e.g., creator/assignee).

```
==========================================================================================
                     DECOUPLED SCOPING & AUTHORIZATION PARADIGM
==========================================================================================

 [ HTTP Request ] ──► [ resolveOptionalWorkspace ] ──► Validates Workspace Member Access
                           │
                           ▼
               [ PermissionEngine.authorize ] ──► Checks Role Capabilities & Constraints
                           │
                           ▼
               [ Mongoose Domain Service ]    ──► Queries { workspaceId: targetWsId }
                                                  (DOES NOT FILTER BY owner: userId)
==========================================================================================
```

---

## 2. Endpoint Classification & Scoping Inventory

| Feature Domain | Endpoint(s) | Controller File | Service File | Current Filter | Target Classification | Rationale |
|---|---|---|---|---|---|---|
| **Dashboard Overview** | `GET /api/v1/dashboard/overview` | `dashboard.controller.ts` | `dashboard.service.ts` | `{ owner, workspaceId }` | **Workspace Scoped** | Aggregates workspace team metrics, not individual author metrics. |
| **Projects List** | `GET /api/v1/projects` | `project.controller.ts` | `project.service.ts` | `{ workspaceId }` | **Workspace Scoped** | Team members collaborate on all active workspace projects. |
| **Project Details** | `GET /api/v1/projects/:id` | `project.controller.ts` | `project.service.ts` | `{ _id, workspaceId }` | **Workspace Scoped** | Member access to project details within tenant. |
| **Project Create** | `POST /api/v1/projects` | `project.controller.ts` | `project.service.ts` | Attaches `owner: userId` | **Workspace Scoped (Mutation)** | Binds creator to `owner` field while scoping to `workspaceId`. |
| **Tasks List** | `GET /api/v1/tasks` | `task.controller.ts` | `task.service.ts` | `{ workspaceId }` | **Workspace Scoped** | Board & list views display all tasks in active workspace. |
| **Workspace Activity** | `GET /api/v1/activities` | `activity.controller.ts` | `activity.service.ts` | `{ workspaceId }` | **Workspace Scoped** | Realtime stream of all events occurring in the workspace. |
| **Workspace Recs** | `GET /api/v1/recommendations` | `project-recommendation.controller.ts` | `project-recommendation-query.service.ts` | `{ owner }` | **Workspace Scoped** | Actionable proactive intelligence for workspace projects. |
| **Project Recs** | `GET /api/v1/projects/:id/recommendations` | `project-recommendation.controller.ts` | `project-recommendation-query.service.ts` | `{ owner, projectId }` | **Project Scoped** | Scoped to specific project within valid workspace. |
| **Project Memories** | `GET /api/v1/projects/:id/memories` | `project-memory.controller.ts` | `project-memory.service.ts` | `{ owner, projectId }` | **Project Scoped** | AI contextual memories shared across project team. |
| **AI Summary** | `POST /api/v1/projects/:id/generate-summary` | `project.controller.ts` | `project-summary-ai.service.ts` | `{ owner, _id }` | **Project Scoped** | AI summary synthesizes all active tasks in project. |
| **AI Task Generation**| `POST /api/v1/projects/:id/generate-tasks` | `project.controller.ts` | `project-ai.service.ts` | `{ owner, _id }` | **Project Scoped** | Generates tasks against existing project task context. |
| **Global Search** | `GET /api/v1/search` | `global-search.controller.ts` | `global-search.service.ts` | `{ owner, workspaceId }` | **Workspace Scoped** | Searches all projects, tasks, memories in workspace. |
| **Workspace Members**| `GET /api/v1/workspaces/:id/members` | `workspace.controller.ts` | `workspace.service.ts` | `{ workspaceId }` | **Workspace Scoped** | Member directory for collaboration & assignments. |
| **Workspace Settings**| `GET/PATCH /api/v1/workspaces/:id` | `workspace.controller.ts` | `workspace.service.ts` | `{ _id }` | **Workspace Scoped** | Configuration & preferences for active workspace. |
| **Notifications** | `GET /api/v1/notifications` | `notification.controller.ts` | `notification.service.ts` | `{ recipientId }` | **User Scoped** | Private notification inbox for authenticated recipient. |
| **User Profile** | `GET/PATCH /api/v1/users/me` | `user.controller.ts` | `user.service.ts` | `{ _id: userId }` | **User Scoped** | Personal user credentials and global account details. |

---

## 3. Workspace Visibility Contract

### 3.1 Projects Entity Contract
* **Visibility**: Every member of a workspace can view all non-deleted, non-archived projects in that workspace.
* **Creation**: `OWNER`, `ADMIN`, and `MEMBER` roles can create projects.
* **Modification**: `OWNER`, `ADMIN`, and `MEMBER` roles can update project metadata (name, emoji, color, description).
* **Deletion & Archival**: Only `OWNER` and `ADMIN` roles can delete or archive projects.

### 3.2 Tasks Entity Contract
* **Visibility**: Every member of a workspace can view all tasks belonging to workspace projects or unassigned workspace tasks.
* **Creation & Assignment**: `OWNER`, `ADMIN`, and `MEMBER` roles can create and assign tasks.
* **Status Updates**: Any `MEMBER` can update status (`todo`, `in_progress`, `done`) or reorder positions.
* **Deletion**: `OWNER` and `ADMIN` can delete any task. `MEMBER` can delete a task IF they are the task creator (`owner`) OR assignee (`assigneeId`).

### 3.3 Proactive Recommendations Contract
* **Visibility**: Workspace recommendations are visible to all workspace members (`Permission.PROJECT_READ`).
* **Dismissal**: `OWNER`, `ADMIN`, and `MEMBER` roles can dismiss recommendations (`Permission.PROJECT_UPDATE`).

### 3.4 Project Memories Contract
* **Visibility**: Project memories are shared assets scoped to `projectId` and `workspaceId`. Visible to all members with `PROJECT_READ`.
* **Creation & Deletion**: `OWNER`, `ADMIN`, and `MEMBER` roles can add or clear project memories.

### 3.5 Global Search Contract
* **Visibility**: Searches return projects, tasks, milestones, and memories matching query string where `workspaceId === activeWorkspaceId`. Creator/owner filtering is strictly omitted.

---

## 4. Role-Based Authorization Matrix

| Capability / Action | OWNER | ADMIN | MEMBER | VIEWER | Permission Constant |
|---|---|---|---|---|---|
| **View Workspace Dashboard** | ✅ | ✅ | ✅ | ✅ | `Permission.DASHBOARD_VIEW` |
| **View Projects & Tasks** | ✅ | ✅ | ✅ | ✅ | `Permission.PROJECT_READ`, `TASK_READ` |
| **Create Project** | ✅ | ✅ | ✅ | ❌ | `Permission.PROJECT_CREATE` |
| **Update Project** | ✅ | ✅ | ✅ | ❌ | `Permission.PROJECT_UPDATE` |
| **Archive / Delete Project** | ✅ | ✅ | ❌ | ❌ | `Permission.PROJECT_ARCHIVE`, `PROJECT_DELETE` |
| **Create / Assign Task** | ✅ | ✅ | ✅ | ❌ | `Permission.TASK_CREATE`, `TASK_ASSIGN` |
| **Update Task Status / Details** | ✅ | ✅ | ✅ | ❌ | `Permission.TASK_UPDATE` |
| **Delete Task** | ✅ | ✅ | Refined* | ❌ | `Permission.TASK_DELETE` (*Creator/Assignee) |
| **Execute AI Actions / Copilot** | ✅ | ✅ | ✅ | ❌ | `Permission.AI_COPILOT_QUERY`, `AI_ACTION_EXECUTE` |
| **View Workspace Members** | ✅ | ✅ | ✅ | ✅ | `Permission.MEMBER_LIST` |
| **Invite Workspace Member** | ✅ | ✅ | ❌ | ❌ | `Permission.MEMBER_INVITE` |
| **Update Member Role** | ✅ | ✅ | ❌ | ❌ | `Permission.MEMBER_ROLE_UPDATE` |
| **Remove Workspace Member** | ✅ | ✅ | ❌ | ❌ | `Permission.MEMBER_REMOVE` |
| **Update Workspace Settings** | ✅ | ✅ | ❌ | ❌ | `Permission.WORKSPACE_UPDATE` |
| **Delete Workspace** | ✅ | ❌ | ❌ | ❌ | `Permission.WORKSPACE_DELETE` |
| **Transfer Ownership** | ✅ | ❌ | ❌ | ❌ | `Permission.WORKSPACE_UPDATE` |

---

## 5. Audit of Legacy Authorization Assumptions (Top 30 Anti-Patterns)

1. `dashboard.service.ts`: `Project.countDocuments({ owner, workspaceId })`
2. `dashboard.service.ts`: `Project.countDocuments({ owner, workspaceId, archived: true })`
3. `dashboard.service.ts`: `Task.aggregate([{ $match: { owner, workspaceId } }])`
4. `dashboard.service.ts`: `Task.find({ owner, workspaceId, status: { $nin: ... } })`
5. `dashboard.service.ts`: `Project.find({ owner, workspaceId }).sort(...)`
6. `dashboard.service.ts`: `Task.aggregate([{ $match: { projectId, owner, workspaceId } }])`
7. `project-recommendation-query.service.ts`: `listWorkspaceRecommendations` omitting `explicitWorkspaceId`
8. `project-recommendation-query.service.ts`: `filter.owner = ownerObjId` fallback
9. `project-recommendation-query.service.ts`: `listProjectRecommendations` -> `Project.findOne({ _id, owner })`
10. `project-recommendation-query.service.ts`: `listProjectRecommendations` -> `filter = { owner, projectId }`
11. `project-memory.service.ts`: `listProjectMemories` -> `getProjectById(projectId, ownerId)` (no `workspaceId`)
12. `project-memory.service.ts`: `listProjectMemories` -> `filter = { owner: ownerId, projectId }`
13. `project-memory.service.ts`: `createProjectMemory` -> `getProjectById(projectId, ownerId)`
14. `project-summary-ai.service.ts`: `assertProjectOwnership` -> `Project.findOne({ _id, owner })`
15. `project-summary-ai.service.ts`: `Task.find({ projectId, owner, isDeleted: false })`
16. `project-ai.service.ts`: `assertProjectOwnership` -> `Project.findOne({ _id, owner })`
17. `project-ai.service.ts`: `Task.find({ projectId, owner, isDeleted: false })`
18. `global-search.service.ts`: `projectFilter = { owner: ownerObjectId, workspaceId }`
19. `global-search.service.ts`: `taskFilter = { owner: ownerObjectId, workspaceId }`
20. `global-search.service.ts`: `memoryFilter = { owner: ownerObjectId, workspaceId }`
21. `global-search.service.ts`: `milestoneFilter = { owner: ownerObjectId, workspaceId }`
22. `project.service.ts`: `assertProjectOwnership` fallback to `filter.owner = userId` when `workspaceId` is missing
23. `task.service.ts`: `assertTaskOwnership` fallback to `filter.owner = userId` when `workspaceId` is missing
24. `task.service.ts`: `validateProjectOwnership` fallback to `filter.owner = userId` when `workspaceId` is missing
25. `workspace-invitation.service.ts`: `transferWorkspaceOwnership` missing former owner demotion
26. `notification.service.ts`: Uncleaned invitation notification documents post-acceptance
27. `activity.utils.ts`: Unhandled `workspaceMember` and `workspace` event type string formatters
28. `AISettingsTab.tsx`: Component local `useState` without REST API mutation
29. `GeneralSettingsTab.tsx`: Accent color swatches without backend Mongoose field binding
30. `search-domain.utils.ts`: `generateNavigationUrl` building un-prefixed `/projects/:id` URLs

---

## 6. Golden Mongo Query Rules

```typescript
// 1. WORKSPACE ANALYTICS & DASHBOARD (CORRECT)
const projectFilter = { workspaceId: targetWorkspaceId, isDeleted: false, archived: false };
const taskFilter = { workspaceId: targetWorkspaceId, isDeleted: false, archived: false };

// 2. PROJECT SEARCH & LOOKUPS (CORRECT)
const project = await Project.findOne({ _id: projectId, workspaceId: targetWorkspaceId, isDeleted: false });

// 3. PROJECT-SCOPED MEMORIES & RECOMMENDATIONS (CORRECT)
const memories = await ProjectMemory.find({ projectId, workspaceId: targetWorkspaceId });
const recommendations = await ProjectRecommendation.find({ workspaceId: targetWorkspaceId, status: "ACTIVE" });

// 4. USER-SCOPED PRIVATE NOTIFICATIONS (CORRECT)
const userNotifications = await Notification.find({ recipientId: userObjectId });
```

---

## 7. Permanent Engineering Rules

1. **Rule 1 (Membership Grants Visibility)**: In a multi-tenant workspace, data visibility is granted by `workspaceId` and `WorkspaceMember` status, NEVER by `resource.owner == userId`.
2. **Rule 2 (Role Governs Mutation)**: Resource ownership (`owner`) records attribution. Mutation rights (`UPDATE`, `DELETE`, `ARCHIVE`) are governed by `WorkspaceRole` via `PermissionEngine`.
3. **Rule 3 (Dashboard Scoping)**: Dashboard statistics (`activeProjects`, `totalTasks`, `completionPercentage`) represent workspace-wide aggregates.
4. **Rule 4 (Mandatory Workspace Id in Scoped Queries)**: Every service query for projects, tasks, activities, recommendations, and search MUST include `workspaceId: targetWorkspaceId`.
5. **Rule 5 (No Silent Header Fallbacks)**: Controllers handling workspace routes MUST pass `req.workspace._id` to underlying domain services.

---

## 8. Phase 34.5 Baseline Cross-Check & Migration History

* **Phase 34.5**: Personal Workspaces only (`isPersonal === true`). `ownerId === userId` was an invariant for every record in MongoDB.
* **Phase 35**: Introduced `Workspace` and `WorkspaceMember` models. `listProjects` and `listTasks` were migrated to `workspaceId`, but secondary services (`dashboard`, `recommendations`, `memories`, `search`, `ai-summary`) were accidentally left with legacy `{ owner: userId }` filters.
* **SWP-04+ Mandate**: Repair secondary services to eliminate all residual `{ owner: userId }` filters in workspace contexts.

---

## 9. Actionable Recommendations for SWP-04 Implementation

1. **SWP-04 Target 1**: Update `getDashboardOverview` in `dashboard.service.ts` to remove `owner` from `Project.countDocuments`, `Task.aggregate`, `Task.find`, and `Project.find`.
2. **SWP-04 Target 2**: Update `listWorkspace` controller in `project-recommendation.controller.ts` to pass `req.workspace?._id?.toString()` to `listWorkspaceRecommendations`.
3. **SWP-04 Target 3**: Partition `projectKeys` (`["projects", "list", workspaceId, params]`) and `taskKeys` (`["tasks", "list", workspaceId, params]`) in React Query key factories.

---

*End of Document 10.*  
*Investigation 10 is officially COMPLETE.*  
*The Workspace Scoping Contract & Authorization Matrix is established.*
