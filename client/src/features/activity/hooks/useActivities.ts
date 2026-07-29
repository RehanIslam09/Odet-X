import { useInfiniteQuery } from "@tanstack/react-query";
import { activityApi } from "../services/activity.api";
import { activityKeys } from "./activity.keys";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext";
import type { ActivityQueryDto } from "../types/activity.types";

/**
 * Phase 32: Fetches workspace-scoped activities using an infinite/cursor query.
 *
 * The query key includes the active workspace ID so TanStack Query cache is
 * fully isolated per workspace. Switching workspaces fetches a fresh response
 * and never serves another workspace's cached activity data.
 */
export function useActivities(params?: Omit<ActivityQueryDto, "cursor">) {
  const { currentWorkspace } = useActiveWorkspace();
  const workspaceId = currentWorkspace?.id ?? "";

  return useInfiniteQuery({
    queryKey: activityKeys.list(workspaceId, params),
    queryFn: ({ pageParam }) =>
      activityApi.getActivities({
        ...params,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination?.hasMore) return undefined;
      return lastPage.pagination.nextCursor ?? undefined;
    },
    // Only fetch when we have a resolved workspace
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
