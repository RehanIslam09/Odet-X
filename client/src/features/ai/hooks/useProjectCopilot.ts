import { useMutation } from "@tanstack/react-query";
import { aiApi } from "@/features/ai/services/ai.api";
import type { QueryCopilotDto, CopilotResultData } from "@/features/ai/types/ai.types";

/**
 * Custom hook for querying the Read-Only AI Project Copilot.
 *
 * Uses `useMutation` for imperative user question execution.
 *
 * CRITICAL READ-ONLY INVARIANT:
 * Copilot queries perform ZERO state mutations on the server.
 * This hook strictly refrains from invalidating any TanStack Query caches
 * (e.g. project, task, milestone, dashboard, or activity keys).
 */
export function useProjectCopilot(projectId: string) {
  return useMutation<CopilotResultData, Error, QueryCopilotDto>({
    mutationFn: (data: QueryCopilotDto) => aiApi.queryCopilot(projectId, data),
  });
}
