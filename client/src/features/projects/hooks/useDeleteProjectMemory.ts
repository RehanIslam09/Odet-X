import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { projectMemoryApi } from "@/features/projects/services/project-memory.api";
import { projectMemoryKeys } from "@/features/projects/hooks/useProjectMemories";

/**
 * Mutation hook for hard-deleting a project memory.
 * On success: invalidates all paginated memory list queries for the project.
 */
export function useDeleteProjectMemory(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) =>
      projectMemoryApi.delete(projectId, memoryId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectMemoryKeys.projectLists(projectId),
      });
      toast.success("Memory deleted.");
    },

    onError: (error: unknown) => {
      console.error("Failed to delete memory:", error);
    },
  });
}
