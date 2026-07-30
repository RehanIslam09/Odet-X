# Phase 33 — Role-Based Access Control (RBAC) & Collaboration Master Index

**Phase Status:** COMPLETED & VERIFIED (100% Pass Rate Across 80 Test Suites)  
**Target Repository:** `/home/rehan/Developer/ai-project-manager`  
**Core Objective:** Establish multi-tenant Role-Based Access Control (RBAC), decouple resource ownership from access control boundaries, enable secure multi-user workspace collaboration, enforce anti-enumeration security defenses, and deliver reactive frontend permission controls.

---

## 1. Executive Summary

Phase 33 completes the transformation of the AI Project Manager platform from a single-user isolated model (Phase 32) into a **multi-tenant, multi-user collaborative enterprise application**.

Prior to Phase 33, domain services filtered queries by `{ owner: userId, workspaceId }`, effectively preventing multiple users within the same workspace from sharing or collaborating on projects, tasks, milestones, and AI insight tools. 

Phase 33 re-semanticized `owner` as **Creator Attribution (`createdBy`)**, established **Workspace (`workspaceId`)** as the primary security boundary, introduced a four-tier role taxonomy (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), built a centralized pure-domain `PermissionEngine`, implemented dynamic token-based workspace invitations, and integrated reactive frontend permission guards (`usePermissions` and `<Can>`).

---

## 2. Directory Layout & Key Deliverables

```
docs/phases/phase-33-rbac-collaboration/
├── README.md                           # Master Index & Overview (This File)
├── rbac-architecture.md                # Technical Architecture, Permission Engine & Middleware Contract
├── workspace-invitations.md            # Collaboration Model & Token Invitation System Specification
├── frontend-rbac-guide.md              # React UI Permission Hooks, <Can> Guard & Integration Guide
├── api-reference.md                    # Complete REST API Route & Authorization Reference
├── phase-34-handoff-guide.md           # Developer Handoff Guide: Current State, Rules & Dos/Don'ts
└── contracts/
    └── phase-33-architecture-contract.md  # Binding Technical Design & Schema Specifications
```

### Server Deliverables
- `server/src/constants/permissions.ts`: Core permission enums, role capability matrices (`ROLE_PERMISSIONS`), and role authority hierarchy definitions.
- `server/src/domain/permission-evaluator.ts`: Centralized pure-domain `PermissionEngine` evaluating capabilities, role hierarchies, and resource-level context constraints (e.g. member task deletion). Handles populated Mongoose `workspaceId` document safe stringification.
- `server/src/middleware/workspace-auth.middleware.ts`: Express middleware pipeline (`resolveWorkspace`, `requireWorkspaceMember`, `requireWorkspaceOwner`, `requirePermission`) enforcing 404 anti-enumeration and capability authorization. Auto-provisions personal workspaces for legacy users.
- `server/src/models/workspace-invitation.model.ts`: MongoDB Mongoose model for invitation tokens with cryptographic hashing, expiration logic, and 30-day TTL index auto-cleanup.
- `server/src/routes/workspace.routes.ts`: REST endpoints for workspace operations, invitations, role updates, and member management.
- `server/src/controllers/workspace.controller.ts`: Controllers executing invitation creation, token acceptance, and membership administration.
- `server/src/services/workspace.service.ts`: Domain logic for invitations, acceptance, member removal, and role updates.
- `server/src/services/task.service.ts`: Workspace-scoped task service with creator deletion checks (`MEMBER` task deletion requires creator/assignee identity), activity emissions (`TASK_PROJECT_CHANGED`), optimistic locking (`updateTaskNotes`), `.select("-notes")` projection for `listTasks`, and search label matching.
- `server/src/controllers/search.controller.ts` & `search.routes.ts`: Search routes with query validation placed prior to permission check, propagating `workspaceId` tenant boundaries.

### Client Deliverables
- `client/src/constants/permissions.ts`: Shared TypeScript `as const` permission definitions compliant with `erasableSyntaxOnly`.
- `client/src/features/workspaces/hooks/usePermissions.ts`: Reactive custom React hook providing `can`, `cannot`, `hasRole`, `isOwner`, `isAdmin`, `isMember`, `isViewer` capabilities.
- `client/src/components/common/Can.tsx`: Declarative React guard component for permission-gated element rendering.
- `client/src/features/workspaces/rbac-ui.test.tsx`: Component test suite verifying permission hook reactivity and `<Can>` render behaviors.

