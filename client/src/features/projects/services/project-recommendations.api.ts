import { apiClient } from "@/services/axios";
import type {
  PaginatedRecommendationsResponse,
  ProjectRecommendation,
  RecommendationQueryParams,
} from "@/features/projects/types/project-recommendations.types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Frontend API client for Phase 30 Proactive Recommendations.
 *
 * Responsibilities:
 * - Make typed HTTP calls to WP-06 REST API endpoints.
 * - Unwrap `data` response objects.
 * - Handle errors (Axios throws on 4xx/5xx by default).
 */
export const projectRecommendationsApi = {
  /**
   * List workspace-wide active/historical recommendations.
   */
  listWorkspace: async (
    params?: RecommendationQueryParams,
  ): Promise<PaginatedRecommendationsResponse> => {
    const response = await apiClient.get<ApiResponse<PaginatedRecommendationsResponse>>(
      "/recommendations",
      { params },
    );
    return response.data.data;
  },

  /**
   * List recommendations scoped to a single project.
   */
  listProject: async (
    projectId: string,
    params?: RecommendationQueryParams,
  ): Promise<PaginatedRecommendationsResponse> => {
    const response = await apiClient.get<ApiResponse<PaginatedRecommendationsResponse>>(
      `/projects/${projectId}/recommendations`,
      { params },
    );
    return response.data.data;
  },

  /**
   * Dismiss an ACTIVE recommendation.
   */
  dismiss: async (
    recommendationId: string,
    projectId?: string,
  ): Promise<ProjectRecommendation> => {
    const url = projectId
      ? `/projects/${projectId}/recommendations/${recommendationId}/dismiss`
      : `/recommendations/${recommendationId}/dismiss`;

    const response = await apiClient.patch<ApiResponse<{ recommendation: ProjectRecommendation }>>(
      url,
    );
    return response.data.data.recommendation;
  },
};
