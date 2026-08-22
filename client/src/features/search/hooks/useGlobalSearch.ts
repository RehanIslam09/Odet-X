/**
 * Global Search TanStack Query Hook
 * Phase 31 — Global Search & Command Palette
 * WP-06 — Global Search UX & Result Navigation
 */

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce.js";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { searchApi } from "../services/search.api.js";
import type { GlobalSearchResponseData } from "../types/search.types.js";

export const SEARCH_MIN_QUERY_LENGTH = 2;

export function useGlobalSearch(query: string, open: boolean) {
  const trimmed = (query || "").trim();
  const debouncedQuery = useDebounce(trimmed, 300);
  const { currentWorkspace } = useActiveWorkspace();

  const isEligible = open && debouncedQuery.length >= SEARCH_MIN_QUERY_LENGTH;

  const queryResult = useQuery<GlobalSearchResponseData, Error>({
    queryKey: ["global-search", currentWorkspace?.id || "personal", debouncedQuery],
    queryFn: ({ signal }) => {
      return searchApi.globalSearch(
        {
          q: debouncedQuery,
          type: "all",
          limit: 20,
        },
        signal
      );
    },
    enabled: isEligible,
    staleTime: 30000,
    retry: false,
  });

  return {
    ...queryResult,
    debouncedQuery,
    isEligible,
  };
}
