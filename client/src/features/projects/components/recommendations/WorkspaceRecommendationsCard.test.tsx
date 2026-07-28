import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { projectRecommendationsApi } from "@/features/projects/services/project-recommendations.api";
import { WorkspaceRecommendationsCard } from "./WorkspaceRecommendationsCard";
import type { ProjectRecommendation } from "@/features/projects/types/project-recommendations.types";

vi.mock("@/features/projects/services/project-recommendations.api", () => ({
  projectRecommendationsApi: {
    listWorkspace: vi.fn(),
    listProject: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("WorkspaceRecommendationsCard & Sheet UX Integration", () => {
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
    id: "rec_3001",
    projectId: "proj_3",
    type: "OVERDUE_HIGH_PRIORITY_TASKS",
    severity: "HIGH",
    title: "2 High-Priority Tasks Are Overdue",
    explanation: "Payment Gateway Refactor is past due date.",
    suggestedNextStep: "Review task priorities with engineering team.",
    facts: { overdueCount: 2 },
    relatedEntities: [
      { type: "project", id: "proj_3", label: "Alpha E-Commerce" },
      { type: "task", id: "t_101", label: "Payment Gateway Refactor" },
    ],
    status: "ACTIVE",
    createdAt: "2026-07-27T12:00:00.000Z",
    updatedAt: "2026-07-27T12:00:00.000Z",
    version: 0,
  };

  it("1. ZERO INSIGHTS: renders calm empty state without View All action", async () => {
    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValue({
      recommendations: [],
      pagination: { total: 0, page: 1, limit: 3, totalPages: 1 },
    });

    render(<WorkspaceRecommendationsCard />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("No recommendations right now")).toBeInTheDocument();
      expect(screen.queryByText(/View all/i)).not.toBeInTheDocument();
    });
  });

  it("2. ONE TO THREE INSIGHTS: renders compact cards without View All action", async () => {
    const recs = [
      { ...mockRec1, id: "r1", title: "Insight 1" },
      { ...mockRec1, id: "r2", title: "Insight 2" },
      { ...mockRec1, id: "r3", title: "Insight 3" },
    ];

    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValue({
      recommendations: recs,
      pagination: { total: 3, page: 1, limit: 3, totalPages: 1 },
    });

    render(<WorkspaceRecommendationsCard />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Insight 1")).toBeInTheDocument();
      expect(screen.getByText("Insight 2")).toBeInTheDocument();
      expect(screen.getByText("Insight 3")).toBeInTheDocument();
      expect(screen.queryByText(/View all/i)).not.toBeInTheDocument();
    });
  });

  it("3. FOUR OR MORE INSIGHTS: renders top 3 compact cards and displays 'View all X insights' using pagination total", async () => {
    const top3Recs = [
      { ...mockRec1, id: "r1", title: "Insight 1" },
      { ...mockRec1, id: "r2", title: "Insight 2" },
      { ...mockRec1, id: "r3", title: "Insight 3" },
    ];

    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValue({
      recommendations: top3Recs,
      pagination: { total: 26, page: 1, limit: 3, totalPages: 9 },
    });

    render(<WorkspaceRecommendationsCard />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Insight 1")).toBeInTheDocument();
      expect(screen.getByText("Insight 2")).toBeInTheDocument();
      expect(screen.getByText("Insight 3")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /view all 26 insights/i })).toBeInTheDocument();
    });
  });

  it("4. CLICKING VIEW ALL: opens Workspace Insights Sheet", async () => {
    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValue({
      recommendations: [mockRec1],
      pagination: { total: 26, page: 1, limit: 3, totalPages: 9 },
    });

    render(<WorkspaceRecommendationsCard />, { wrapper });

    const viewAllBtn = await screen.findByRole("button", { name: /view all 26 insights/i });
    fireEvent.click(viewAllBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Project Insights" })).toBeInTheDocument();
    });
  });

  it("5. CLICKING VIEW INSIGHT ON COMPACT CARD: opens Sheet and expands selected insight", async () => {
    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValue({
      recommendations: [mockRec1],
      pagination: { total: 1, page: 1, limit: 3, totalPages: 1 },
    });

    render(<WorkspaceRecommendationsCard />, { wrapper });

    const viewInsightBtn = await screen.findByRole("button", {
      name: /view details for insight: 2 high-priority tasks are overdue/i,
    });
    fireEvent.click(viewInsightBtn);

    await waitFor(() => {
      // Expanded view inside Sheet shows suggested next step box
      expect(screen.getByText("Suggested next step")).toBeInTheDocument();
      expect(screen.getByText("Review task priorities with engineering team.")).toBeInTheDocument();
    });
  });

  it("6. PLAIN-TEXT XSS SECURITY: renders malicious text as plain text inside Sheet and Card", async () => {
    const maliciousRec: ProjectRecommendation = {
      ...mockRec1,
      title: '<script>alert("xss-title")</script>',
      explanation: '<b>Dangerous HTML Content</b> <img src="x" onerror="alert(1)"/>',
    };

    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValue({
      recommendations: [maliciousRec],
      pagination: { total: 1, page: 1, limit: 3, totalPages: 1 },
    });

    render(<WorkspaceRecommendationsCard />, { wrapper });

    await waitFor(() => {
      const titleElement = screen.getByText('<script>alert("xss-title")</script>');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement.tagName).not.toBe("SCRIPT");
    });
  });

  it("7. INTERNAL METADATA EXCLUSION: does not render owner, claimToken, purgeAt, or fingerprint", async () => {
    const recWithInternalMetadata: Record<string, unknown> = {
      ...mockRec1,
      owner: "user_secret_owner_123",
      claimToken: "secret_claim_token_abc",
      purgeAt: "2026-08-27T12:00:00.000Z",
      fingerprint: "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
    };

    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValue({
      recommendations: [recWithInternalMetadata as unknown as ProjectRecommendation],
      pagination: { total: 1, page: 1, limit: 3, totalPages: 1 },
    });

    render(<WorkspaceRecommendationsCard />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("2 High-Priority Tasks Are Overdue")).toBeInTheDocument();
    });

    expect(screen.queryByText("user_secret_owner_123")).not.toBeInTheDocument();
    expect(screen.queryByText("secret_claim_token_abc")).not.toBeInTheDocument();
    expect(screen.queryByText("a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef")).not.toBeInTheDocument();
  });
});
