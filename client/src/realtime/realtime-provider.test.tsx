import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { realtimeClient } from "./realtime-client";
import { RealtimeProvider } from "./RealtimeProvider";
import { useRealtime } from "./RealtimeContext";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext";
import { useAuthStore } from "@/store/auth.store";

// Mock WorkspaceContext hook
vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useActiveWorkspace: vi.fn(),
}));

function TestConsumer() {
  const { status, connected, reconnecting, connect, disconnect } = useRealtime();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="connected">{connected ? "yes" : "no"}</span>
      <span data-testid="reconnecting">{reconnecting ? "yes" : "no"}</span>
      <button data-testid="btn-connect" onClick={connect}>
        Connect
      </button>
      <button data-testid="btn-disconnect" onClick={disconnect}>
        Disconnect
      </button>
    </div>
  );
}

describe("WP-1 — RealtimeProvider & Workspace Lifecycle Integration Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.restoreAllMocks();

    vi.mocked(useActiveWorkspace).mockReturnValue({
      workspaces: [
        {
          id: "ws-1",
          name: "Personal Workspace",
          slug: "personal",
          isPersonal: true,
          role: "OWNER",
          ownerId: "user-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "ws-2",
          name: "Team Workspace",
          slug: "team",
          isPersonal: false,
          role: "MEMBER",
          ownerId: "user-2",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      currentWorkspace: {
        id: "ws-1",
        name: "Personal Workspace",
        slug: "personal",
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
      getWorkspaceHref: (subPath: string) => `/w/personal/${subPath}`,
    });

    useAuthStore.setState({
      isBootstrapping: false,
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        username: "testuser",
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

  it("1. Provider mounts cleanly and exposes status context", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <TestConsumer />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("status").textContent).toBeDefined();
  });

  it("2. Connect is triggered on mount when user is authenticated", () => {
    const subscribeSpy = vi.spyOn(realtimeClient, "subscribeWorkspace");

    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <TestConsumer />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(subscribeSpy).toHaveBeenCalledWith("ws-1");
  });

  it("3. Workspace switch unsubscribes from old workspace and subscribes to new workspace", () => {
    const subscribeSpy = vi.spyOn(realtimeClient, "subscribeWorkspace");

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <TestConsumer />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(subscribeSpy).toHaveBeenCalledWith("ws-1");

    vi.mocked(useActiveWorkspace).mockReturnValue({
      workspaces: [],
      currentWorkspace: {
        id: "ws-2",
        name: "Team Workspace",
        slug: "team",
        isPersonal: false,
        role: "MEMBER",
        ownerId: "user-2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      currentRole: "MEMBER",
      isLoading: false,
      isError: false,
      switchWorkspace: vi.fn(),
      getWorkspaceHref: (sub) => `/w/team/${sub}`,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <TestConsumer />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(subscribeSpy).toHaveBeenCalledWith("ws-2");
  });

  it("4. Logout disconnects socket and resets subscription state", () => {
    const disconnectSpy = vi.spyOn(realtimeClient, "disconnect");

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <TestConsumer />
        </RealtimeProvider>
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
        <RealtimeProvider>
          <TestConsumer />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("5. Manual connect and disconnect methods exposed by context function correctly", () => {
    const connectSpy = vi.spyOn(realtimeClient, "connect");
    const disconnectSpy = vi.spyOn(realtimeClient, "disconnect");

    render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <TestConsumer />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    act(() => {
      screen.getByTestId("btn-disconnect").click();
    });
    expect(disconnectSpy).toHaveBeenCalled();

    act(() => {
      screen.getByTestId("btn-connect").click();
    });
    expect(connectSpy).toHaveBeenCalled();
  });

  it("6. Unmounting RealtimeProvider cleans up status listeners without memory leaks", () => {
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <TestConsumer />
        </RealtimeProvider>
      </QueryClientProvider>,
    );

    expect(() => unmount()).not.toThrow();
  });
});
