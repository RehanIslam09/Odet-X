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
  QueryCopilotDto,
  CopilotResultData,
  ActionDryRunDto,
  ActionDryRunResultData,
  ActionConfirmDto,
  ActionConfirmResultData,
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

  getActivePlanDraft: async (
    projectId: string,
  ): Promise<PlanDraft | null> => {
    const response = await apiClient.get<ApiResponse<PlanDraft | null>>(
      `/projects/${projectId}/plans/active`,
    );
    return response.data.data;
  },

  getPlanDraft: async (
    projectId: string,
    draftId: string,
  ): Promise<PlanDraft> => {
    const response = await apiClient.get<ApiResponse<PlanDraft>>(
      `/projects/${projectId}/plans/${draftId}`,
    );
    return response.data.data;
  },

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

  discardPlanDraft: async (
    projectId: string,
    draftId: string,
  ): Promise<PlanDraft> => {
    const response = await apiClient.delete<ApiResponse<PlanDraft>>(
      `/projects/${projectId}/plans/${draftId}`,
    );
    return response.data.data;
  },

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

  // ---------------------------------------------------------------------------
  // Phase 27 Read-Only Project Copilot Endpoint
  // ---------------------------------------------------------------------------

  queryCopilot: async (
    projectId: string,
    data: QueryCopilotDto,
  ): Promise<CopilotResultData> => {
    const response = await apiClient.post<ApiResponse<CopilotResultData>>(
      `/projects/${projectId}/copilot`,
      data,
    );
    return response.data.data;
  },

  // ---------------------------------------------------------------------------
  // Phase 28 Controlled Action Endpoints
  // ---------------------------------------------------------------------------

  /**
   * Computes a state diff (Before vs After) for a proposed action without mutating database state.
   * Calls POST /copilot/actions/dry-run
   */
  dryRunAction: async (
    data: ActionDryRunDto,
  ): Promise<ActionDryRunResultData> => {
    const response = await apiClient.post<ApiResponse<ActionDryRunResultData>>(
      "/copilot/actions/dry-run",
      data,
    );
    return response.data.data;
  },

  /**
   * Confirms and executes an AI action using a signed confirmation token.
   * Calls POST /copilot/actions/confirm
   */
  confirmAction: async (
    data: ActionConfirmDto,
  ): Promise<ActionConfirmResultData> => {
    const response = await apiClient.post<ApiResponse<ActionConfirmResultData>>(
      "/copilot/actions/confirm",
      data,
    );
    return response.data.data;
  },
};
