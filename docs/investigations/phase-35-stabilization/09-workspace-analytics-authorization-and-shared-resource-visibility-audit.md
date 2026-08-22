# Phase 35.6 — Investigation 09: Workspace Analytics, Authorization & Shared Resource Visibility Audit
## Document 09: Forensic Investigation into Analytics Aggregation, Permission Scoping, and Shared Resource Isolation Defects

**Status**: Completed — FORENSICS & AUDIT ONLY (No Code Modified)  
**Phase**: 35.6 (Software Forensics & Root Cause Analysis)  
**Date**: 2026-08-05  
**Investigator**: Principal Software Architect / Lead Backend Engineer / Principal Systems Auditor  
**Classification**: Immutable Engineering Audit — Diagnostic Blueprint for Shared Resource Scoping Remediation  

---

> [!IMPORTANT]
> This document details the forensic investigation into why workspace members observe empty dashboards (`Projects = 0`, `Tasks = 0`), failed recommendations (`"Unable to load recommendations"`), and inaccessible project memories (`"Failed to load project memories"`), while workspace owners in the exact same workspace view fully populated data.
> NO SOURCE CODE HAS BEEN MODIFIED DURING THIS INVESTIGATION.

---

## 1. Executive Summary

### Primary Forensic Findings
Investigation 09 reveals a single **Systemic Architectural Pattern Failure** across backend domain services:
**"User-Centric Ownership Filtering in Multi-Tenant Workspace Contexts"**.

During earlier single-user phases of the application, domain services enforced security by hardcoding `{ owner: new Types.ObjectId(userId) }` in MongoDB queries. When Workspace Platform V2 introduced multi-tenant workspaces (`workspaceId`), several services appended `workspaceId` alongside `owner: userId` (`{ owner: userId, workspaceId }`) instead of replacing `owner: userId` with `workspaceId` (or workspace membership validation).

### Impact on Workspace Roles
* **Workspace Owner (User A)**: Created the project and tasks (`owner = User A`). Queries filtering by `{ owner: User A, workspaceId: TeamWorkspace }` return `1` project, `1` task, and valid recommendations/memories.
* **Workspace Member (User B)**: Joined the Team Workspace. Queries filtering by `{ owner: User B, workspaceId: TeamWorkspace }` return `0` projects, `0` tasks, throw 404 errors on recommendations and memories, and omit search results.
* **Direct Page Access (`/projects`, `/tasks`)**: Functions correctly because `listProjects` and `listTasks` filter strictly by `{ workspaceId, isDeleted: false }` without filtering by `owner: userId`.

---

## 2. Complete Endpoint & Service Inventory Audit

