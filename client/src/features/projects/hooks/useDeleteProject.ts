import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { projectsApi } from "@/features/projects/services/projects.api";
import { projectKeys } from "@/features/projects/hooks/useProjects";

/**
 * Delete project mutation.
 *
 * Performs a soft-delete on the server (isDeleted: true). The project becomes
 * invisible in all user-facing queries immediately.
 *
 * On success: invalidates all project lists to reflect the removal.
 * The project's React Query cache entry is also removed so it won't be
 * served stale if the user somehow navigates to its detail URL.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),

    onSuccess: (_data, id) => {
      // Remove the detail cache entry
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });

      // Invalidate all lists to reflect the deletion
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      toast.success("Project deleted.");
    },
  });
}
