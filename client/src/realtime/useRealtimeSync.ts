import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext";
import { useAuthStore } from "@/store/auth.store";
import { realtimeClient } from "./realtime-client";
import { routeDomainEvent } from "./event-router";

/**
 * Hook that integrates the RealtimeClient transport manager with
 * WorkspaceContext, AuthStore, and TanStack Query.
 */
export function useRealtimeSync(): void {
  const queryClient = useQueryClient();
  const { currentWorkspace, workspaces, switchWorkspace } = useActiveWorkspace();
  const { isAuthenticated } = useAuthStore();

  const activeWorkspaceId = currentWorkspace?.id || null;

  // 1. Authenticated socket connection & active workspace subscription lifecycle
  useEffect(() => {
    if (!isAuthenticated) {
      realtimeClient.disconnect();
      return;
    }

    if (activeWorkspaceId) {
      realtimeClient.subscribeWorkspace(activeWorkspaceId);
    }
  }, [isAuthenticated, activeWorkspaceId]);

  // 2. Event Routing & Invalidation Listener
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const unsubscribeEvents = realtimeClient.onDomainEvent((event) => {
      routeDomainEvent(event, queryClient, activeWorkspaceId);
    });

    return () => {
      unsubscribeEvents();
    };
  }, [activeWorkspaceId, queryClient]);

  // 3. Workspace Eviction Listener
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const unsubscribeEvicted = realtimeClient.onEvicted((payload) => {
      if (payload.workspaceId === activeWorkspaceId) {
        toast.error("Your access to this workspace was revoked.");

        // Clear query cache to prevent cross-tenant stale data rendering
        queryClient.clear();

        // Select fallback workspace (personal workspace or first available workspace)
        const fallbackWs =
          workspaces.find((w) => w.id !== activeWorkspaceId && w.isPersonal) ||
          workspaces.find((w) => w.id !== activeWorkspaceId);

        if (fallbackWs) {
          switchWorkspace(fallbackWs.slug);
        } else {
          // If no fallback workspace, navigate to root
          window.location.href = "/";
        }
      }
    });

    return () => {
      unsubscribeEvicted();
    };
  }, [activeWorkspaceId, workspaces, switchWorkspace, queryClient]);
}
