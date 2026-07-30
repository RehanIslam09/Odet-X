import { useMemo } from "react";
import { Permission, ROLE_PERMISSIONS } from "@/constants/permissions";
import { useActiveWorkspace } from "../context/WorkspaceContext";
import type { WorkspaceRole } from "../types/workspace.types";

export interface PermissionsHookResult {
  role: WorkspaceRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
  can: (permission: Permission) => boolean;
  cannot: (permission: Permission) => boolean;
  hasRole: (allowedRoles: WorkspaceRole | WorkspaceRole[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
}

export function usePermissions(): PermissionsHookResult {
  const { currentRole: role } = useActiveWorkspace();

  const permissionsSet = useMemo(() => {
    if (!role || !ROLE_PERMISSIONS[role]) return new Set<Permission>();
    return new Set<Permission>(ROLE_PERMISSIONS[role]);
  }, [role]);

  const can = (permission: Permission): boolean => {
    return permissionsSet.has(permission);
  };

  const cannot = (permission: Permission): boolean => {
    return !can(permission);
  };

  const hasRole = (allowedRoles: WorkspaceRole | WorkspaceRole[]): boolean => {
    if (!role) return false;
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(role);
    }
    return role === allowedRoles;
  };

  return {
    role,
    isOwner: role === "OWNER",
    isAdmin: role === "ADMIN",
    isMember: role === "MEMBER",
    isViewer: role === "VIEWER",
    can,
    cannot,
    hasRole,
    hasPermission: can,
  };
}
