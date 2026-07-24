import { apiClient } from "@/services/axios";
import type {
  GenerateLabelsResponseData,
  GenerateSummaryResponseData,
  GenerateTasksDto,
  GenerateTasksResponseData,
  GeneratePlanDto,
  PlanDraft,
  UpdatePlanDraftDto,
  CommitPlanResultData,
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
 * All AI and Planning endpoint bindings.
 *
 * Responsibilities:
 * - Construct HTTP requests for backend AI and Planning routes
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

  // ---------------------------------------------------------------------------
  // Phase 25 Planning Engine Endpoints
  // ---------------------------------------------------------------------------

  /**
   * Generates an AI project plan draft.
   * Calls POST /projects/:projectId/plans
   */
  generatePlan: async (
    projectId: string,
    data: GeneratePlanDto,
  ): Promise<PlanDraft> => {
    const response = await apiClient.post<ApiResponse<PlanDraft>>(
      `/projects/${projectId}/plans`,
      data,
    );
    return response.data.data;
  },

  /**
   * Retrieves the active uncommitted plan draft for a project, or null if none exists.
   * Calls GET /projects/:projectId/plans/active
   */
  getActivePlanDraft: async (
    projectId: string,
  ): Promise<PlanDraft | null> => {
    const response = await apiClient.get<ApiResponse<PlanDraft | null>>(
      `/projects/${projectId}/plans/active`,
    );
    return response.data.data;
  },

  /**
   * Retrieves a persisted plan draft by ID.
   * Calls GET /projects/:projectId/plans/:draftId
   */
  getPlanDraft: async (
    projectId: string,
    draftId: string,
  ): Promise<PlanDraft> => {
    const response = await apiClient.get<ApiResponse<PlanDraft>>(
      `/projects/${projectId}/plans/${draftId}`,
    );
    return response.data.data;
  },

  /**
   * Updates an uncommitted plan draft.
   * Calls PATCH /projects/:projectId/plans/:draftId
   */
  updatePlanDraft: async (
    projectId: string,
    draftId: string,
    data: UpdatePlanDraftDto,
  ): Promise<PlanDraft> => {
    const response = await apiClient.patch<ApiResponse<PlanDraft>>(
      `/projects/${projectId}/plans/${draftId}`,
      data,
    );
    return response.data.data;
  },

  /**
   * Discards an uncommitted plan draft.
   * Calls DELETE /projects/:projectId/plans/:draftId
   */
  discardPlanDraft: async (
    projectId: string,
    draftId: string,
  ): Promise<PlanDraft> => {
    const response = await apiClient.delete<ApiResponse<PlanDraft>>(
      `/projects/${projectId}/plans/${draftId}`,
    );
    return response.data.data;
  },

  /**
   * Commits a plan draft into permanent Tasks and Milestones.
   * Calls POST /projects/:projectId/plans/:draftId/commit
   */
  commitPlan: async (
    projectId: string,
    draftId: string,
  ): Promise<CommitPlanResultData> => {
    const response = await apiClient.post<ApiResponse<CommitPlanResultData>>(
      `/projects/${projectId}/plans/${draftId}/commit`,
      {},
    );
    return response.data.data;
  },
};