| Endpoint | Controller File | Service File | Query Filter Pattern | Visibility Behavior | Classification |
|---|---|---|---|---|---|
| `GET /api/v1/dashboard/overview` | `dashboard.controller.ts` | `dashboard.service.ts` | `{ owner, workspaceId }` | **Broken for Members** (`0` projects/tasks) | **Option C/D Bug** |
| `GET /api/v1/recommendations` | `project-recommendation.controller.ts` | `project-recommendation-query.service.ts` | `{ owner }` (Omits `workspaceId`) | **Broken for Members** (Filtered to user) | **Option C/D Bug** |
| `GET /api/v1/projects/:id/recommendations` | `project-recommendation.controller.ts` | `project-recommendation-query.service.ts` | `Project.findOne({ _id, owner })` | **Broken for Members** (Throws 404) | **Option C/D Bug** |
| `GET /api/v1/projects/:id/memories` | `project-memory.controller.ts` | `project-memory.service.ts` | `getProjectById(id, owner)` -> `{ owner, _id }` | **Broken for Members** (Throws 404) | **Option C/D Bug** |
| `POST /api/v1/projects/:id/memories` | `project-memory.controller.ts` | `project-memory.service.ts` | `getProjectById(id, owner)` | **Broken for Members** (Throws 404) | **Option C/D Bug** |
| `POST /api/v1/projects/:id/generate-summary` | `project.controller.ts` | `project-summary-ai.service.ts` | `Project.findOne({ _id, owner })` | **Broken for Members** (Throws 404) | **Option C/D Bug** |
| `POST /api/v1/projects/:id/generate-tasks` | `project.controller.ts` | `project-ai.service.ts` | `Project.findOne({ _id, owner })` | **Broken for Members** (Throws 404) | **Option C/D Bug** |
| `GET /api/v1/search` | `global-search.controller.ts` | `global-search.service.ts` | `{ owner, workspaceId }` | **Broken for Members** (0 team search results) | **Option C/D Bug** |
| `GET /api/v1/projects` | `project.controller.ts` | `project.service.ts` | `{ workspaceId, isDeleted: false }` | **Works for Members** (Shared team projects) | **Option A/B Correct** |
| `GET /api/v1/tasks` | `task.controller.ts` | `task.service.ts` | `{ workspaceId, isDeleted: false }` | **Works for Members** (Shared team tasks) | **Option A/B Correct** |
| `GET /api/v1/activities` | `activity.controller.ts` | `activity.service.ts` | `{ workspaceId }` | **Works for Members** (Workspace timeline) | **Option A/B Correct** |
| `GET /api/v1/notifications` | `notification.controller.ts` | `notification.service.ts` | `{ recipientId }` | **Works for All Users** (User recipient inbox) | **User-Scoped Correct** |

---

## 3. Deep-Dive Domain Forensics

### 3.1 Dashboard Aggregation Audit (`dashboard.service.ts`)
* **Execution Trace**: `GET /api/v1/dashboard/overview` -> `getOverview` -> `getDashboardOverview(userId, workspaceId)`.
* **Code Evidence** (`server/src/services/dashboard.service.ts` lines 40, 43, 49, 101, 118, 175):
  ```typescript
  const owner = new Types.ObjectId(userId);
  Project.countDocuments({ owner, workspaceId: targetWorkspaceId, isDeleted: false, archived: false });
  Task.aggregate([{ $match: { owner, workspaceId: targetWorkspaceId, isDeleted: false, archived: false } }]);
  ```
* **Root Cause Analysis**: The dashboard service explicitly injects `owner: new Types.ObjectId(userId)` into every Mongoose count, query, and aggregation pipeline. It measures only items *created by the requesting user* within that workspace, rendering `0` metrics for workspace members who did not author the project.

### 3.2 Project Recommendations Audit (`project-recommendation-query.service.ts`)
* **Execution Trace**: `GET /api/v1/recommendations` -> `listWorkspace` -> `listWorkspaceRecommendations(userId, query)`.
* **Code Evidence** (`server/src/controllers/project-recommendation.controller.ts` line 62 & `server/src/services/project-recommendation-query.service.ts` line 38):
  ```typescript
  // Controller fails to pass req.workspace?._id?.toString() to service:
  const result = await listWorkspaceRecommendations(userId, query);

  // Service falls back to owner filter when explicitWorkspaceId is omitted:
  if (explicitWorkspaceId) {
    filter.workspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else {
    filter.owner = ownerObjId;
  }
  ```
* **Project-Scoped Trace**: `GET /api/v1/projects/:projectId/recommendations` calls `listProjectRecommendations(userId, projectId, query)`.
  ```typescript
  const project = await Project.findOne({ _id: projectObjId, owner: ownerObjId, isDeleted: false });
  if (!project) throw new NotFoundError("Project not found.");
  ```
* **Root Cause Analysis**: Workspace recommendations route omitted passing `req.workspace._id` to the service layer. Project-scoped recommendations enforced single-user `owner: userId` checks on projects, causing 404 anti-enumeration rejections for team members.

