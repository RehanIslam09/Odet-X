import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWorkspaceApi,
  deleteWorkspaceApi,
  fetchWorkspaceDetails,
  fetchWorkspaces,
  updateWorkspaceApi,
} from "../api/workspace-api";
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "../types/workspace.types";

/**
 * Query key factory for all workspace server state.
 */
export const workspaceKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspaceKeys.all, "list"] as const,
  detail: (id: string) => [...workspaceKeys.all, "detail", id] as const,
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
