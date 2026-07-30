# Phase 33 — Frontend RBAC & Collaboration Integration Guide

## 1. Overview

The Frontend RBAC system brings server-backed capability authorization to the React user interface. It provides reactive permission evaluation, declarative component guards (`<Can>`), dynamic menu/button state updates, and zero-runtime-overhead TypeScript permission taxonomies.

---

## 2. Erasable Const Taxonomy (`client/src/constants/permissions.ts`)

To ensure full compatibility with modern TypeScript bundlers and isolated module compilation (`erasableSyntaxOnly`), permissions and roles are defined as `as const` object literals rather than standard TypeScript enums.

```typescript
export const Permission = {
  // Workspace Administration
  WORKSPACE_UPDATE: "workspace:update",
  WORKSPACE_DELETE: "workspace:delete",

  // Member Management
  MEMBER_LIST: "member:list",
  MEMBER_INVITE: "member:invite",
  MEMBER_ROLE_UPDATE: "member:role_update",
  MEMBER_REMOVE: "member:remove",

  // Project Operations
  PROJECT_CREATE: "project:create",
  PROJECT_READ: "project:read",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete",
  PROJECT_ARCHIVE: "project:archive",

  // Task Operations
  TASK_CREATE: "task:create",
  TASK_READ: "task:read",
  TASK_UPDATE: "task:update",
  TASK_DELETE: "task:delete",
  TASK_ASSIGN: "task:assign",

  // Milestone Operations
  MILESTONE_CREATE: "milestone:create",
  MILESTONE_READ: "milestone:read",
  MILESTONE_UPDATE: "milestone:update",
  MILESTONE_DELETE: "milestone:delete",

  // AI & Analytics
  AI_COPILOT_QUERY: "ai:copilot_query",
  AI_ACTION_EXECUTE: "ai:action_execute",
  DASHBOARD_VIEW: "dashboard:view",
  SEARCH_EXECUTE: "search:execute",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const WorkspaceRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER",
} as const;

export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];
```

---

## 3. The `usePermissions` Hook (`client/src/features/workspaces/hooks/usePermissions.ts`)

The `usePermissions` custom hook reads the active workspace member state from workspace context and evaluates permissions dynamically.

### Hook Interface

```typescript
export interface UsePermissionsResult {
  role: WorkspaceRole | null;
  can: (permission: Permission) => boolean;
  cannot: (permission: Permission) => boolean;
  hasRole: (roles: WorkspaceRole | WorkspaceRole[]) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
}
```

### Usage Example

```tsx
import { usePermissions } from "@/features/workspaces/hooks/usePermissions";
import { Permission } from "@/constants/permissions";

export function ProjectHeader() {
  const { can, isViewer } = usePermissions();

  return (
    <div className="flex justify-between items-center">
      <h1>Project Directory</h1>
      {can(Permission.PROJECT_CREATE) && (
        <button className="btn-primary" onClick={handleCreateProject}>
          + New Project
        </button>
      )}
      {isViewer && (
        <span className="text-sm text-gray-500">Read-Only Mode</span>
      )}
    </div>
  );
}
```

---

## 4. Declarative Component Guard: `<Can>` (`client/src/components/common/Can.tsx`)

The `<Can>` component provides a clean, declarative wrapper for permission-gated UI elements.

### Component Interface

```typescript
export interface CanProps {
  permission?: Permission;
  role?: WorkspaceRole | WorkspaceRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}
```

### Usage Examples

1. **Permission-Gated Button:**
   ```tsx
   <Can permission={Permission.TASK_CREATE}>
     <CreateTaskButton onClick={openModal} />
   </Can>
   ```

2. **Role-Gated Section with Fallback:**
   ```tsx
   <Can 
     role={["OWNER", "ADMIN"]} 
     fallback={<p className="text-muted">Contact your administrator to manage members.</p>}
   >
     <InviteMemberForm />
   </Can>
   ```

---

## 5. UI Permission Patterns & Best Practices

1. **Hide vs. Disable:**
   - **Hide** actions that the user lacks permission to execute (e.g. hide "Delete Project" button for `MEMBER`).
   - **Disable** form fields in view-only modes (e.g. for `VIEWER` role).
2. **AI Tool Gating:**
   - AI Copilot input forms and AI Task Generation action buttons must be wrapped in `<Can permission={Permission.AI_COPILOT_QUERY}>` or `<Can permission={Permission.AI_ACTION_EXECUTE}>`.
3. **Workspace Settings Access:**
   - Navigation links to Workspace Settings and Member Management must be gated by `<Can permission={Permission.WORKSPACE_UPDATE}>` or `<Can permission={Permission.MEMBER_LIST}>`.

---

## 6. Unit Testing Strategy for UI Permissions (`client/src/features/workspaces/rbac-ui.test.tsx`)

UI permission behaviors are verified using React Testing Library.

### Test Coverage Checklist
- `<Can>` renders children when permission is granted.
- `<Can>` hides children when permission is denied.
- `<Can>` renders fallback node when permission is denied and fallback prop is provided.
- `usePermissions()` correctly identifies `isOwner`, `isAdmin`, `isMember`, and `isViewer`.
