import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/features/dashboard/services/dashboard.api";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import type { DashboardOverview } from "@/features/dashboard/types/dashboard.types";

export function useDashboardOverview() {
  return useQuery<DashboardOverview, Error>({
    queryKey: dashboardKeys.overview(),
    queryFn: dashboardApi.getOverview,
    // Provide a sensible stale time (1 minute) so navigating around doesn't 
    // constantly trigger dashboard recalculations unless mutations happen
    staleTime: 60 * 1000, 
  });
}
