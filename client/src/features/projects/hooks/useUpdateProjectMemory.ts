import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { projectMemoryApi } from "@/features/projects/services/project-memory.api";
import { projectMemoryKeys } from "@/features/projects/hooks/useProjectMemories";
import type { UpdateProjectMemoryDto } from "@/features/projects/types/project-memory.types";

interface UpdateMemoryVariables {
  memoryId: string;
  data: UpdateProjectMemoryDto;
}

/**
 * Mutation hook for updating an existing project memory.
 * On success: invalidates project lists and shows toast notification.
 * On 409 Conflict: invalidates project lists so fresh version data is retrieved.
 */
export function useUpdateProjectMemory(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memoryId, data }: UpdateMemoryVariables) =>
      projectMemoryApi.update(projectId, memoryId, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: projectMemoryKeys.projectLists(projectId),
      });
      toast.success("Memory updated successfully.");
    },

    onError: () => {
      // Invalidate project memory lists immediately to fetch latest data on conflict/error
      queryClient.invalidateQueries({
        queryKey: projectMemoryKeys.projectLists(projectId),
      });
    },
  });
}
