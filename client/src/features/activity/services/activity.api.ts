import { apiClient } from "@/services/axios";
import type { ActivityQueryDto, CursorPaginatedActivities } from "../types/activity.types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const activityApi = {
  getActivities: async (params?: ActivityQueryDto): Promise<CursorPaginatedActivities> => {
    const response = await apiClient.get<ApiResponse<CursorPaginatedActivities>>("/activities", { params });
    return response.data.data;
  },
};
