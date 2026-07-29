/**
 * Global Search API Client Module
 * Phase 31 — Global Search & Command Palette
 * WP-06 — Global Search UX & Result Navigation
 */

import { apiClient } from "@/services/axios.js";
import type {
  GlobalSearchResponseData,
  SearchQueryParams,
} from "../types/search.types.js";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const searchApi = {
  /**
   * Execute deterministic global entity search via GET /api/v1/search
   */
  globalSearch: async (
    params: SearchQueryParams,
    signal?: AbortSignal
  ): Promise<GlobalSearchResponseData> => {
    const response = await apiClient.get<ApiResponse<GlobalSearchResponseData>>(
      "/search",
      { params, signal }
    );
    return response.data.data;
  },
};
