import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { projectMemoryApi } from "@/features/projects/services/project-memory.api";
import { projectMemoryKeys } from "@/features/projects/hooks/useProjectMemories";
import type { CreateProjectMemoryDto } from "@/features/projects/types/project-memory.types";

/**
 * Mutation hook for creating a new project memory.
 * On success: invalidates all paginated list queries for the given project.
 */
export function useCreateProjectMemory(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectMemoryDto) =>
      projectMemoryApi.create(projectId, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectMemoryKeys.projectLists(projectId),
      });
      toast.success("Memory added successfully.");
    },

    onError: (error: unknown) => {
      console.error("Failed to create memory:", error);
    },
  });
}
