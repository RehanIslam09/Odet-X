import { apiClient } from "@/services/axios";

import type {
  Task,
  TaskResponseData,
  TasksListResponseData,
  TasksQueryParams,
} from "@/features/tasks/types/tasks.types.js";

// ---------------------------------------------------------------------------
// Response Envelope Wrapper
// ---------------------------------------------------------------------------

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Tasks API Module
// ---------------------------------------------------------------------------
// All functions use the centralized apiClient — never raw axios.
// No component or hook should import axios directly.

/**
 * All task API endpoints.
 *
 * Responsibilities:
 * - Construct the HTTP request
 * - Return the typed response payload
 * - Throw on error (handled by TanStack Query)
 */
export const tasksApi = {
  /**
   * Fetch a paginated list of tasks for the authenticated user.
   */
  list: async (params?: TasksQueryParams): Promise<TasksListResponseData> => {
    const response = await apiClient.get<ApiResponse<TasksListResponseData>>(
      "/tasks",
      { params },
    );
    return response.data.data;
  },

  /**
   * Fetch a single task by ID.
   */
  getById: async (id: string): Promise<TaskResponseData> => {
    const response = await apiClient.get<ApiResponse<TaskResponseData>>(
      `/tasks/${id}`,
    );
    return response.data.data;
  },

  /**
   * Create a new task.
   */
  create: async (data: Partial<Task>): Promise<TaskResponseData> => {
    const response = await apiClient.post<ApiResponse<TaskResponseData>>(
      "/tasks",
      data,
    );
    return response.data.data;
  },

  /**
   * Partially update an existing task.
   */
  update: async (
    id: string,
    data: Partial<Task>,
  ): Promise<TaskResponseData> => {
    const response = await apiClient.patch<ApiResponse<TaskResponseData>>(
      `/tasks/${id}`,
      data,
    );
    return response.data.data;
  },

  /**
   * Toggle the archived state of a task.
   */
  archive: async (id: string): Promise<TaskResponseData> => {
    const response = await apiClient.post<ApiResponse<TaskResponseData>>(
      `/tasks/${id}/archive`,
    );
    return response.data.data;
  },

  /**
   * Soft-delete a task.
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
};
