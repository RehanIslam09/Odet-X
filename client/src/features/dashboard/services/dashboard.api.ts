import { apiClient } from "@/services/axios";
import type { DashboardOverview } from "@/features/dashboard/types/dashboard.types";

export const dashboardApi = {
  /**
   * Fetches the complete dashboard analytics overview.
   */
  getOverview: async (): Promise<DashboardOverview> => {
    const { data } = await apiClient.get<{ data: DashboardOverview }>(
      "/dashboard/overview",
    );
    return data.data; // Unwrap the ApiResponse envelope
  },
};
