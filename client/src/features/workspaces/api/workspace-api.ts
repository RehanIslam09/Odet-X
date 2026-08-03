import { apiClient } from "@/services/axios";
import type {
  AcceptInvitationResult,
  CreateInvitationInput,
  CreateWorkspaceInput,
  InvitationValidationDetails,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceDetails,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
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

/**
 * POST /api/v1/workspaces/:workspaceId/invitations
 * Sends an email invitation to join the workspace.
 */
export async function createInvitationApi(
  workspaceId: string,
  input: CreateInvitationInput,
): Promise<WorkspaceInvitation> {
  const res = await apiClient.post<ApiResponse<WorkspaceInvitation>>(
    `/workspaces/${workspaceId}/invitations`,
    input,
  );
  return res.data.data;
}

/**
 * GET /api/v1/workspaces/:workspaceId/invitations
 * Lists active pending invitations for a workspace.
 */
export async function fetchPendingInvitationsApi(
  workspaceId: string,
): Promise<WorkspaceInvitation[]> {
  const res = await apiClient.get<ApiResponse<WorkspaceInvitation[]>>(
    `/workspaces/${workspaceId}/invitations`,
  );
  return res.data.data;
}

/**
 * DELETE /api/v1/workspaces/:workspaceId/invitations/:invitationId
 * Revokes a pending workspace invitation.
 */
export async function revokeInvitationApi(
  workspaceId: string,
  invitationId: string,
): Promise<void> {
  await apiClient.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`);
}

/**
 * GET /api/v1/invitations/:token
 * Validates an invitation token (Public endpoint).
 */
export async function validateInvitationTokenApi(
  token: string,
): Promise<InvitationValidationDetails> {
  const res = await apiClient.get<ApiResponse<InvitationValidationDetails>>(
    `/invitations/${token}`,
  );
  return res.data.data;
}

/**
 * POST /api/v1/invitations/:token/accept
 * Accepts an invitation and joins the workspace.
 */
export async function acceptInvitationTokenApi(
  token: string,
): Promise<AcceptInvitationResult> {
  const res = await apiClient.post<ApiResponse<AcceptInvitationResult>>(
    `/invitations/${token}/accept`,
  );
  return res.data.data;
}

/**
 * PATCH /api/v1/workspaces/:workspaceId/members/:userId/role
 * Updates a member's role in the workspace.
 */
export async function updateMemberRoleApi(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<void> {
  await apiClient.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role });
}

/**
 * POST /api/v1/workspaces/:workspaceId/transfer-ownership
 * Transfers primary ownership of the workspace to another active member.
 */
export async function transferWorkspaceOwnershipApi(
  workspaceId: string,
  newOwnerUserId: string,
): Promise<void> {
  await apiClient.post(`/workspaces/${workspaceId}/transfer-ownership`, { newOwnerUserId });
}
