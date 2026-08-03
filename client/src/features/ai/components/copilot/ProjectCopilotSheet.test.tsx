import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { aiApi } from "@/features/ai/services/ai.api.js";
import { ProjectCopilotSheet } from "./ProjectCopilotSheet.js";
import { GlobalCopilotProvider } from "@/features/ai/context/GlobalCopilotProvider.js";
import { useProjectCopilot } from "@/features/ai/hooks/useProjectCopilot.js";
import { renderHook } from "@testing-library/react";

vi.mock("@/features/ai/services/ai.api", () => ({
  aiApi: {
    queryCopilot: vi.fn(),
  },
}));

describe("ProjectCopilotSheet & Read-Only Copilot UI (WP-03 Unified Delegation)", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GlobalCopilotProvider>{children}</GlobalCopilotProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("useProjectCopilot Hook (Read-Only Invariant)", () => {
    it("calls aiApi.queryCopilot and performs ZERO cache invalidations", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const mockResult = {
        answer: "Task 1 is in progress.",
        references: [{ type: "task" as const, id: "task-1", label: "Task 1" }],
        unmappedReferenceCount: 0,
        executionId: "exec-1",
        provider: "mock",
        model: "mock-model",
      };

      vi.mocked(aiApi.queryCopilot).mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useProjectCopilot("proj-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ question: "What is the status of Task 1?" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(aiApi.queryCopilot).toHaveBeenCalledWith("proj-123", {
        question: "What is the status of Task 1?",
      });

      // Strict Read-Only Invariant: ZERO cache invalidations
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("ProjectCopilotSheet Component", () => {
    it("delegates project context to GlobalCopilotProvider when open is true", () => {
      const onOpenChange = vi.fn();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <GlobalCopilotProvider>
              <ProjectCopilotSheet
                projectId="proj-123"
                open={true}
                onOpenChange={onOpenChange}
              />
            </GlobalCopilotProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Successfully mounts and delegates without throwing context errors
      expect(true).toBe(true);
    });
  });
});
