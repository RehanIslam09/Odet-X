import { apiClient } from "@/services/axios";

import type {
  CreateProjectMemoryDto,
  ListProjectMemoriesResponseData,
  ProjectMemory,
  ProjectMemoryQueryParams,
  ProjectMemoryResponseData,
  UpdateProjectMemoryDto,
} from "@/features/projects/types/project-memory.types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * All Project Memory API endpoints.
 *
 * Responsibilities:
 * - Construct HTTP requests
 * - Return unwrapped, typed response payload data
 * - Throw on error (Axios throws by default; caught by TanStack Query)
 */
export const projectMemoryApi = {
  /**
   * List memories for a project with optional pagination parameters.
   */
  list: async (
    projectId: string,
    params?: ProjectMemoryQueryParams,
  ): Promise<ListProjectMemoriesResponseData> => {
    const response = await apiClient.get<ApiResponse<ListProjectMemoriesResponseData>>(
      `/projects/${projectId}/memories`,
      { params },
    );
    return response.data.data;
  },

  /**
   * Create a new project memory.
   */
  create: async (
    projectId: string,
    data: CreateProjectMemoryDto,
  ): Promise<ProjectMemory> => {
    const response = await apiClient.post<ApiResponse<ProjectMemoryResponseData>>(
      `/projects/${projectId}/memories`,
      data,
    );
    return response.data.data.memory;
  },

  /**
   * Update an existing project memory enforcing OCC via expectedVersion.
   */
  update: async (
    projectId: string,
    memoryId: string,
    data: UpdateProjectMemoryDto,
  ): Promise<ProjectMemory> => {
    const response = await apiClient.patch<ApiResponse<ProjectMemoryResponseData>>(
      `/projects/${projectId}/memories/${memoryId}`,
      data,
    );
    return response.data.data.memory;
  },

  /**
   * Permanently hard-delete a project memory.
   */
  delete: async (projectId: string, memoryId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/memories/${memoryId}`);
  },
};
