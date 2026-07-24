import { apiClient } from "@/services/axios";
import type {
  GenerateLabelsResponseData,
  GenerateSummaryResponseData,
  GenerateTasksDto,
  GenerateTasksResponseData,
} from "@/features/ai/types/ai.types";

// ---------------------------------------------------------------------------
// Response Envelope Wrapper
// ---------------------------------------------------------------------------

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ---------------------------------------------------------------------------
// AI API Module
// ---------------------------------------------------------------------------
// All functions use the centralized apiClient — never raw axios or fetch.
// Follows the authApi, projectsApi, and tasksApi resource object pattern.

/**
 * All AI endpoint bindings.
 *
 * Responsibilities:
 * - Construct HTTP requests for backend AI routes
 * - Pass typed payloads and extract typed response envelopes
 * - Delegate error handling & token authorization to centralized apiClient
 */
export const aiApi = {
  /**
   * Generates tasks for a project based on a prompt description.
   * Calls POST /projects/:projectId/generate-tasks
   */
  generateTasks: async (
    projectId: string,
    data: GenerateTasksDto,
  ): Promise<GenerateTasksResponseData> => {
    const response = await apiClient.post<ApiResponse<GenerateTasksResponseData>>(
      `/projects/${projectId}/generate-tasks`,
      data,
    );
    return response.data.data;
  },

  /**
   * Generates an AI summary (summary, highlights, risks) for a project.
   * Calls POST /projects/:projectId/generate-summary
   */
  generateSummary: async (
    projectId: string,
  ): Promise<GenerateSummaryResponseData> => {
    const response = await apiClient.post<ApiResponse<GenerateSummaryResponseData>>(
      `/projects/${projectId}/generate-summary`,
      {},
    );
    return response.data.data;
  },

  /**
   * Auto-generates and applies AI labels to a task.
   * Calls POST /tasks/:taskId/generate-labels
   */
  generateLabels: async (
    taskId: string,
  ): Promise<GenerateLabelsResponseData> => {
    const response = await apiClient.post<ApiResponse<GenerateLabelsResponseData>>(
      `/tasks/${taskId}/generate-labels`,
      {},
    );
    return response.data.data;
  },
};
