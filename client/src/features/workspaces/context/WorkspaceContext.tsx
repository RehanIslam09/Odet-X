/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaces } from "../hooks/useWorkspaces.js";
import type { Workspace, WorkspaceRole } from "../types/workspace.types.js";
import { setActiveWorkspaceSlug } from "@/services/axios.js";

const ACTIVE_WORKSPACE_KEY = "ai_pm_active_workspace";

export interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  activeWorkspaceId: string | null;
  activeWorkspaceSlug: string | null;
  currentRole: WorkspaceRole | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  switchWorkspace: (workspaceIdOrSlug: string) => Promise<boolean>;
  getWorkspaceHref: (subpath: string) => string;
  refetchWorkspaces: () => void;
}

export interface UseActiveWorkspaceResult {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  activeWorkspaceId?: string | null;
  activeWorkspaceSlug?: string | null;
  currentRole?: WorkspaceRole | null;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  switchWorkspace: (workspaceIdOrSlug: string) => Promise<boolean>;
  getWorkspaceHref: (subpath: string) => string;
  refetchWorkspaces?: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: workspaces = [], isLoading, isError, error, refetch } = useWorkspaces();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ workspaceSlug?: string }>();
  const queryClient = useQueryClient();

  const [explicitSelectedSlug, setExplicitSelectedSlug] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || null;
  });

  // Extract current workspace slug from URL if inside /w/:workspaceSlug route
  const urlWorkspaceSlug = useMemo(() => {
    if (params.workspaceSlug) return params.workspaceSlug;
    const match = location.pathname.match(/^\/w\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname, params.workspaceSlug]);

  // Determine effective current active workspace object
  const currentWorkspace = useMemo(() => {
    if (!workspaces || workspaces.length === 0) return null;

    // 1. Try URL slug first if valid
    if (urlWorkspaceSlug) {
      const matchByUrl = workspaces.find((w) => w.slug === urlWorkspaceSlug);
      if (matchByUrl) return matchByUrl;
    }

    // 2. Try explicitly selected slug state next
    if (explicitSelectedSlug) {
      const matchByState = workspaces.find(
        (w) => w.slug === explicitSelectedSlug || w.id === explicitSelectedSlug
      );
      if (matchByState) return matchByState;
    }

    // 3. Fallback: Default Personal Workspace (isPersonal === true), or first available workspace
    const defaultPersonal = workspaces.find((w) => w.isPersonal);
    if (defaultPersonal) return defaultPersonal;

    return workspaces[0] || null;
  }, [workspaces, urlWorkspaceSlug, explicitSelectedSlug]);

  // Derived role
  const currentRole = useMemo<WorkspaceRole | null>(() => {
    if (!currentWorkspace) return null;
    if (currentWorkspace.role) return currentWorkspace.role;
    return currentWorkspace.isPersonal ? "OWNER" : "MEMBER";
  }, [currentWorkspace]);

  // Synchronize localStorage & Axios header side-effect when active workspace is resolved
  useEffect(() => {
    if (currentWorkspace?.slug) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, currentWorkspace.slug);
      setActiveWorkspaceSlug(currentWorkspace.slug);
    } else {
      setActiveWorkspaceSlug(null);
    }
  }, [currentWorkspace?.slug]);

  // Synchronize explicitSelectedSlug during render when URL slug changes to a valid workspace (e.g. browser history navigation)
  const [prevUrlSlug, setPrevUrlSlug] = useState<string | null>(null);
  if (urlWorkspaceSlug !== prevUrlSlug) {
    setPrevUrlSlug(urlWorkspaceSlug);
    if (urlWorkspaceSlug && workspaces.some((w) => w.slug === urlWorkspaceSlug)) {
      setExplicitSelectedSlug(urlWorkspaceSlug);
    }
  }

  // Gracefully recover if user navigates directly to an invalid /w/:workspaceSlug route
  useEffect(() => {
    if (!isLoading && workspaces.length > 0 && urlWorkspaceSlug) {
      const isValidSlug = workspaces.some((w) => w.slug === urlWorkspaceSlug);
      if (!isValidSlug && currentWorkspace?.slug) {
        const subpathMatch = location.pathname.match(/^\/w\/[^/]+(\/.*)?$/);
        const subpath = subpathMatch && subpathMatch[1] ? subpathMatch[1] : "/dashboard";
        navigate(`/w/${currentWorkspace.slug}${subpath}`, { replace: true });
      }
    }
  }, [isLoading, workspaces, urlWorkspaceSlug, currentWorkspace?.slug, location.pathname, navigate]);

  // Helper to resolve workspace subpath URL
  const getWorkspaceHref = useCallback(
    (subpath: string): string => {
      const slug = currentWorkspace?.slug || "personal";
      const cleanSubpath = subpath.startsWith("/") ? subpath : `/${subpath}`;
      return `/w/${slug}${cleanSubpath}`;
    },
    [currentWorkspace?.slug]
  );

  // Workspace Switching Mechanics
  const switchWorkspace = useCallback(
    async (workspaceIdOrSlug: string): Promise<boolean> => {
      const targetWorkspace = workspaces.find(
        (w) => w.id === workspaceIdOrSlug || w.slug === workspaceIdOrSlug
      );

      if (!targetWorkspace) {
        console.warn(`[WorkspaceContext] Workspace not found: ${workspaceIdOrSlug}`);
        return false;
      }

      // If switching to the currently active workspace, no-op
      if (currentWorkspace?.id === targetWorkspace.id) {
        return true;
      }

      // 1. Update Context & Persistence
      setExplicitSelectedSlug(targetWorkspace.slug);
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, targetWorkspace.slug);
      setActiveWorkspaceSlug(targetWorkspace.slug);

      // 2. Derive next URL (preserve subpath e.g. /projects, /tasks, /settings if applicable)
      const subpathMatch = location.pathname.match(/^\/w\/[^/]+(\/.*)?$/);
      let targetSubpath = subpathMatch && subpathMatch[1] ? subpathMatch[1] : "/dashboard";
      if (targetSubpath === "/" || targetSubpath === "") {
        targetSubpath = "/dashboard";
      }

      const targetUrl = `/w/${targetWorkspace.slug}${targetSubpath}`;

      // 3. Clear tenant cache to guarantee zero cross-tenant query data leakage
      queryClient.clear();

      // 4. Navigate to new route without full page refresh
      navigate(targetUrl, { replace: false });

      return true;
    },
    [workspaces, currentWorkspace, location.pathname, navigate, queryClient]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      currentWorkspace,
      activeWorkspaceId: currentWorkspace?.id || null,
      activeWorkspaceSlug: currentWorkspace?.slug || null,
      currentRole,
      isLoading,
      isError,
      error: (error as Error) || null,
      switchWorkspace,
      getWorkspaceHref,
      refetchWorkspaces: refetch,
    }),
    [workspaces, currentWorkspace, currentRole, isLoading, isError, error, switchWorkspace, getWorkspaceHref, refetch]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspaceContext must be used within a WorkspaceProvider");
  }
  return context;
}

export function useActiveWorkspace(): UseActiveWorkspaceResult {
  const context = useContext(WorkspaceContext);
  const currentWs = context?.currentWorkspace || null;

  return {
    workspaces: context?.workspaces || [],
    currentWorkspace: currentWs,
    activeWorkspaceId: context?.activeWorkspaceId ?? (currentWs?.id || null),
    activeWorkspaceSlug: context?.activeWorkspaceSlug ?? (currentWs?.slug || null),
    currentRole: context?.currentRole ?? (currentWs?.role || (currentWs?.isPersonal ? "OWNER" : "MEMBER")),
    isLoading: context?.isLoading ?? false,
    isError: context?.isError ?? false,
    error: context?.error ?? null,
    switchWorkspace: context?.switchWorkspace || (async () => false),
    getWorkspaceHref:
      context?.getWorkspaceHref ||
      ((sub: string) => `/w/${currentWs?.slug || "personal"}${sub.startsWith("/") ? sub : `/${sub}`}`),
    refetchWorkspaces: context?.refetchWorkspaces || (() => {}),
  };
}
