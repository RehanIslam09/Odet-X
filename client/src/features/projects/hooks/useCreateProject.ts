import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { projectsApi } from "@/features/projects/services/projects.api";
import { projectKeys } from "@/features/projects/hooks/useProjects";

/**
 * Create project mutation.
 *
 * On success: invalidates all project lists so the new project appears
 * immediately without a manual refresh.
 *
 * No optimistic update here — creation requires a server-assigned ID.
 * The invalidation is fast enough that the UX remains snappy.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsApi.create,

    onSuccess: () => {
      // Invalidate all list queries — the new project should appear on any
      // active list regardless of current filters.
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.options() });

      toast.success("Project created successfully.");
    },

    onError: () => {
      // Individual field errors are handled by the form via applyServerErrors.
      // A toast is not shown here to avoid duplicate feedback.
    },
  });
}
