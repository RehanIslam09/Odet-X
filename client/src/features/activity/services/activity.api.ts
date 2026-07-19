import { apiClient } from "@/services/axios";
import type { ActivityQueryDto, CursorPaginatedActivities } from "../types/activity.types";

export const activityApi = {
  getActivities: async (params?: ActivityQueryDto): Promise<CursorPaginatedActivities> => {
    const response = await apiClient.get<CursorPaginatedActivities>("/activities", { params });
    return response.data; // Response is already unwrapped by apiClient interceptor
  },
};
