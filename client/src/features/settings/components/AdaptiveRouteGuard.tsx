import React from "react";
import { Navigate } from "react-router-dom";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

interface AdaptiveRouteGuardProps {
  children: React.ReactNode;
  allowedTypes?: Array<"PERSONAL" | "TEAM">;
}

/**
 * Route protection guard for settings pages.
 * Gracefully redirects Personal Workspace users attempting to access Team-only settings
 * (e.g. /settings/members, /settings/realtime) back to /settings/general.
 */
export function AdaptiveRouteGuard({ children, allowedTypes = ["TEAM"] }: AdaptiveRouteGuardProps) {
  const { currentWorkspace } = useActiveWorkspace();

  const isPersonal = currentWorkspace?.type === "PERSONAL" || currentWorkspace?.isPersonal === true;
  const currentType: "PERSONAL" | "TEAM" = isPersonal ? "PERSONAL" : "TEAM";

  if (!allowedTypes.includes(currentType)) {
    const slug = currentWorkspace?.slug || "personal";
    return <Navigate to={`/w/${slug}/settings/general`} replace />;
  }

  return <>{children}</>;
}
