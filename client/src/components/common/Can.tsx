import React from "react";
import { Permission } from "@/constants/permissions";
import { usePermissions } from "@/features/workspaces/hooks/usePermissions";

interface CanProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = usePermissions();

  if (can(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
