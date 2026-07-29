import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { WorkspaceProvider, useActiveWorkspace } from "./context/WorkspaceContext";
import { WorkspaceSwitcher } from "./components/WorkspaceSwitcher";
import type { Workspace } from "./types/workspace.types";

const mockWorkspaces: Workspace[] = [
  {
    id: "ws-111",
    name: "Alice's Workspace",
    slug: "alices-workspace",
    ownerId: "user-1",
    isPersonal: true,
    role: "OWNER",
    memberCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ws-222",
    name: "Acme Product Team",
    slug: "acme-product-team",
    ownerId: "user-1",
    isPersonal: false,
    role: "OWNER",
    memberCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper Test Component to inspect Active Workspace Context & trigger switch
function TestActiveWorkspaceInspector() {
  const { currentWorkspace, currentRole, isLoading, switchWorkspace } = useActiveWorkspace();

  if (isLoading) return <div>Loading Workspace...</div>;

  return (
    <div>
      <span data-testid="ws-name">{currentWorkspace?.name}</span>
      <span data-testid="ws-slug">{currentWorkspace?.slug}</span>
      <span data-testid="ws-role">{currentRole}</span>
      <button
        data-testid="switch-btn"
        onClick={() => switchWorkspace("acme-product-team")}
      >
        Switch Workspace
      </button>
    </div>
  );
}

describe("WP-06 / Gate Final: Frontend Workspace State, Switcher UX & Cache Isolation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    localStorage.clear();
  });

  it("1. Resolves active workspace from URL slug parameter (/w/:workspaceSlug/dashboard)", async () => {
    queryClient.setQueryData(["workspaces", "list"], mockWorkspaces);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/acme-product-team/dashboard"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/*"
              element={
                <WorkspaceProvider>
                  <TestActiveWorkspaceInspector />
                </WorkspaceProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("ws-name").textContent).toBe("Acme Product Team");
    expect(screen.getByTestId("ws-slug").textContent).toBe("acme-product-team");
    expect(screen.getByTestId("ws-role").textContent).toBe("OWNER");
  });

  it("2. Falls back to personal workspace when route param is un-prefixed", async () => {
    queryClient.setQueryData(["workspaces", "list"], mockWorkspaces);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="*"
              element={
                <WorkspaceProvider>
                  <TestActiveWorkspaceInspector />
                </WorkspaceProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("ws-name").textContent).toBe("Alice's Workspace");
    expect(screen.getByTestId("ws-slug").textContent).toBe("alices-workspace");
  });

  it("3. Renders WorkspaceSwitcher with active selection and opens workspace dropdown", async () => {
    const user = userEvent.setup();
    queryClient.setQueryData(["workspaces", "list"], mockWorkspaces);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/alices-workspace/dashboard"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/*"
              element={
                <WorkspaceProvider>
                  <WorkspaceSwitcher />
                </WorkspaceProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const trigger = screen.getByRole("combobox", { name: /select active workspace/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("Alice's Workspace")).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByText("Acme Product Team")).toBeInTheDocument();
    expect(screen.getByText("Create Workspace")).toBeInTheDocument();
  });

  it("4. Workspace switch completely purges query cache (queryClient.clear()) to prevent cross-tenant data leakage", async () => {
    const user = userEvent.setup();
    queryClient.setQueryData(["workspaces", "list"], mockWorkspaces);

    // Populate tenant-sensitive query cache for Workspace A
    queryClient.setQueryData(["projects", "list"], [{ id: "proj-1", name: "Alice Project A" }]);
    queryClient.setQueryData(["tasks", "list"], [{ id: "task-1", title: "Alice Task A" }]);
    queryClient.setQueryData(["dashboard", "overview"], { stats: "Alice Stats" });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/alices-workspace/dashboard"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/*"
              element={
                <WorkspaceProvider>
                  <TestActiveWorkspaceInspector />
                </WorkspaceProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(queryClient.getQueryData(["projects", "list"])).toBeDefined();
    expect(queryClient.getQueryData(["tasks", "list"])).toBeDefined();

    // Trigger workspace switch
    const switchBtn = screen.getByTestId("switch-btn");
    await user.click(switchBtn);

    // Verify all tenant-sensitive queries were purged
    expect(queryClient.getQueryData(["projects", "list"])).toBeUndefined();
    expect(queryClient.getQueryData(["tasks", "list"])).toBeUndefined();
    expect(queryClient.getQueryData(["dashboard", "overview"])).toBeUndefined();
  });
});
