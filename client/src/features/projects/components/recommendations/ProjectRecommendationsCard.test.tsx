import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { projectRecommendationsApi } from "@/features/projects/services/project-recommendations.api";
import { ProjectRecommendationsCard } from "./ProjectRecommendationsCard";
import type { ProjectRecommendation } from "@/features/projects/types/project-recommendations.types";

vi.mock("@/features/projects/services/project-recommendations.api", () => ({
  projectRecommendationsApi: {
    listWorkspace: vi.fn(),
    listProject: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("ProjectRecommendationsCard Component", () => {
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
    id: "rec_4001",
    projectId: "proj_4",
    type: "PROJECT_STALLED",
    severity: "MEDIUM",
    title: "Project Has Been Stalled For 8 Days",
    explanation: "No task updates or activities recorded since July 19.",
    suggestedNextStep: "Review in-progress tasks and reassign blocked items.",
    facts: { stalledDays: 8 },
    relatedEntities: [{ type: "project", id: "proj_4", label: "Project Beta" }],
    status: "ACTIVE",
    createdAt: "2026-07-27T12:00:00.000Z",
    updatedAt: "2026-07-27T12:00:00.000Z",
    version: 0,
  };

  it("1. PROJECT SCOPED LIST: calls listProject API with correct projectId", async () => {
    vi.mocked(projectRecommendationsApi.listProject).mockResolvedValueOnce({
      recommendations: [mockRec],
      pagination: { total: 1, page: 1, limit: 5, totalPages: 1 },
    });

    render(<ProjectRecommendationsCard projectId="proj_4" />, { wrapper });

    await waitFor(() => {
      expect(projectRecommendationsApi.listProject).toHaveBeenCalledWith("proj_4", {
        page: 1,
        limit: 5,
        status: "ACTIVE",
      });
      expect(screen.getByText("Project Has Been Stalled For 8 Days")).toBeInTheDocument();
      expect(screen.getByText("Project stalled")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
    });
  });

  it("2. PROJECT EMPTY STATE: renders project-specific empty state copy", async () => {
    vi.mocked(projectRecommendationsApi.listProject).mockResolvedValueOnce({
      recommendations: [],
      pagination: { total: 0, page: 1, limit: 5, totalPages: 1 },
    });

    render(<ProjectRecommendationsCard projectId="proj_4" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("No active recommendations for this project")).toBeInTheDocument();
      expect(
        screen.getByText(/Recommendations will appear here automatically when proactive conditions are detected/i),
      ).toBeInTheDocument();
    });
  });

  it("3. ARCHIVED PROJECT EMPTY STATE: renders archived project empty state copy", async () => {
    vi.mocked(projectRecommendationsApi.listProject).mockResolvedValueOnce({
      recommendations: [],
      pagination: { total: 0, page: 1, limit: 5, totalPages: 1 },
    });

    render(<ProjectRecommendationsCard projectId="proj_4" isArchived={true} />, { wrapper });

    await waitFor(() => {
      expect(
        screen.getByText("This project is archived and has no active recommendations."),
      ).toBeInTheDocument();
    });
  });
});
