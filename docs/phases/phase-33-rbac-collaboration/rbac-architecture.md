# Phase 33 ? Role-Based Access Control (RBAC) & Collaboration Architecture

## 1. Overview & Architecture Goals

Phase 33 introduces a multi-tenant Role-Based Access Control (RBAC) and collaboration engine for the AI Project Manager application. The RBAC system guarantees strict workspace boundary isolation, fine-grained capability authorization, resource ownership constraints, and HTTP 404 anti-enumeration defenses across all backend API routes and frontend user interfaces.

---

## 2. Role Taxonomy & Capability Matrix

The RBAC system defines four workspace roles with cascading authority:

1. **`OWNER`**: Complete administrative control over the workspace, including workspace updates, deletions, and member removals.
2. **`ADMIN`**: Elevated management authority over workspace members, projects, tasks, and milestones. Cannot delete or rename the workspace.
3. **`MEMBER`**: Core collaborator capable of creating, reading, updating, and deleting own projects and tasks. Cannot manage workspace membership or settings.
4. **`VIEWER`**: Read-only collaborator. Can view dashboard metrics, projects, tasks, milestones, and search results. Restricted from executing mutations or invoking AI tools.

### Permission Matrix

| Permission | Resource Domain | OWNER | ADMIN | MEMBER | VIEWER |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `workspace:update` | Workspace Settings | YES | NO | NO | NO |
| `workspace:delete` | Workspace Destruction | YES | NO | NO | NO |
| `member:list` | Member Directory | YES | YES | YES | YES |
| `member:invite` | Member Invitations | YES | YES | NO | NO |
| `member:role_update` | Member Role Assignment | YES | YES | NO | NO |
| `member:remove` | Member Removal | YES | YES | NO | NO |
| `project:create` | Project Creation | YES | YES | YES | NO |
| `project:read` | Project Details & List | YES | YES | YES | YES |
| `project:update` | Project Modification | YES | YES | YES | NO |
| `project:delete` | Project Removal | YES | YES | NO | NO |
| `project:archive` | Project Archival | YES | YES | YES | NO |
| `task:create` | Task Creation | YES | YES | YES | NO |
| `task:read` | Task Details & List | YES | YES | YES | YES |
| `task:update` | Task Modification | YES | YES | YES | NO |
| `task:delete` | Task Deletion | YES | YES | YES* | NO |
| `task:assign` | Task Assignment | YES | YES | YES | NO |
| `milestone:create` | Milestone Creation | YES | YES | YES | NO |
| `milestone:read` | Milestone Details | YES | YES | YES | YES |
| `milestone:update` | Milestone Update | YES | YES | YES | NO |
| `milestone:delete` | Milestone Deletion | YES | YES | NO | NO |
| `ai:copilot_query` | Copilot AI Queries | YES | YES | YES | NO |
| `ai:action_execute` | AI Task & Plan Generation | YES | YES | YES | NO |
| `dashboard:view` | Dashboard Metrics | YES | YES | YES | YES |
| `search:execute` | Global Search Engine | YES | YES | YES | YES |

*\*Note: `MEMBER` task deletion is subject to creator ownership verification (`createdBy === userId` or `assigneeId === userId`). `ADMIN` and `OWNER` can delete any member task.*

---

## 3. Middleware Execution Contract

All protected API endpoints execute through a mandatory, ordered Express middleware pipeline:

```
[Incoming Request]
       ?
       ?
1. authenticate                     (Verifies JWT & attaches req.user)
       ?
       ?
2. resolveWorkspace /               (Resolves x-workspace-id header or param into req.workspace;
   resolveOptionalWorkspace          verifies caller membership -> req.workspaceMember)
       ?
       ?
3. requireWorkspaceMember            (Ensures caller possesses active WorkspaceMember document)
       ?
       ?
4. requirePermission(permission)     (Evaluates PermissionEngine capability matrix & context)
       ?
       ?
5. validate(zodSchema)               (Sanitizes and validates request body/query)
       ?
       ?
6. Controller Handler                (Executes domain business logic)
```

---

## 4. Anti-Enumeration & Security Defense

To prevent malicious actors from enumerating workspace IDs or discovering project/task IDs in unjoined tenants:

- Any API request attempting to access a workspace or a workspace-scoped resource where the user holds **no active membership** returns **HTTP 404 Not Found** (`"Workspace not found."`).
- The system never returns HTTP 403 Forbidden for non-members, concealing resource existence and preventing cross-tenant enumeration attacks.

---

## 5. Domain Service Scoping & Context Rules

- **Workspace Scoping:** All service queries (`Project.find`, `Task.find`, `GlobalSearch`) mandate `{ workspaceId }` equality filters, enforcing strict multi-tenant data boundaries at the persistence layer.
- **Creator Task Deletion:** `task.service.ts` passes the fetched task entity into `PermissionEngine.authorize(ctx)`. If the role is `MEMBER`, deletion is granted only if `task.createdBy.equals(userId)` or `task.assigneeId.equals(userId)`.
- **Personal Workspace Protection:** Personal workspaces (`isPersonal: true`) lock membership mutations to prevent secondary invitations or owner role transfers.

---

## 6. Frontend Integration & Permission-Aware UI

- **`usePermissions()` Hook:** Centralized hook delivering reactive capability checks (`can`, `cannot`, `hasRole`, `isOwner`, `isAdmin`, `isMember`, `isViewer`).
- **`Can` Component:** Declarative wrapper component (`<Can permission={Permission.PROJECT_CREATE}>`) for clean, permission-gated rendering.
- **Erasable Const Taxonomy:** Permission constants are defined using TypeScript `as const` objects, ensuring compliance with strict build environments (`erasableSyntaxOnly`) and 0-runtime overhead.
