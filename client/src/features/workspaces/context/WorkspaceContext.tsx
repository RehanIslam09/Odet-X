import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { setActiveWorkspaceSlug } from "@/services/axios";
import { useWorkspaces } from "../hooks/useWorkspaces";
import type { Workspace, WorkspaceRole } from "../types/workspace.types";

const LOCAL_STORAGE_WORKSPACE_KEY = "ai-pm:active-workspace-slug";

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentRole: WorkspaceRole | null;
  isLoading: boolean;
  isError: boolean;
  switchWorkspace: (workspaceSlug: string, subPath?: string) => void;
  getWorkspaceHref: (subPath: string) => string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { workspaceSlug } = useParams<{ workspaceSlug?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading, isError } = useWorkspaces();

  // 1. Resolve current workspace from URL slug or default preference
  const currentWorkspace = useMemo(() => {
    if (workspaces.length === 0) return null;

    if (workspaceSlug) {
      const match = workspaces.find((w) => w.slug.toLowerCase() === workspaceSlug.toLowerCase());
      if (match) return match;
    }

    // Fallback: Check localStorage preference or choose personal workspace / first workspace
    const savedSlug = localStorage.getItem(LOCAL_STORAGE_WORKSPACE_KEY);
    if (savedSlug) {
      const savedMatch = workspaces.find((w) => w.slug.toLowerCase() === savedSlug.toLowerCase());
      if (savedMatch) return savedMatch;
    }

    const personal = workspaces.find((w) => w.isPersonal);
    return personal || workspaces[0] || null;
  }, [workspaces, workspaceSlug]);

  const currentRole: WorkspaceRole | null = currentWorkspace?.role || null;

  // 2. Persist active workspace preference & update Axios request header state when resolved
  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem(LOCAL_STORAGE_WORKSPACE_KEY, currentWorkspace.slug);
      setActiveWorkspaceSlug(currentWorkspace.slug);
    }
  }, [currentWorkspace]);

  // 3. Switch workspace handler
  const switchWorkspace = (targetSlug: string, subPath: string = "dashboard") => {
    const targetWs = workspaces.find((w) => w.slug.toLowerCase() === targetSlug.toLowerCase());
    if (!targetWs) return;

    localStorage.setItem(LOCAL_STORAGE_WORKSPACE_KEY, targetWs.slug);
    setActiveWorkspaceSlug(targetWs.slug);

    // Completely clear query cache when switching workspace boundaries to prevent stale cross-tenant data rendering
    queryClient.clear();

    navigate(`/w/${targetWs.slug}/${subPath}`);
  };

  const getWorkspaceHref = (subPath: string): string => {
    const slug = currentWorkspace?.slug || workspaceSlug || "personal";
    const cleanSubPath = subPath.startsWith("/") ? subPath.slice(1) : subPath;
    return `/w/${slug}/${cleanSubPath}`;
  };

  const value = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      currentRole,
      isLoading,
      isError,
      switchWorkspace,
      getWorkspaceHref,
    }),
    [workspaces, currentWorkspace, currentRole, isLoading, isError, workspaceSlug],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useActiveWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useActiveWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
