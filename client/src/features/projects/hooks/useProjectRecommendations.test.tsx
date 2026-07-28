import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { projectRecommendationsApi } from "@/features/projects/services/project-recommendations.api";
import {
  useWorkspaceRecommendations,
  useProjectRecommendations,
  useDismissRecommendation,
  recommendationKeys,
} from "./useProjectRecommendations";
import type { ProjectRecommendation } from "@/features/projects/types/project-recommendations.types";

vi.mock("@/features/projects/services/project-recommendations.api", () => ({
  projectRecommendationsApi: {
    listWorkspace: vi.fn(),
    listProject: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("useProjectRecommendations Hooks & Query Keys", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

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

  const mockRec: ProjectRecommendation = {
    id: "rec_2001",
    projectId: "proj_2",
    type: "MILESTONE_AT_RISK",
    severity: "CRITICAL",
    title: "Beta Launch Milestone At Risk",
    explanation: "Overdue target date with incomplete tasks.",
    facts: {},
    relatedEntities: [],
    status: "ACTIVE",
    createdAt: "2026-07-27T12:00:00.000Z",
    updatedAt: "2026-07-27T12:00:00.000Z",
    version: 0,
  };

  it("1. QUERY KEY FACTORY: generates deterministic recommendation query keys", () => {
    expect(recommendationKeys.all).toEqual(["recommendations"]);
    expect(recommendationKeys.workspaceList({ page: 1 })).toEqual([
      "recommendations",
      "workspace",
      { page: 1 },
    ]);
    expect(recommendationKeys.projectList("p1", { page: 2 })).toEqual([
      "recommendations",
      "project",
      "p1",
      { page: 2 },
    ]);
  });

  it("2. useWorkspaceRecommendations: fetches workspace recommendations", async () => {
    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValueOnce({
      recommendations: [mockRec],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    const { result } = renderHook(() => useWorkspaceRecommendations({ page: 1, limit: 10, status: "ACTIVE" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(projectRecommendationsApi.listWorkspace).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: "ACTIVE",
    });
    expect(result.current.data?.recommendations[0].id).toBe("rec_2001");
  });

  it("3. useProjectRecommendations: fetches project-scoped recommendations", async () => {
    vi.mocked(projectRecommendationsApi.listProject).mockResolvedValueOnce({
      recommendations: [mockRec],
      pagination: { total: 1, page: 1, limit: 5, totalPages: 1 },
    });

    const { result } = renderHook(() => useProjectRecommendations("proj_2", { page: 1, limit: 5 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(projectRecommendationsApi.listProject).toHaveBeenCalledWith("proj_2", {
      page: 1,
      limit: 5,
    });
    expect(result.current.data?.recommendations[0].projectId).toBe("proj_2");
  });

  it("4. useDismissRecommendation: mutates dismiss API and invalidates all recommendation queries", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const dismissedRec = { ...mockRec, status: "DISMISSED" as const };

    vi.mocked(projectRecommendationsApi.dismiss).mockResolvedValueOnce(dismissedRec);

    const { result } = renderHook(() => useDismissRecommendation(), { wrapper });

    result.current.mutate({ recommendationId: "rec_2001", projectId: "proj_2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(projectRecommendationsApi.dismiss).toHaveBeenCalledWith("rec_2001", "proj_2");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: recommendationKeys.all });
  });
});
