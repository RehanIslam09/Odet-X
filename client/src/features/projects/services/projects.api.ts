import { apiClient } from "@/services/axios";

import type {
  CreateProjectDto,
  ProjectOption,
  ProjectResponseData,
  ProjectsListResponseData,
  ProjectsQueryParams,
  ProjectSummaryData,
  UpdateProjectDto,
} from "@/features/projects/types/projects.types";

// ---------------------------------------------------------------------------
// Response envelope wrapper
// ---------------------------------------------------------------------------

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Projects API Module
// ---------------------------------------------------------------------------
// All functions use the centralized apiClient — never raw axios.
// No component or hook should import axios directly.
//
// Mirror the authApi pattern exactly: a const object grouping all
// functions for the resource.

/**
 * All project API endpoints.
 *
 * Responsibilities:
 * - Construct the HTTP request
 * - Return the typed response payload
 * - Throw on error (Axios does this by default; caught by React Query)
 *
 * Responsibilities NOT here:
 * - Caching (React Query)
 * - State updates (Zustand)
 * - Toast notifications (hooks)
 */
export const projectsApi = {
  /**
   * Fetch a paginated list of projects for the authenticated user.
   */
  list: async (params?: ProjectsQueryParams): Promise<ProjectsListResponseData> => {
    const response = await apiClient.get<ApiResponse<ProjectsListResponseData>>(
      "/projects",
      { params },
    );
    return response.data.data;
  },

  /**
   * Fetch a single project by ID.
   */
  getById: async (id: string): Promise<ProjectResponseData> => {
    const response = await apiClient.get<ApiResponse<ProjectResponseData>>(
      `/projects/${id}`,
    );
    return response.data.data;
  },

  /**
   * Fetch a lightweight list of project options for dropdowns.
   */
  getOptions: async (): Promise<ProjectOption[]> => {
    const response = await apiClient.get<ApiResponse<{ items: ProjectOption[] }>>(
      "/projects/options",
    );
    return response.data.data.items;
  },

  /**
   * Fetch a project summary by ID.
   */
  getSummary: async (id: string): Promise<ProjectSummaryData> => {
    const response = await apiClient.get<ApiResponse<{ summary: ProjectSummaryData }>>(
      `/projects/${id}/summary`,
    );
    return response.data.data.summary;
  },

  /**
   * Create a new project.
   */
  create: async (data: CreateProjectDto): Promise<ProjectResponseData> => {
    const response = await apiClient.post<ApiResponse<ProjectResponseData>>(
      "/projects",
      data,
    );
    return response.data.data;
  },

  /**
   * Partially update an existing project.
   */
  update: async (
    id: string,
    data: UpdateProjectDto,
  ): Promise<ProjectResponseData> => {
    const response = await apiClient.patch<ApiResponse<ProjectResponseData>>(
      `/projects/${id}`,
      data,
    );
    return response.data.data;
  },

  /**
   * Toggle the archived state of a project.
   */
  archive: async (id: string): Promise<ProjectResponseData> => {
    const response = await apiClient.post<ApiResponse<ProjectResponseData>>(
      `/projects/${id}/archive`,
    );
    return response.data.data;
  },

  /**
   * Soft-delete a project. This action is irreversible from the UI.
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};
