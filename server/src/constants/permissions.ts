import { WorkspaceRole } from "@/constants/workspace.js";

/**
 * Domain Permission Taxonomy.
 *
 * Granular capability identifiers for Role-Based Access Control (RBAC).
 */
export enum Permission {
  // --- Workspace Administration ---
  WORKSPACE_UPDATE = "workspace:update",
  WORKSPACE_DELETE = "workspace:delete",
  WORKSPACE_SETTINGS_VIEW = "workspace:settings:view",

  // --- Member & Invitation Management ---
  MEMBER_LIST = "member:list",
  MEMBER_INVITE = "member:invite",
  MEMBER_ROLE_UPDATE = "member:role:update",
  MEMBER_REMOVE = "member:remove",

  // --- Project Domain ---
  PROJECT_CREATE = "project:create",
  PROJECT_READ = "project:read",
  PROJECT_UPDATE = "project:update",
  PROJECT_DELETE = "project:delete",
  PROJECT_ARCHIVE = "project:archive",

  // --- Task Domain ---
  TASK_CREATE = "task:create",
  TASK_READ = "task:read",
  TASK_UPDATE = "task:update",
  TASK_DELETE = "task:delete",
  TASK_ASSIGN = "task:assign",

  // --- Milestone Domain ---
  MILESTONE_CREATE = "milestone:create",
  MILESTONE_READ = "milestone:read",
  MILESTONE_UPDATE = "milestone:update",
  MILESTONE_DELETE = "milestone:delete",

  // --- AI & Intelligence Domain ---
  AI_COPILOT_QUERY = "ai:copilot:query",
  AI_ACTION_EXECUTE = "ai:action:execute",

  // --- Search & Dashboard Domain ---
  DASHBOARD_VIEW = "dashboard:view",
  SEARCH_EXECUTE = "search:execute",
  ACTIVITY_READ = "activity:read",
  NOTIFICATION_READ = "notification:read",
}

/**
 * Official Role -> Capabilities Mapping Matrix.
 *
 * Defines the baseline permissions granted to each WorkspaceRole.
 */
export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  OWNER: Object.values(Permission),

  ADMIN: [
    Permission.WORKSPACE_SETTINGS_VIEW,
    Permission.MEMBER_LIST,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_ROLE_UPDATE,
    Permission.MEMBER_REMOVE,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_ARCHIVE,
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_ASSIGN,
    Permission.MILESTONE_CREATE,
    Permission.MILESTONE_READ,
    Permission.MILESTONE_UPDATE,
    Permission.MILESTONE_DELETE,
    Permission.AI_COPILOT_QUERY,
    Permission.AI_ACTION_EXECUTE,
    Permission.DASHBOARD_VIEW,
    Permission.SEARCH_EXECUTE,
    Permission.ACTIVITY_READ,
    Permission.NOTIFICATION_READ,
  ],

  MEMBER: [
    Permission.WORKSPACE_SETTINGS_VIEW,
    Permission.MEMBER_LIST,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_ASSIGN,
    Permission.MILESTONE_CREATE,
    Permission.MILESTONE_READ,
    Permission.MILESTONE_UPDATE,
    Permission.AI_COPILOT_QUERY,
    Permission.AI_ACTION_EXECUTE,
    Permission.DASHBOARD_VIEW,
    Permission.SEARCH_EXECUTE,
    Permission.ACTIVITY_READ,
    Permission.NOTIFICATION_READ,
  ],

  VIEWER: [
    Permission.PROJECT_READ,
    Permission.TASK_READ,
    Permission.MILESTONE_READ,
    Permission.DASHBOARD_VIEW,
    Permission.SEARCH_EXECUTE,
    Permission.ACTIVITY_READ,
    Permission.NOTIFICATION_READ,
  ],
};
