import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { realtimeClient } from "./realtime-client";
import { RealtimeProvider } from "./RealtimeProvider";
import { useRealtime } from "./RealtimeContext";
import { WorkspacePresenceStack } from "@/features/workspaces/components/WorkspacePresenceStack";
import { ConnectionStatusBadge } from "@/features/workspaces/components/ConnectionStatusBadge";
import { ViewingCollaborators } from "@/features/tasks/components/ViewingCollaborators";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext";
import { useAuthStore } from "@/store/auth.store";
import type { RealtimeEventEnvelope, WorkspacePresenceSnapshot } from "./realtime-types";

// Mock WorkspaceContext hook
vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useActiveWorkspace: vi.fn(),
}));

function E2EApplicationShell() {
  const { status, connected } = useRealtime();
  return (
    <div>
      <header>
        <WorkspacePresenceStack />
        <ConnectionStatusBadge />
        <span data-testid="app-status">{status}</span>
        <span data-testid="app-connected">{connected ? "yes" : "no"}</span>
      </header>
      <main>
        <ViewingCollaborators />
      </main>
    </div>
  );
}

describe("WP-4 — End-to-End Realtime UI Integration & Hardening Verification", () => {
  let queryClient: QueryClient;
  const WS_ID = "ws-e2e-1";

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.restoreAllMocks();

    vi.mocked(useActiveWorkspace).mockReturnValue({
      workspaces: [
        {
          id: "ws-e2e-1",
          name: "E2E Workspace 1",
          slug: "e2e-1",
          isPersonal: true,
          role: "OWNER",
          ownerId: "user-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "ws-e2e-2",
          name: "E2E Workspace 2",
          slug: "e2e-2",
          isPersonal: false,
          role: "MEMBER",
          ownerId: "user-2",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      currentWorkspace: {
        id: "ws-e2e-1",
        name: "E2E Workspace 1",
        slug: "e2e-1",
        isPersonal: true,
        role: "OWNER",
        ownerId: "user-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      currentRole: "OWNER",
      isLoading: false,
      isError: false,
      switchWorkspace: vi.fn(),
      getWorkspaceHref: (sub) => `/w/e2e-1/${sub}`,
    });

    useAuthStore.setState({
      isBootstrapping: false,
      user: {
        id: "user-1",
        name: "User One",
        email: "one@example.com",
        username: "userone",
        avatar: "",
        bio: "",
        isEmailVerified: true,
        isActive: true,
        preferences: {
          appearance: { theme: "system", density: "comfortable" },
          locale: { timezone: "UTC", language: "en", dateFormat: "MM/DD/YYYY" },
          notifications: {
            emailNotifications: true,
            desktopNotifications: true,
            weeklyAiSummary: true,
            projectActivity: true,
            taskReminders: true,
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    queryClient.clear();
    realtimeClient.disconnect();
  });

  it("1. Complete E2E Journey: App Shell Mount -> Subscription -> Presence -> Viewing -> Event Routing", () => {
    const subscribeSpy = vi.spyOn(realtimeClient, "subscribeWorkspace");
    const setViewingSpy = vi.spyOn(realtimeClient, "setViewingResource");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/e2e-1/tasks/task-999"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/tasks/:taskId"
              element={
                <RealtimeProvider>
                  <E2EApplicationShell />
                </RealtimeProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // A. Verify subscription triggered on mount
    expect(subscribeSpy).toHaveBeenCalledWith(WS_ID);

    // B. Verify route viewing awareness emitted
    expect(setViewingSpy).toHaveBeenCalledWith({
      resourceType: "task",
      resourceId: "task-999",
    });

    // C. Dispatch incoming presence snapshot
    const snapshot: WorkspacePresenceSnapshot = {
      workspaceId: WS_ID,
      users: [
        {
          userId: "user-2",
          name: "User Two",
          username: "usertwo",
          viewing: { resourceType: "task", resourceId: "task-999" },
        },
      ],
    };

    act(() => {
      // @ts-expect-error accessing private handler for unit test
      realtimeClient.handleIncomingPresence(snapshot);
    });

    expect(screen.getByTestId("workspace-presence-stack")).toBeInTheDocument();
    expect(screen.getByTestId("viewing-collaborators")).toBeInTheDocument();

    // D. Dispatch domain event and verify TanStack Query invalidation
    const event: RealtimeEventEnvelope = {
      id: "e2e-evt-1",
      protocolVersion: 1,
      type: "task.updated",
      workspaceId: WS_ID,
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "task-999" },
      payload: {},
    };

    act(() => {
      // @ts-expect-error accessing private handler for unit test
      realtimeClient.handleIncomingDomainEvent(event);
    });

    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("2. Logout disconnects transport and resets state machine cleanly", () => {
    const disconnectSpy = vi.spyOn(realtimeClient, "disconnect");

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/e2e-1/dashboard"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/dashboard"
              element={
                <RealtimeProvider>
                  <E2EApplicationShell />
                </RealtimeProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    act(() => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
      });
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/e2e-1/dashboard"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/dashboard"
              element={
                <RealtimeProvider>
                  <E2EApplicationShell />
                </RealtimeProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(disconnectSpy).toHaveBeenCalled();
    expect(screen.getByTestId("app-status").textContent).toBe("disconnected");
  });

  it("3. Eviction event triggers disconnect and clears query cache", () => {
    const disconnectSpy = vi.spyOn(realtimeClient, "disconnect");
    const clearSpy = vi.spyOn(queryClient, "clear");

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/e2e-1/dashboard"]}>
          <Routes>
            <Route
              path="/w/:workspaceSlug/dashboard"
              element={
                <RealtimeProvider>
                  <E2EApplicationShell />
                </RealtimeProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    act(() => {
      // @ts-expect-error accessing private handler for unit test
      realtimeClient.handleIncomingEvicted({
        workspaceId: WS_ID,
        targetUserId: "user-1",
        reason: "Access revoked",
      });
    });

    expect(disconnectSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
  });
});
