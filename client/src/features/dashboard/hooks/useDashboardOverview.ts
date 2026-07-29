import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/features/dashboard/services/dashboard.api";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext";
import type { DashboardOverview } from "@/features/dashboard/types/dashboard.types";

/**
 * Phase 32: Fetches the workspace-scoped dashboard overview.
 *
 * The query key includes the active workspace ID so TanStack Query cache is
 * fully isolated per workspace — switching workspaces fetches a fresh response
 * and never serves another workspace's cached data.
 */
export function useDashboardOverview() {
  const { currentWorkspace } = useActiveWorkspace();
  const workspaceId = currentWorkspace?.id ?? "";

  return useQuery<DashboardOverview, Error>({
    queryKey: dashboardKeys.overview(workspaceId),
    queryFn: dashboardApi.getOverview,
    // Only fetch when we have a resolved workspace
    enabled: !!workspaceId,
    // Provide a sensible stale time (1 minute) so navigating around doesn't
    // constantly trigger dashboard recalculations unless mutations happen
    staleTime: 60 * 1000,
  });
}
