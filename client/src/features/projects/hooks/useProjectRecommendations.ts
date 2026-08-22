import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectRecommendationsApi } from "@/features/projects/services/project-recommendations.api";
import type {
  PaginatedRecommendationsResponse,
  ProjectRecommendation,
  RecommendationQueryParams,
} from "@/features/projects/types/project-recommendations.types";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------

export const recommendationKeys = {
  all: ["recommendations"] as const,
  workspaceLists: (workspaceId?: string | null) =>
    workspaceId
      ? ([...recommendationKeys.all, "workspace", workspaceId] as const)
      : ([...recommendationKeys.all, "workspace"] as const),
  workspaceList: (params?: RecommendationQueryParams, workspaceId?: string | null) =>
    [...recommendationKeys.workspaceLists(workspaceId), params ?? {}] as const,
  projectLists: (workspaceId?: string | null) =>
    workspaceId
      ? ([...recommendationKeys.all, "project", workspaceId] as const)
      : ([...recommendationKeys.all, "project"] as const),
  projectList: (projectId: string, params?: RecommendationQueryParams, workspaceId?: string | null) =>
    [...recommendationKeys.projectLists(workspaceId), projectId, params ?? {}] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches workspace-wide active recommendations with pagination and filtering.
 */
export function useWorkspaceRecommendations(
  params: RecommendationQueryParams = { page: 1, limit: 10, status: "ACTIVE" },
) {
  const { activeWorkspaceId } = useActiveWorkspace();

  return useQuery<PaginatedRecommendationsResponse>({
    queryKey: recommendationKeys.workspaceList(params, activeWorkspaceId),
    queryFn: () => projectRecommendationsApi.listWorkspace(params),
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000, // 1 minute stale time
  });
}

/**
 * Fetches recommendations scoped to a specific project.
 */
export function useProjectRecommendations(
  projectId: string,
  params: RecommendationQueryParams = { page: 1, limit: 5, status: "ACTIVE" },
  options: { enabled?: boolean } = {},
) {
  const { activeWorkspaceId } = useActiveWorkspace();

  return useQuery<PaginatedRecommendationsResponse>({
    queryKey: recommendationKeys.projectList(projectId, params, activeWorkspaceId),
    queryFn: () => projectRecommendationsApi.listProject(projectId, params),
    enabled: Boolean(projectId) && (options.enabled ?? true),
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
  });
}

/**
 * Mutation hook to dismiss an ACTIVE recommendation.
 * Invalidates all recommendation queries on success to keep workspace & project feeds consistent.
 */
export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  return useMutation<
    ProjectRecommendation,
    Error,
    { recommendationId: string; projectId?: string }
  >({
    mutationFn: ({ recommendationId, projectId }) =>
      projectRecommendationsApi.dismiss(recommendationId, projectId),
    onSuccess: () => {
      // Invalidate all recommendation queries across views
      queryClient.invalidateQueries({ queryKey: recommendationKeys.all });
    },
  });
}
