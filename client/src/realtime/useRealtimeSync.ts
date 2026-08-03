import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  const { currentWorkspace } = useActiveWorkspace();
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

  // 3. Reconnect Recovery Listener: Invalidate active queries when socket reconnects
  useEffect(() => {
    if (!activeWorkspaceId) return;

    let wasDisconnected = false;

    const unsubscribeStatus = realtimeClient.onStatusChange((status) => {
      if (status === "reconnecting" || status === "offline") {
        wasDisconnected = true;
      } else if (status === "connected" && wasDisconnected) {
        wasDisconnected = false;
        // Reconnect recovery: Invalidate active workspace queries only
        queryClient.invalidateQueries({
          predicate: (query) => query.isActive(),
        });
      }
    });

    return () => {
      unsubscribeStatus();
    };
  }, [activeWorkspaceId, queryClient]);
}
