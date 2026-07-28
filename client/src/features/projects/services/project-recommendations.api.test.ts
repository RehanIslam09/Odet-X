import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/services/axios";
import { projectRecommendationsApi } from "./project-recommendations.api";
import type { ProjectRecommendation } from "@/features/projects/types/project-recommendations.types";

vi.mock("@/services/axios", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("projectRecommendationsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRecommendation: ProjectRecommendation = {
    id: "rec_1001",
    projectId: "proj_1",
    type: "OVERDUE_HIGH_PRIORITY_TASKS",
    severity: "HIGH",
    title: "2 High-Priority Tasks Are Overdue",
    explanation: "Tasks are past target due date.",
    suggestedNextStep: "Review task priorities.",
    facts: { overdueCount: 2 },
    relatedEntities: [{ type: "task", id: "t1", label: "Auth Refactor" }],
    status: "ACTIVE",
    createdAt: "2026-07-27T12:00:00.000Z",
    updatedAt: "2026-07-27T12:00:00.000Z",
    version: 0,
  };

  it("listWorkspace calls GET /recommendations with query params", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        message: "OK",
        data: {
          recommendations: [mockRecommendation],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        },
      },
    });

    const result = await projectRecommendationsApi.listWorkspace({ page: 1, limit: 10, status: "ACTIVE" });

    expect(apiClient.get).toHaveBeenCalledWith("/recommendations", {
      params: { page: 1, limit: 10, status: "ACTIVE" },
    });
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].id).toBe("rec_1001");
  });

  it("listProject calls GET /projects/:projectId/recommendations with query params", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        message: "OK",
        data: {
          recommendations: [mockRecommendation],
          pagination: { total: 1, page: 1, limit: 5, totalPages: 1 },
        },
      },
    });

    const result = await projectRecommendationsApi.listProject("proj_1", { page: 1, limit: 5 });

    expect(apiClient.get).toHaveBeenCalledWith("/projects/proj_1/recommendations", {
      params: { page: 1, limit: 5 },
    });
    expect(result.recommendations[0].projectId).toBe("proj_1");
  });

  it("dismiss calls PATCH /projects/:projectId/recommendations/:id/dismiss", async () => {
    const dismissedRec = { ...mockRecommendation, status: "DISMISSED" as const };
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: {
        success: true,
        message: "Dismissed",
        data: { recommendation: dismissedRec },
      },
    });

    const result = await projectRecommendationsApi.dismiss("rec_1001", "proj_1");

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/projects/proj_1/recommendations/rec_1001/dismiss",
    );
    expect(result.status).toBe("DISMISSED");
  });

  it("dismiss calls PATCH /recommendations/:id/dismiss when projectId is absent", async () => {
    const dismissedRec = { ...mockRecommendation, status: "DISMISSED" as const };
    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: {
        success: true,
        message: "Dismissed",
        data: { recommendation: dismissedRec },
      },
    });

    const result = await projectRecommendationsApi.dismiss("rec_1001");

    expect(apiClient.patch).toHaveBeenCalledWith("/recommendations/rec_1001/dismiss");
    expect(result.status).toBe("DISMISSED");
  });
});
