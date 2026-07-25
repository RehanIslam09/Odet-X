import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aiApi } from "@/features/ai/services/ai.api";
import type {
  ActionDryRunDto,
  ActionDryRunResultData,
  ActionConfirmDto,
  ActionConfirmResultData,
} from "@/features/ai/types/ai.types";

/**
 * Mutation hook for executing an Action Dry-Run simulation.
 * Computes state diff (Before vs After) without mutating database state.
 */
export function useActionDryRun() {
  return useMutation<ActionDryRunResultData, Error, ActionDryRunDto>({
    mutationFn: (data: ActionDryRunDto) => aiApi.dryRunAction(data),
  });
}

/**
 * Mutation hook for confirming an AI Action.
 * Verifies signed confirmation token, consumes nonce, checks OCC version, and executes domain mutation.
 * Upon success, invalidates relevant project and task TanStack Query caches.
 */
export function useActionConfirm(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ActionConfirmResultData, Error, ActionConfirmDto>({
    mutationFn: (data: ActionConfirmDto) => aiApi.confirmAction(data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
        queryClient.invalidateQueries({ queryKey: ["tasks", { projectId }] });
        queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
        queryClient.invalidateQueries({ queryKey: ["activities", projectId] });
        queryClient.invalidateQueries({ queryKey: ["project-summary", projectId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
    },
  });
}
