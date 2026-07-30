# Phase 33 — API Endpoint & Authorization Reference

## 1. Request Header & Tenant Identification Standards

All protected API endpoints require an active authentication session token and target workspace identification:

```http
Authorization: Bearer <jwt_access_token>
x-workspace-id: 66a2f8b...  (OR x-workspace-slug: my-workspace-slug)
```

Alternatively, `workspaceId` or `workspaceSlug` may be passed as a route parameter (e.g. `/api/v1/workspaces/:workspaceId/...`). If no workspace identifier is passed in headers or route params, the server resolves the caller's **Personal Workspace**.

---

## 2. Comprehensive Endpoint Registry

### Workspace Management Endpoints

| Method | Endpoint | Required Permission / Guard | Success Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/workspaces` | `authenticate` | `200 OK` | List caller's workspaces & roles |
| `POST` | `/api/v1/workspaces` | `authenticate` | `201 Created` | Create new custom workspace |
| `GET` | `/api/v1/workspaces/:workspaceId` | `resolveWorkspace`, `requireWorkspaceMember` | `200 OK` | Fetch workspace details & active members |
| `PATCH` | `/api/v1/workspaces/:workspaceId` | `resolveWorkspace`, `requireWorkspaceOwner` | `200 OK` | Update workspace name/slug |
| `DELETE` | `/api/v1/workspaces/:workspaceId` | `resolveWorkspace`, `requireWorkspaceOwner` | `200 OK` | Delete empty custom workspace |

### Workspace Invitation & Collaboration Endpoints

| Method | Endpoint | Required Permission / Guard | Success Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/workspaces/:workspaceId/invitations` | `resolveWorkspace`, `requirePermission(MEMBER_INVITE)` | `201 Created` | Issue new member invitation |
| `POST` | `/api/v1/workspaces/invitations/accept` | `authenticate` | `200 OK` | Accept invitation via raw token |
| `GET` | `/api/v1/workspaces/:workspaceId/members` | `resolveWorkspace`, `requirePermission(MEMBER_LIST)` | `200 OK` | List workspace members |
| `DELETE` | `/api/v1/workspaces/:workspaceId/members/:userId` | `resolveWorkspace`, `requirePermission(MEMBER_REMOVE)` | `200 OK` | Remove workspace member / self-leave |

### Project Endpoints (`/api/v1/projects`)

| Method | Endpoint | Required Permission | Success Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/projects` | `requirePermission(PROJECT_READ)` | `200 OK` | List workspace projects |
| `POST` | `/api/v1/projects` | `requirePermission(PROJECT_CREATE)` | `201 Created` | Create workspace project |
| `GET` | `/api/v1/projects/:id` | `requirePermission(PROJECT_READ)` | `200 OK` | Get project details |
| `PATCH` | `/api/v1/projects/:id` | `requirePermission(PROJECT_UPDATE)` | `200 OK` | Update project details |
| `DELETE` | `/api/v1/projects/:id` | `requirePermission(PROJECT_DELETE)` | `200 OK` | Delete project |
| `POST` | `/api/v1/projects/:id/archive` | `requirePermission(PROJECT_ARCHIVE)` | `200 OK` | Toggle project archival |
| `POST` | `/api/v1/projects/:id/generate-tasks` | `requirePermission(AI_ACTION_EXECUTE)` | `200 OK` | AI Task Generation |
| `POST` | `/api/v1/projects/:id/generate-summary` | `requirePermission(AI_ACTION_EXECUTE)` | `200 OK` | AI Summary Generation |
| `POST` | `/api/v1/projects/:projectId/copilot` | `requirePermission(AI_COPILOT_QUERY)` | `200 OK` | Read-Only Copilot AI Query |

### Task Endpoints (`/api/v1/tasks`)

| Method | Endpoint | Required Permission | Success Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/tasks` | `requirePermission(TASK_READ)` | `200 OK` | List workspace tasks (`.select("-notes")`) |
| `POST` | `/api/v1/tasks` | `requirePermission(TASK_CREATE)` | `201 Created` | Create task |
| `GET` | `/api/v1/tasks/:id` | `requirePermission(TASK_READ)` | `200 OK` | Get task details (includes notes) |
| `PATCH` | `/api/v1/tasks/:id` | `requirePermission(TASK_UPDATE)` | `200 OK` | Update task fields |
| `PATCH` | `/api/v1/tasks/:id/notes` | `requirePermission(TASK_UPDATE)` | `200 OK` | Update task notes (optimistic locking) |
| `DELETE` | `/api/v1/tasks/:id` | `requirePermission(TASK_DELETE)` | `200 OK` | Delete task (Creator check for MEMBER) |
| `POST` | `/api/v1/tasks/:id/archive` | `requirePermission(TASK_UPDATE)` | `200 OK` | Toggle task archival |

### Global Search & Dashboard Endpoints

| Method | Endpoint | Required Permission | Success Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/search` | `requirePermission(SEARCH_EXECUTE)` | `200 OK` | Global entity search across workspace |
| `GET` | `/api/v1/dashboard/summary` | `requirePermission(DASHBOARD_VIEW)` | `200 OK` | Dashboard metrics & recent activity |

---

## 3. Standard HTTP Error Response Envelopes

All error responses adhere to the standard application error envelope:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Workspace not found."
  }
}
```

### HTTP Status Code Mappings

- **`400 Bad Request`**: Validation errors, malformed ObjectIds, invalid token, or expired invitation.
- **`401 Unauthorized`**: Missing or invalid JWT Bearer token.
- **`403 Forbidden`**: Authenticated caller lacks necessary role capability (e.g. `MEMBER` attempting workspace deletion) or sole owner attempting self-leave.
- **`404 Not Found`**: Non-existent resource OR caller is not a member of the workspace (Anti-Enumeration Guard).
- **`409 Conflict`**: Duplicate resource, existing active member invitation, or optimistic concurrency conflict (`expectedVersion` mismatch).
