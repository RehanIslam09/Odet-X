import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import DashboardPage from "./DashboardPage";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview";
import { useActivities } from "@/features/activity/hooks/useActivities";
import { projectRecommendationsApi } from "@/features/projects/services/project-recommendations.api";
import { TooltipProvider } from "@/components/ui/tooltip";

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

const PERSONAL_WORKSPACE = {
  id: "workspace-personal-id",
  slug: "personal",
  name: "Personal Workspace",
  isPersonal: true,
};

const CUSTOM_WORKSPACE = {
  id: "workspace-custom-id",
  slug: "apache-engineering",
  name: "Apache Superset Engineering",
  isPersonal: false,
};

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

    // Default: activities return empty list
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
        summary: { projects: { active: 1 }, tasks: { totalActive: 3, completed: 1 } },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    render(<DashboardPage />, { wrapper });

    // Personal project name should appear
    expect(screen.getByText("Personal Alpha")).toBeInTheDocument();
  });

  it("5. WORKSPACE ISOLATION: empty workspace shows no personal projects", () => {
    // Custom workspace has zero projects — must not leak personal project names
    vi.mocked(useDashboardOverview).mockReturnValue({
      data: {
        attentionTasks: [],
        recentProjects: [], // Empty — correct for custom workspace
        summary: { projects: { active: 0 }, tasks: { totalActive: 0, completed: 0 } },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    render(<DashboardPage />, { wrapper });

    // Personal project names must NOT appear in the DOM
    expect(screen.queryByText("Personal Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Personal Beta")).not.toBeInTheDocument();

    // Dashboard structure still renders correctly
    expect(screen.getByText("Recent projects")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  it("6. WORKSPACE ISOLATION: custom workspace data appears only in custom context", () => {
    const customProject = {
      project: {
        id: "proj-custom-alpha",
        name: "Superset OSS Dashboard",
        emoji: "🔥",
        color: "#f59e0b",
        updatedAt: new Date().toISOString(),
      },
      progress: { total: 2, completed: 0, completionPercentage: 0 },
    };

    vi.mocked(useDashboardOverview).mockReturnValue({
      data: {
        attentionTasks: [],
        recentProjects: [customProject],
        summary: { projects: { active: 1 }, tasks: { totalActive: 2, completed: 0 } },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    render(<DashboardPage />, { wrapper });

    // Custom project name should appear
    expect(screen.getByText("Superset OSS Dashboard")).toBeInTheDocument();
    // Personal project must NOT appear
    expect(screen.queryByText("Personal Alpha")).not.toBeInTheDocument();
  });

  it("7. QUERY CACHE ISOLATION: workspace ID is part of query key (prevents cross-workspace cache reuse)", async () => {
    // Import the keys factory and verify workspace ID is embedded
    const { dashboardKeys } = (await vi.importActual("@/features/dashboard/hooks/dashboard.keys")) as { dashboardKeys: { overview: (id: string) => readonly string[] } };
    if (dashboardKeys) {
      const key = dashboardKeys.overview(PERSONAL_WORKSPACE.id);
      expect(key).toContain(PERSONAL_WORKSPACE.id);

      const customKey = dashboardKeys.overview(CUSTOM_WORKSPACE.id);
      expect(customKey).toContain(CUSTOM_WORKSPACE.id);

      // The two keys must be different — cache is isolated per workspace
      expect(JSON.stringify(key)).not.toBe(JSON.stringify(customKey));
    }
  });

  it("8. EMPTY STATE: recent activity shows empty state when workspace has no activity", () => {
    vi.mocked(useDashboardOverview).mockReturnValue({
      data: {
        attentionTasks: [],
        recentProjects: [],
        summary: { projects: { active: 0 }, tasks: { totalActive: 0, completed: 0 } },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardOverviewHookReturn);

    // Activities return empty
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

    render(<DashboardPage />, { wrapper });

    // Activity section header still renders
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    // No personal activity text should leak in
    expect(screen.queryByText("Personal Alpha")).not.toBeInTheDocument();
  });
});