### 3.3 Project Memories Audit (`project-memory.service.ts`)
* **Execution Trace**: `GET /api/v1/projects/:projectId/memories` -> `listProjectMemories(ownerId, projectId, query)`.
* **Code Evidence** (`server/src/services/project-memory.service.ts` lines 66, 91, 98):
  ```typescript
  export async function listProjectMemories(ownerId: string, projectId: string, query?: ...) {
    await getProjectById(projectId, ownerId); // Omits workspaceId!
    const filter = { owner: new Types.ObjectId(ownerId), projectId: new Types.ObjectId(projectId) };
    ...
  }
  ```
* **Root Cause Analysis**: `listProjectMemories` calls `getProjectById(projectId, ownerId)` without passing `workspaceId`. `assertProjectOwnership` in `project.service.ts` falls back to `filter.owner = userId`. When a Member attempts to fetch memories for a team project, `getProjectById` fails with 404 "Project not found.".

### 3.4 AI Prompt & Summary Intelligence Audit (`project-summary-ai.service.ts` & `project-ai.service.ts`)
* **Execution Trace**: `POST /api/v1/projects/:id/generate-summary` -> `generateSummaryForProject(projectId, userId)`.
* **Code Evidence** (`server/src/services/project-summary-ai.service.ts` lines 18-23, 54-59):
  ```typescript
  async function assertProjectOwnership(projectId: string, userId: string): Promise<IProjectDocument> {
    const project = await Project.findOne({ _id: new Types.ObjectId(projectId), owner: new Types.ObjectId(userId), isDeleted: false });
    if (!project) throw new NotFoundError("Project not found.");
    return project;
  }

  const activeTasks = await Task.find({ projectId: new Types.ObjectId(projectId), owner: new Types.ObjectId(userId), isDeleted: false });
  ```
* **Root Cause Analysis**: The AI service defines an internal helper `assertProjectOwnership` that strictly asserts `owner = userId`, blocking members with 404 errors. Additionally, `Task.find` filters by `owner: userId`, preventing the AI engine from inspecting tasks created by other team members.

### 3.5 Global Search Audit (`global-search.service.ts`)
* **Execution Trace**: `GET /api/v1/search?q=...` -> `searchGlobalEntities(options)`.
* **Code Evidence** (`server/src/services/global-search.service.ts` lines 78-99):
  ```typescript
  const projectFilter: Record<string, unknown> = {
    owner: ownerObjectId,
    isDeleted: false,
    archived: false,
    $or: [{ name: regexFilter }, { description: regexFilter }],
  };
  if (workspaceObjectId) {
    projectFilter.workspaceId = workspaceObjectId;
  }
  ```
* **Root Cause Analysis**: `searchGlobalEntities` hardcodes `owner: ownerObjectId` inside `projectFilter` and `taskFilter` even when `workspaceObjectId` is present. Workspace members searching for projects or tasks in a Team Workspace receive `0` results for items created by co-workers.

---

## 4. Owner vs Member Behavioral Comparison Matrix

| Application Feature | Behavior for Workspace Owner (User A) | Behavior for Workspace Member (User B) | Technical Root Cause |
|---|---|---|---|
| **Projects List (`/projects`)** | Displays 1 Project | Displays 1 Project | **Correct** (`workspaceId` filter) |
| **Tasks List (`/tasks`)** | Displays 1 Task | Displays 1 Task | **Correct** (`workspaceId` filter) |
| **Dashboard Active Projects** | Metric = `1` | Metric = `0` | `Project.countDocuments({ owner, workspaceId })` |
| **Dashboard Active Tasks** | Metric = `1` | Metric = `0` | `Task.aggregate([{ $match: { owner, workspaceId } }])` |
| **Dashboard Attention Tasks** | Displays 1 Task | Displays 0 Tasks | `Task.find({ owner, workspaceId, ... })` |
| **Dashboard Recent Projects** | Displays 1 Project | Displays 0 Projects | `Project.find({ owner, workspaceId, ... })` |
| **Workspace Recommendations** | Displays Recommendations | `"Unable to load recommendations"` | Omitted `req.workspace._id` in controller |
| **Project Recommendations** | Displays Recommendations | Throws 404 Not Found | `Project.findOne({ _id, owner })` check |
| **Project Memories** | Displays Memories | `"Failed to load project memories"` | Omitted `workspaceId` in `getProjectById` |
| **AI Summary Generation** | Generates Summary | Throws 404 Not Found | Internal `assertProjectOwnership({ owner })` |
| **AI Task Generation** | Generates Tasks | Throws 404 Not Found | Internal `assertProjectOwnership({ owner })` |
| **Global Search (`/search`)** | Finds Project & Task | Returns 0 Items | `projectFilter = { owner, workspaceId }` |

