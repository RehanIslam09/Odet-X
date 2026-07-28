import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { projectRecommendationsApi } from "@/features/projects/services/project-recommendations.api";
import { WorkspaceRecommendationsSheet } from "./WorkspaceRecommendationsSheet";
import type { ProjectRecommendation } from "@/features/projects/types/project-recommendations.types";

vi.mock("@/features/projects/services/project-recommendations.api", () => ({
  projectRecommendationsApi: {
    listWorkspace: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("WorkspaceRecommendationsSheet Component", () => {
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

  const mockRec1: ProjectRecommendation = {
    id: "rec_sheet_1",
    projectId: "proj_1",
    type: "OVERDUE_HIGH_PRIORITY_TASKS",
    severity: "HIGH",
    title: "Overdue Security Tasks",
    explanation: "Authentication tests past target date.",
    suggestedNextStep: "Review auth backlog with tech lead.",
    facts: { overdueCount: 2 },
    relatedEntities: [{ type: "project", id: "proj_1", label: "Auth Service" }],
    status: "ACTIVE",
    createdAt: "2026-07-27T12:00:00.000Z",
    updatedAt: "2026-07-27T12:00:00.000Z",
    version: 0,
  };

  const mockRec2: ProjectRecommendation = {
    id: "rec_sheet_2",
    projectId: "proj_2",
    type: "MILESTONE_AT_RISK",
    severity: "CRITICAL",
    title: "Milestone Deadline At Risk",
    explanation: "Frontend release is falling behind schedule.",
    suggestedNextStep: "Re-assign remaining tasks.",
    facts: { incompleteCount: 4 },
    relatedEntities: [{ type: "project", id: "proj_2", label: "Frontend Web" }],
    status: "ACTIVE",
    createdAt: "2026-07-27T12:00:00.000Z",
    updatedAt: "2026-07-27T12:00:00.000Z",
    version: 0,
  };

  it("1. SHEET HEADER & TOTAL COUNT: renders heading and active count description", async () => {
    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValueOnce({
      recommendations: [mockRec1, mockRec2],
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    render(<WorkspaceRecommendationsSheet open={true} onOpenChange={vi.fn()} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Project Insights" })).toBeInTheDocument();
      expect(screen.getByText("2 active proactive insights across your workspace")).toBeInTheDocument();
    });
  });

  it("2. PROGRESSIVE EXPANSION: items start collapsed and expand/collapse cleanly", async () => {
    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValueOnce({
      recommendations: [mockRec1, mockRec2],
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    render(<WorkspaceRecommendationsSheet open={true} onOpenChange={vi.fn()} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Overdue Security Tasks")).toBeInTheDocument();
      expect(screen.getByText("Milestone Deadline At Risk")).toBeInTheDocument();
    });

    // Suggested next step is hidden while collapsed
    expect(screen.queryByText("Suggested next step")).not.toBeInTheDocument();

    // Click Show details on item 1
    const showDetailsBtns = screen.getAllByRole("button", { name: /show details/i });
    fireEvent.click(showDetailsBtns[0]!);

    await waitFor(() => {
      expect(screen.getByText("Suggested next step")).toBeInTheDocument();
      expect(screen.getByText("Review auth backlog with tech lead.")).toBeInTheDocument();
    });

    // Click Show details on item 2 (collapses item 1 in single-expansion model)
    const showDetailsBtn2 = screen.getByRole("button", { name: /show details/i });
    fireEvent.click(showDetailsBtn2);

    await waitFor(() => {
      expect(screen.getByText("Re-assign remaining tasks.")).toBeInTheDocument();
    });
  });

  it("3. PROGRESSIVE PAGINATION: clicking Load More fetches next page and appends items without duplicates", async () => {
    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValueOnce({
      recommendations: [mockRec1],
      pagination: { total: 2, page: 1, limit: 10, totalPages: 2 },
    });

    render(<WorkspaceRecommendationsSheet open={true} onOpenChange={vi.fn()} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Overdue Security Tasks")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /load more insights \(1 of 2\)/i })).toBeInTheDocument();
    });

    // Mock page 2 fetch
    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValueOnce({
      recommendations: [mockRec2],
      pagination: { total: 2, page: 2, limit: 10, totalPages: 2 },
    });

    const loadMoreBtn = screen.getByRole("button", { name: /load more insights/i });
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText("Overdue Security Tasks")).toBeInTheDocument();
      expect(screen.getByText("Milestone Deadline At Risk")).toBeInTheDocument();
      // Load more hides when all items are loaded
      expect(screen.queryByRole("button", { name: /load more insights/i })).not.toBeInTheDocument();
    });
  });

  it("4. DISMISSAL INTEGRATION: dismissing item in Sheet calls API and removes item from feed", async () => {
    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValueOnce({
      recommendations: [mockRec1],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });

    vi.mocked(projectRecommendationsApi.dismiss).mockResolvedValueOnce({
      ...mockRec1,
      status: "DISMISSED",
    });

    render(<WorkspaceRecommendationsSheet open={true} onOpenChange={vi.fn()} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Overdue Security Tasks")).toBeInTheDocument();
    });

    // Click Dismiss button
    const dismissBtn = screen.getByRole("button", {
      name: /dismiss recommendation: overdue security tasks/i,
    });
    fireEvent.click(dismissBtn);

    // Confirm dialog
    const confirmDismissBtn = screen.getByRole("button", { name: /confirm dismissal of recommendation/i });
    fireEvent.click(confirmDismissBtn);

    await waitFor(() => {
      expect(projectRecommendationsApi.dismiss).toHaveBeenCalledWith("rec_sheet_1", "proj_1");
      expect(toast.success).toHaveBeenCalledWith("Recommendation dismissed.");
    });
  });
});
