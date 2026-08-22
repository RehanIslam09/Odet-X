import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import DashboardPage from "./DashboardPage.js";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview.js";
import { useActivities } from "@/features/activity/hooks/useActivities.js";
import { projectRecommendationsApi } from "@/features/projects/services/project-recommendations.api.js";
import { TooltipProvider } from "@/components/ui/tooltip.js";
import { GlobalCopilotProvider } from "@/features/ai/context/GlobalCopilotProvider.js";

// Mock useDashboardOverview hook (workspace-scoped)
vi.mock("@/features/dashboard/hooks/useDashboardOverview", () => ({
  useDashboardOverview: vi.fn(),
}));

// Mock useActivities hook (workspace-scoped)
vi.mock("@/features/activity/hooks/useActivities", () => ({
  useActivities: vi.fn(),
}));

// Mock WorkspaceContext to provide a controllable active workspace
vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useActiveWorkspace: () => ({
    currentWorkspace: { id: "workspace-personal-id", slug: "personal", name: "Personal Workspace", isPersonal: true },
    workspaces: [],
    currentRole: "OWNER",
    isLoading: false,
    isError: false,
    switchWorkspace: vi.fn(),
    getWorkspaceHref: (path: string) => `/w/personal/${path}`,
  }),
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
type ActivitiesHookReturn = ReturnType<typeof useActivities>;

describe("DashboardPage Workspace Command Center Layout & Integration", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter>
          <GlobalCopilotProvider>
            {children}
          </GlobalCopilotProvider>
        </MemoryRouter>
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

    vi.mocked(useActivities).mockReturnValue({
      data: { pages: [{ items: [], pagination: { hasMore: false, nextCursor: null, limit: 5 } }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: null,
    } as unknown as ActivitiesHookReturn);

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

    expect(screen.getByText("Daily brief")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Project Insights")).toBeInTheDocument();

    const row1Grid = container.querySelector(".grid.items-start");
    expect(row1Grid).toBeInTheDocument();
  });

  it("2. LOADED STATE: renders executive summary, focus today, recent projects, upcoming deadlines, team presence, and health widgets", () => {
    vi.mocked(useDashboardOverview).mockReturnValue({
      data: {
        attentionTasks: [],
        recentProjects: [],
        summary: {
          projects: { active: 2, completed: 1 },
          tasks: { totalActive: 5, completed: 3, inProgress: 2, completionPercentage: 38 },
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    render(<DashboardPage />, { wrapper });

    expect(screen.getByText("Focus Today")).toBeInTheDocument();
    expect(screen.getByText("Recent Projects")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Deadlines")).toBeInTheDocument();
    expect(screen.getAllByText("Workspace Health").length).toBeGreaterThan(0);
    expect(screen.getByText("Online Team (1)")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText("Productivity Overview")).toBeInTheDocument();
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
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });

  it("4. WORKSPACE ISOLATION: personal workspace renders personal projects and activity", () => {
    const personalProject = {
      project: {
        id: "proj-personal-alpha",
        name: "Personal Alpha",
        emoji: "📋",
        color: "#6366f1",
        updatedAt: new Date().toISOString(),
      },
      progress: { total: 3, completed: 1, completionPercentage: 33 },
    };

    vi.mocked(useDashboardOverview).mockReturnValue({
      data: {
        attentionTasks: [],
        recentProjects: [personalProject],
        summary: { projects: { active: 1, completed: 0 }, tasks: { totalActive: 3, completed: 1, inProgress: 1, completionPercentage: 33 } },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    render(<DashboardPage />, { wrapper });

    expect(screen.getByText("Personal Alpha")).toBeInTheDocument();
  });

  it("5. WORKSPACE ISOLATION: empty workspace shows no personal projects", () => {
    vi.mocked(useDashboardOverview).mockReturnValue({
      data: {
        attentionTasks: [],
        recentProjects: [],
        summary: { projects: { active: 0, completed: 0 }, tasks: { totalActive: 0, completed: 0, inProgress: 0, completionPercentage: 0 } },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    render(<DashboardPage />, { wrapper });

    expect(screen.queryByText("Personal Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Personal Beta")).not.toBeInTheDocument();

    expect(screen.getByText("Recent Projects")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });
});