---

## 3. High-Level Role Capability Matrix

| Feature / Resource Domain | Permission | OWNER | ADMIN | MEMBER | VIEWER |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Workspace Settings** | `workspace:update` | ✅ | ❌ | ❌ | ❌ |
| **Workspace Deletion** | `workspace:delete` | ✅ | ❌ | ❌ | ❌ |
| **Member Directory** | `member:list` | ✅ | ✅ | ✅ | ✅ |
| **Invite Members** | `member:invite` | ✅ | ✅ | ❌ | ❌ |
| **Role Assignment** | `member:role_update` | ✅ | ✅ | ❌ | ❌ |
| **Remove Members** | `member:remove` | ✅ | ✅ | ❌ | ❌ |
| **Create Project** | `project:create` | ✅ | ✅ | ✅ | ❌ |
| **Read Project** | `project:read` | ✅ | ✅ | ✅ | ✅ |
| **Update Project** | `project:update` | ✅ | ✅ | ✅ | ❌ |
| **Delete Project** | `project:delete` | ✅ | ✅ | ❌ | ❌ |
| **Archive Project** | `project:archive` | ✅ | ✅ | ✅ | ❌ |
| **Create Task** | `task:create` | ✅ | ✅ | ✅ | ❌ |
| **Read Task** | `task:read` | ✅ | ✅ | ✅ | ✅ |
| **Update Task** | `task:update` | ✅ | ✅ | ✅ | ❌ |
| **Delete Task** | `task:delete` | ✅ | ✅ | Creator Only* | ❌ |
| **Assign Task** | `task:assign` | ✅ | ✅ | ✅ | ❌ |
| **Create Milestone** | `milestone:create` | ✅ | ✅ | ✅ | ❌ |
| **Read Milestone** | `milestone:read` | ✅ | ✅ | ✅ | ✅ |
| **Update Milestone** | `milestone:update` | ✅ | ✅ | ✅ | ❌ |
| **Delete Milestone** | `milestone:delete` | ✅ | ✅ | ❌ | ❌ |
| **Copilot AI Queries** | `ai:copilot_query` | ✅ | ✅ | ✅ | ❌ |
| **AI Action Execution** | `ai:action_execute` | ✅ | ✅ | ✅ | ❌ |
| **View Dashboard** | `dashboard:view` | ✅ | ✅ | ✅ | ✅ |
| **Execute Global Search** | `search:execute` | ✅ | ✅ | ✅ | ✅ |

*\*Note: `MEMBER` task deletion evaluates resource-level context (`task.owner === userId || task.assigneeId === userId`).*

---

## 4. Key Security Invariants & Guarantees

1. **Anti-Enumeration Defense:** Non-members attempting to access any workspace or workspace resource receive `404 Workspace not found` instead of `403 Forbidden`. Resource existence is never revealed to non-members.
2. **Decoupled Ownership:** Persistent `owner` fields represent **Creator Identity (`createdBy`)**. All multi-tenant boundary checks filter exclusively on `workspaceId`.
3. **Populated Document Handling:** `PermissionEngine` safe-stringifies `member.workspaceId` to handle populated Mongoose document instances without evaluating `"[object Object]"`.
4. **Personal Workspace Locking:** Personal workspaces (`isPersonal: true`) prohibit external invitations and ownership transfer.
5. **Idempotent Token Invitations:** Cryptographically hashed invitation tokens feature a 7-day expiration and automatic 30-day TTL MongoDB cleanup.

---

## 5. Quick Navigation

- For Technical Architecture & Middleware Pipeline: see [rbac-architecture.md](./rbac-architecture.md)
- For Invitation Token Lifecycle & Schema: see [workspace-invitations.md](./workspace-invitations.md)
- For React Hooks & UI Guards: see [frontend-rbac-guide.md](./frontend-rbac-guide.md)
- For REST API Endpoint Specifications: see [api-reference.md](./api-reference.md)
- For Developer Rules, Invariants & Phase 34 Handoff: see [phase-34-handoff-guide.md](./phase-34-handoff-guide.md)
