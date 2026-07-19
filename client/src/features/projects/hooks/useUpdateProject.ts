import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { projectsApi } from "@/features/projects/services/projects.api";
import { projectKeys } from "@/features/projects/hooks/useProjects";
import type { UpdateProjectDto } from "@/features/projects/types/projects.types";

/**
 * Update project mutation.
 *
 * On success: invalidates the specific project detail and all project lists.
 * Invalidation is preferred over manual cache manipulation here because the
 * server returns the canonical updated document.
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectDto }) =>
      projectsApi.update(id, data),

    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.options() });

      toast.success("Project updated successfully.");
    },

    onError: () => {
      // Field errors handled by the form via applyServerErrors.
    },
  });
}
