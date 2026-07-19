import { useInfiniteQuery } from "@tanstack/react-query";
import { activityApi } from "../services/activity.api";
import { activityKeys } from "./activity.keys";
import type { ActivityQueryDto } from "../types/activity.types";

export function useActivities(params?: Omit<ActivityQueryDto, "cursor">) {
  return useInfiniteQuery({
    queryKey: activityKeys.list(params),
    queryFn: ({ pageParam }) =>
      activityApi.getActivities({
        ...params,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
