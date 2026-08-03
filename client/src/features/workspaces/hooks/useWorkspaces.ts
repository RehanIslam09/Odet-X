import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvitationTokenApi,
  createInvitationApi,
  createWorkspaceApi,
  deleteWorkspaceApi,
  fetchPendingInvitationsApi,
  fetchWorkspaceDetails,
  fetchWorkspaceMembers,
  fetchWorkspaces,
  removeWorkspaceMemberApi,
  revokeInvitationApi,
  transferWorkspaceOwnershipApi,
  updateMemberRoleApi,
  updateWorkspaceApi,
  validateInvitationTokenApi,
} from "../api/workspace-api";
import type {
  CreateInvitationInput,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceRole,
} from "../types/workspace.types";

/**
 * Query key factory for all workspace server state.
 */
export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
  detail: (id: string) => [...workspaceKeys.all, "detail", id] as const,
  members: (id: string) => [...workspaceKeys.all, "members", id] as const,
  invitations: (id: string) => [...workspaceKeys.all, "invitations", id] as const,
  invitationToken: (token: string) => ["invitations", "token", token] as const,
};

/**
 * Hook to retrieve the list of all workspaces accessible to the user.
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: fetchWorkspaces,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Hook to retrieve details and members for a specific workspace.
 */
export function useWorkspaceDetails(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId || ""),
    queryFn: () => fetchWorkspaceDetails(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

/**
 * Hook to retrieve workspace member roster.
 */
export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId || ""),
    queryFn: () => fetchWorkspaceMembers(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

/**
 * Hook to retrieve pending invitations for a workspace.
 */
export function usePendingInvitations(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.invitations(workspaceId || ""),
    queryFn: () => fetchPendingInvitationsApi(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

/**
 * Hook to validate an invitation token (Public page).
 */
export function useValidateInvitation(token: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.invitationToken(token || ""),
    queryFn: () => validateInvitationTokenApi(token!),
    enabled: Boolean(token),
    retry: false,
  });
}

/**
 * Hook to create a new custom workspace.
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => createWorkspaceApi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

/**
 * Hook to update a custom workspace.
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, input }: { workspaceId: string; input: UpdateWorkspaceInput }) =>
      updateWorkspaceApi(workspaceId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.workspaceId) });
    },
  });
}

/**
 * Hook to delete a custom workspace.
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => deleteWorkspaceApi(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

/**
 * Hook to remove a member or self-leave from a workspace.
 */
export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      removeWorkspaceMemberApi(workspaceId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

/**
 * Hook to send a workspace invitation email.
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      input,
    }: {
      workspaceId: string;
      input: CreateInvitationInput;
    }) => createInvitationApi(workspaceId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.invitations(variables.workspaceId),
      });
    },
  });
}

/**
 * Hook to revoke a pending invitation.
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      invitationId,
    }: {
      workspaceId: string;
      invitationId: string;
    }) => revokeInvitationApi(workspaceId, invitationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.invitations(variables.workspaceId),
      });
    },
  });
}

/**
 * Hook to accept an invitation token and join a workspace.
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => acceptInvitationTokenApi(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

/**
 * Hook to update a workspace member's role.
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      userId,
      role,
    }: {
      workspaceId: string;
      userId: string;
      role: WorkspaceRole;
    }) => updateMemberRoleApi(workspaceId, userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.workspaceId) });
    },
  });
}

/**
 * Hook to transfer primary workspace ownership.
 */
export function useTransferWorkspaceOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      newOwnerUserId,
    }: {
      workspaceId: string;
      newOwnerUserId: string;
    }) => transferWorkspaceOwnershipApi(workspaceId, newOwnerUserId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}
