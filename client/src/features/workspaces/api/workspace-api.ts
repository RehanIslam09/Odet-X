import { apiClient } from "@/services/axios";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceDetails,
  WorkspaceMember,
} from "../types/workspace.types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * GET /api/v1/workspaces
 * Retrieves all workspaces the authenticated user belongs to.
 */
export async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await apiClient.get<ApiResponse<Workspace[]>>("/workspaces");
  return res.data.data;
}

/**
 * GET /api/v1/workspaces/:workspaceId
 * Retrieves detailed workspace information and member roster.
 */
export async function fetchWorkspaceDetails(workspaceId: string): Promise<WorkspaceDetails> {
  const res = await apiClient.get<ApiResponse<WorkspaceDetails>>(`/workspaces/${workspaceId}`);
  return res.data.data;
}

/**
 * POST /api/v1/workspaces
 * Creates a new custom non-personal workspace.
 */
export async function createWorkspaceApi(input: CreateWorkspaceInput): Promise<Workspace> {
  const res = await apiClient.post<ApiResponse<Workspace>>("/workspaces", input);
  return res.data.data;
}

/**
 * PATCH /api/v1/workspaces/:workspaceId
 * Updates name or slug of a custom workspace.
 */
export async function updateWorkspaceApi(
  workspaceId: string,
  input: UpdateWorkspaceInput,
): Promise<Workspace> {
  const res = await apiClient.patch<ApiResponse<Workspace>>(`/workspaces/${workspaceId}`, input);
  return res.data.data;
}

/**
 * DELETE /api/v1/workspaces/:workspaceId
 * Deletes an empty custom workspace.
 */
export async function deleteWorkspaceApi(workspaceId: string): Promise<void> {
  await apiClient.delete(`/workspaces/${workspaceId}`);
}

/**
 * GET /api/v1/workspaces/:workspaceId/members
 * Lists active members in a workspace.
 */
export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const res = await apiClient.get<ApiResponse<WorkspaceMember[]>>(`/workspaces/${workspaceId}/members`);
  return res.data.data;
}

/**
 * DELETE /api/v1/workspaces/:workspaceId/members/:userId
 * Removes a member or self-leaves a workspace.
 */
export async function removeWorkspaceMemberApi(
  workspaceId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
}