---

## 5. Architectural Comparison Against Phase 34.5

In Phase 34.5 (commit `68b2b64`), the application operated under a single personal workspace paradigm where `ownerId === userId` was always true for all projects and tasks. When Phase 35 introduced the Workspace Platform V2 migration:
1. `listProjects` and `listTasks` were updated to filter by `workspaceId`.
2. `dashboard.service.ts`, `project-recommendation-query.service.ts`, `project-memory.service.ts`, `project-summary-ai.service.ts`, `project-ai.service.ts`, and `global-search.service.ts` were left with legacy `{ owner: userId }` query filters.
3. Because Phase 35 testing relied heavily on component mocks (`vi.mock("WorkspaceContext")`, `vitest.mock("axios")`) and tests executed as the workspace owner, this shared visibility regression escaped detection.

---

## 6. Categorized Severity & Recommended SWP Remediation Roadmap

```
                          REMEDIATION ASSIGNMENT ROADMAP
SWP-04 (React Query & Dashboard Scoping)
  └── Target: Fix dashboard.service.ts (Replace { owner, workspaceId } with { workspaceId })
  └── Target: Pass req.workspace._id in project-recommendation.controller.ts

SWP-05 (Server Middleware & Tenant Enforcement)
  └── Target: Fix project-recommendation-query.service.ts (Replace { owner } with { workspaceId })
  └── Target: Fix project-memory.service.ts (Pass workspaceId to getProjectById)

SWP-07 / AI Integration Work Package
  └── Target: Fix project-summary-ai.service.ts (Update assertProjectOwnership & Task.find)
  └── Target: Fix project-ai.service.ts (Update assertProjectOwnership & Task.find)

SWP-09 (Command Palette & Search Scoping)
  └── Target: Fix global-search.service.ts (Remove owner filter when workspaceId is present)
```

---

## 7. Direct Answers to Forensics Questions

1. **Why does the Owner see `Projects = 1` while the Member sees `Projects = 0`?**
   Because `dashboard.service.ts` queries `Project.countDocuments` and `Task.aggregate` filtering by `owner: userId`. It counts only items created by `userId`, ignoring team resources created by others in that workspace.
2. **Why do Recommendations fail for Members?**
   `listWorkspace` controller omits passing `req.workspace._id`, causing the query service to fall back to `filter.owner = userId`. `listProjectRecommendations` enforces `Project.findOne({ owner: userId })`, returning 404 for team projects.
3. **Why do Project Memories fail for Members?**
   `listProjectMemories` calls `getProjectById(projectId, ownerId)` without passing `workspaceId`. It falls back to checking `owner: userId`, returning 404 for team projects created by co-workers.
4. **Is this ONE root cause or MULTIPLE independent bugs?**
   It is **ONE Systemic Architectural Antipattern**: *User-Centric Ownership Filtering in Multi-Tenant Workspace Contexts*, replicated across 6 separate backend services.
5. **How many endpoints are affected?**
   10 endpoints across Dashboard, Recommendations, Memories, AI Generation, and Search.
6. **Which architectural assumption is wrong?**
   The assumption that resource visibility in a multi-tenant workspace is determined by `resource.owner == requestingUser` rather than `resource.workspaceId == activeWorkspaceId` and workspace membership.

---

*End of Document 09.*  
*Investigation 09 is officially COMPLETE.*  
*All evidence has been permanently documented without modifying source code.*
