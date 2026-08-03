import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext";
import { useAuthStore } from "@/store/auth.store";
import { realtimeClient } from "./realtime-client";
import {
  RealtimeContext,
  type RealtimeContextValue,
  type RealtimeStatus,
} from "./RealtimeContext";
import { useRealtimeSync } from "./useRealtimeSync";

interface RealtimeProviderProps {
  children: React.ReactNode;
}

/**
 * Realtime Provider Component.
 *
 * Placed inside `<WorkspaceProvider>` in `DashboardLayout`.
 * Owns connection state machine, mounts subscription lifecycle via `useRealtimeSync`,
 * handles workspace eviction, and exposes context to child components.
 */
export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [status, setStatus] = useState<RealtimeStatus>(() =>
    realtimeClient.getStatus(),
  );
  const { currentWorkspace, workspaces, switchWorkspace } = useActiveWorkspace();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const activeWorkspaceId = currentWorkspace?.id || null;

  // Mount realtime lifecycle (event router, subscriptions, domain sync)
  useRealtimeSync();

  // 1. Subscribe to RealtimeClient status machine updates
  useEffect(() => {
    const unsubscribeStatus = realtimeClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    return () => {
      unsubscribeStatus();
    };
  }, []);

  // 2. Handle Workspace Eviction Event
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const unsubscribeEvicted = realtimeClient.onEvicted((payload) => {
      if (payload.workspaceId === activeWorkspaceId) {
        realtimeClient.disconnect();
        queryClient.clear();

        const fallbackWs =
          workspaces.find((w) => w.id !== activeWorkspaceId && w.isPersonal) ||
          workspaces.find((w) => w.id !== activeWorkspaceId);

        if (fallbackWs) {
          switchWorkspace(fallbackWs.slug);
        } else {
          window.location.href = "/";
        }
      }
    });

    return () => {
      unsubscribeEvicted();
    };
  }, [activeWorkspaceId, workspaces, switchWorkspace, queryClient]);

  const connect = useCallback(() => {
    if (isAuthenticated) {
      realtimeClient.connect();
      if (activeWorkspaceId) {
        realtimeClient.subscribeWorkspace(activeWorkspaceId);
      }
    }
  }, [isAuthenticated, activeWorkspaceId]);

  const disconnect = useCallback(() => {
    realtimeClient.disconnect();
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      status,
      connected: status === "connected",
      reconnecting: status === "reconnecting",
      connect,
      disconnect,
    }),
    [status, connect, disconnect],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
