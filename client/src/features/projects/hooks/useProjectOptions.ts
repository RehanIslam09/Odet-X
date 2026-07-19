import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { projectsApi } from "@/features/projects/services/projects.api";
import { projectKeys } from "@/features/projects/hooks/useProjects";
import type { ProjectOption } from "@/features/projects/types/projects.types";

interface UseProjectOptionsProps {
  /** 
   * Useful to disable the query when the options aren't needed 
   * (e.g. creating a task in a fixed project). 
   */
  enabled?: boolean;
}

/**
 * Hook to fetch a lightweight, unpaginated list of active project options.
 * Used exclusively for populating dropdowns and selectors.
 */
export function useProjectOptions({ enabled = true }: UseProjectOptionsProps = {}) {
  return useQuery<ProjectOption[]>({
    queryKey: projectKeys.options(),
    queryFn: projectsApi.getOptions,
    enabled,
    // Since dropdown lists shouldn't constantly refetch in the background
    // if the user hasn't explicitly changed anything, we can set a reasonable stale time.
    staleTime: 5 * 60 * 1000,
    // Do not continuously retry deterministic 400 errors if they somehow occur.
    retry: (failureCount, error: unknown) => {
      // Don't retry client errors (4xx)
      if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
        return false;
      }
      return failureCount < 3;
    }
  });
}
