import { Navigate, useLocation } from "react-router-dom";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { AppLoader } from "@/components/common";

const LOCAL_STORAGE_WORKSPACE_KEY = "ai-pm:active-workspace-slug";

export function DefaultWorkspaceRedirect() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const location = useLocation();

  if (isLoading) {
    return <AppLoader />;
  }

  // 1. Resolve default workspace slug
  const savedSlug = localStorage.getItem(LOCAL_STORAGE_WORKSPACE_KEY);
  const savedMatch = savedSlug ? workspaces.find((w) => w.slug.toLowerCase() === savedSlug.toLowerCase()) : null;
  const personal = workspaces.find((w) => w.isPersonal);

  const defaultSlug = savedMatch?.slug || personal?.slug || workspaces[0]?.slug || "personal";

  // 2. Preserve clean subPath
  const targetPath = location.pathname === "/" || location.pathname === "/dashboard"
    ? `/w/${defaultSlug}/dashboard`
    : `/w/${defaultSlug}${location.pathname}`;

  return <Navigate to={targetPath} replace />;
}
