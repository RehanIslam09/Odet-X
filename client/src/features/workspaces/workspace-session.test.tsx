import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceProvider, useActiveWorkspace } from "./context/WorkspaceContext.js";
import type { Workspace } from "./types/workspace.types.js";

const mockWorkspaces: Workspace[] = [
  {
    id: "ws-personal",
    name: "Default Personal Workspace",
    slug: "default-personal",
    ownerId: "user-1",
    isPersonal: true,
    role: "OWNER",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "ws-team-alpha",
    name: "Alpha Team",
    slug: "alpha-team",
    ownerId: "user-1",
    isPersonal: false,
    role: "ADMIN",
    memberCount: 8,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

vi.mock("./hooks/useWorkspaces.ts", () => ({
  workspaceKeys: {
    all: ["workspaces"],
    list: () => ["workspaces", "list"],
    detail: (id: string) => ["workspaces", "detail", id],
  },
  useWorkspaces: () => ({
    data: mockWorkspaces,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe("Phase 35 WP-03 — Workspace Session Engine & Context Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("1. Automatically derives active workspace from URL parameter /w/:workspaceSlug", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/alpha-team/dashboard"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/*"
              element={<WorkspaceProvider>{children}</WorkspaceProvider>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });

    expect(result.current.currentWorkspace?.slug).toBe("alpha-team");
    expect(result.current.activeWorkspaceId).toBe("ws-team-alpha");
  });

  it("2. Persists last active workspace slug to localStorage", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/alpha-team/dashboard"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/*"
              element={<WorkspaceProvider>{children}</WorkspaceProvider>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    renderHook(() => useActiveWorkspace(), { wrapper });

    expect(localStorage.getItem("ai_pm_active_workspace")).toBe("alpha-team");
  });

  it("3. Falls back gracefully to Default Personal Workspace if URL slug is omitted", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });

    expect(result.current.currentWorkspace?.slug).toBe("default-personal");
    expect(result.current.currentWorkspace?.isPersonal).toBe(true);
  });

  it("4. switchWorkspace updates active workspace context state and localStorage", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/default-personal/dashboard"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/*"
              element={<WorkspaceProvider>{children}</WorkspaceProvider>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });

    await act(async () => {
      await result.current.switchWorkspace("ws-team-alpha");
    });

    expect(localStorage.getItem("ai_pm_active_workspace")).toBe("alpha-team");
  });
});
