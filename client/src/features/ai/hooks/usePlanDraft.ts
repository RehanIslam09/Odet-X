import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aiApi } from "@/features/ai/services/ai.api";
import { getApiError } from "@/utils/api-error";
import { projectKeys } from "@/features/projects/hooks/useProjects";
import type {
  GeneratePlanDto,
  UpdatePlanDraftDto,
} from "@/features/ai/types/ai.types";

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------
export const planKeys = {
  all: ["plans"] as const,
  project: (projectId: string) => [...planKeys.all, "project", projectId] as const,
  detail: (projectId: string, draftId: string) =>
    [...planKeys.project(projectId), draftId] as const,
  active: (projectId: string) =>
    [...planKeys.project(projectId), "active"] as const,
};

/**
 * Mutation hook for generating an AI project plan draft.
 */
export function useGeneratePlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GeneratePlanDto) => aiApi.generatePlan(projectId, data),
    onSuccess: (draft) => {
      queryClient.setQueryData(planKeys.detail(projectId, draft.id), draft);
      queryClient.setQueryData(planKeys.active(projectId), draft);
      queryClient.invalidateQueries({ queryKey: planKeys.project(projectId) });
      toast.success("Project plan generated successfully.");
    },
    onError: (error) => {
      const err = getApiError(error);
      toast.error(err.message);
    },
  });
}

/**
 * Query hook for retrieving the active uncommitted plan draft for a project.
 */
export function useActivePlanDraft(projectId: string) {
  return useQuery({
    queryKey: planKeys.active(projectId),
    queryFn: () => aiApi.getActivePlanDraft(projectId),
    enabled: Boolean(projectId),
  });
}

/**
 * Query hook for retrieving a persisted plan draft by ID.
 */
export function usePlanDraft(projectId: string, draftId: string | null) {
  return useQuery({
    queryKey: planKeys.detail(projectId, draftId ?? ""),
    queryFn: () => aiApi.getPlanDraft(projectId, draftId!),
    enabled: Boolean(projectId && draftId),
  });
}

/**
 * Mutation hook for updating/editing an uncommitted plan draft.
 */
export function useUpdatePlanDraft(projectId: string, draftId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePlanDraftDto) =>
      aiApi.updatePlanDraft(projectId, draftId, data),
    onSuccess: (draft) => {
      queryClient.setQueryData(planKeys.detail(projectId, draftId), draft);
      toast.success("Plan draft saved successfully.");
    },
    onError: (error) => {
      const err = getApiError(error);
      toast.error(err.message);
    },
  });
}

/**
 * Mutation hook for discarding an uncommitted plan draft.
 */
export function useDiscardPlanDraft(projectId: string, draftId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => aiApi.discardPlanDraft(projectId, draftId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: planKeys.detail(projectId, draftId) });
      queryClient.invalidateQueries({ queryKey: planKeys.project(projectId) });
      toast.success("Plan draft discarded.");
    },
    onError: (error) => {
      const err = getApiError(error);
      toast.error(err.message);
    },
  });
}

/**
 * Mutation hook for committing a validated plan draft into permanent Tasks and Milestones.
 */
export function useCommitPlan(projectId: string, draftId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => aiApi.commitPlan(projectId, draftId),
    onSuccess: (result) => {
      // Invalidate project details and summary metrics
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      // Invalidate task lists
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      // Invalidate activity feed
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      // Invalidate planning drafts
      queryClient.invalidateQueries({ queryKey: planKeys.project(projectId) });

      toast.success(
        `Project plan committed successfully! Created ${result.taskCount} tasks and ${result.milestoneCount} milestones.`
      );
    },
    onError: (error) => {
      const err = getApiError(error);
      toast.error(err.message);
    },
  });
}
