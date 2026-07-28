import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import DashboardPage from "./DashboardPage";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview";
import { projectRecommendationsApi } from "@/features/projects/services/project-recommendations.api";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/features/dashboard/hooks/useDashboardOverview", () => ({
  useDashboardOverview: vi.fn(),
}));

vi.mock("@/features/auth/hooks", () => ({
  useCurrentUser: () => ({ data: { name: "Test User" } }),
}));

vi.mock("@/features/projects/services/project-recommendations.api", () => ({
  projectRecommendationsApi: {
    listWorkspace: vi.fn(),
  },
}));

type DashboardOverviewHookReturn = ReturnType<typeof useDashboardOverview>;

describe("DashboardPage Layout & Integration", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    vi.mocked(projectRecommendationsApi.listWorkspace).mockResolvedValue({
      recommendations: [],
      pagination: { total: 0, page: 1, limit: 5, totalPages: 1 },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("1. LOADING STATE: renders Hero, Daily Brief, Quick Actions, and Workspace Recommendations without layout crashing", () => {
    vi.mocked(useDashboardOverview).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    const { container } = render(<DashboardPage />, { wrapper });

    // Verify key sections are present
    expect(screen.getByText("Daily brief")).toBeInTheDocument();
    expect(screen.getByText("Quick actions")).toBeInTheDocument();
    expect(screen.getByText("Project Insights")).toBeInTheDocument();

    // Verify Row 1 container has items-start class to prevent abnormal grid height stretching
    const row1Grid = container.querySelector(".grid.items-start");
    expect(row1Grid).toBeInTheDocument();
  });

  it("2. LOADED STATE: renders attention tasks, recent projects, and timeline widgets", () => {
    vi.mocked(useDashboardOverview).mockReturnValue({
      data: {
        attentionTasks: [],
        recentProjects: [],
        summary: {
          projects: { active: 2 },
          tasks: { totalActive: 5, completed: 3 },
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    render(<DashboardPage />, { wrapper });

    expect(screen.getByText("Focus")).toBeInTheDocument();
    expect(screen.getByText("Recent projects")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  it("3. ERROR STATE: renders structural error state safely", () => {
    vi.mocked(useDashboardOverview).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    render(<DashboardPage />, { wrapper });

    expect(screen.getByText("Error loading dashboard")).toBeInTheDocument();
    expect(screen.getByText("Quick actions")).toBeInTheDocument();
  });
});
