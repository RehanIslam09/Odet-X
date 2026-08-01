import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { realtimeClient } from "./realtime-client";
import type { PresenceUser, ResourceViewing } from "./realtime-types";

export interface UsePresenceAwarenessResult {
  presenceUsers: PresenceUser[];
  activeViewingUsers: PresenceUser[];
  setViewingResource: (viewing: ResourceViewing | null) => void;
}

/**
 * Hook for consuming ephemeral workspace presence state and managing resource viewing awareness.
 */
export function usePresenceAwareness(): UsePresenceAwarenessResult {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>(() => {
    return realtimeClient.getCurrentPresence()?.users || [];
  });

  const { projectId, taskId } = useParams<{ projectId?: string; taskId?: string }>();

  // 1. Subscribe to ephemeral workspace presence snapshot updates
  useEffect(() => {
    const unsubscribe = realtimeClient.onPresenceChange((snapshot) => {
      setPresenceUsers(snapshot.users || []);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Automatic route-derived resource viewing awareness integration
  useEffect(() => {
    if (taskId) {
      realtimeClient.setViewingResource({
        resourceType: "task",
        resourceId: taskId,
      });
    } else if (projectId) {
      realtimeClient.setViewingResource({
        resourceType: "project",
        resourceId: projectId,
      });
    } else {
      realtimeClient.setViewingResource(null);
    }
  }, [projectId, taskId]);

  // Derived list of collaborators currently viewing the active resource
  const activeResourceId = taskId || projectId || null;
  const activeViewingUsers = activeResourceId
    ? presenceUsers.filter(
        (u) => u.viewing && u.viewing.resourceId === activeResourceId,
      )
    : [];

  return {
    presenceUsers,
    activeViewingUsers,
    setViewingResource: (viewing) => realtimeClient.setViewingResource(viewing),
  };
}
