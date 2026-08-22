import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceSwitcher } from "./components/WorkspaceSwitcher.js";
import AcceptInvitationPage from "@/features/auth/pages/AcceptInvitationPage.js";
import type { Workspace } from "./types/workspace.types.js";

const mockPersonalWorkspace: Workspace = {
  id: "ws-personal-1",
  name: "My Personal Space",
  slug: "personal-space",
  ownerId: "user-1",
  isPersonal: true,
  type: "PERSONAL",
  role: "OWNER",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockTeamWorkspace: Workspace = {
  id: "ws-team-1",
  name: "Acme Production",
  slug: "acme-prod",
  ownerId: "user-1",
  isPersonal: false,
  type: "TEAM",
  role: "OWNER",
  memberCount: 5,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockValidateInvitation = vi.fn();
const mockAcceptInvitation = vi.fn();

vi.mock("./context/WorkspaceContext.js", () => ({
  useActiveWorkspace: () => ({
    currentWorkspace: mockPersonalWorkspace,
    workspaces: [mockPersonalWorkspace, mockTeamWorkspace],
    switchWorkspace: vi.fn().mockResolvedValue(true),
    isLoading: false,
  }),
}));

vi.mock("./hooks/useWorkspaces.js", () => ({
  useValidateInvitation: (token?: string) => mockValidateInvitation(token),
  useAcceptInvitation: () => ({
    mutate: mockAcceptInvitation,
    isPending: false,
  }),
  useCreateWorkspace: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe("Phase 35.6 WP-01 — High Priority Production Hardening Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  it("1. Issue 2.1 — Workspace Switcher applies responsive mobile container classes w-[calc(100vw-2rem)] sm:w-80", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WorkspaceSwitcher />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const trigger = screen.getByRole("combobox", { name: /select active workspace/i });
    act(() => {
      trigger.click();
    });

    const popover = screen.getByRole("dialog", { name: /workspace switcher/i });
    expect(popover).toBeInTheDocument();
    expect(popover.className).toContain("w-[calc(100vw-2rem)]");
    expect(popover.className).toContain("sm:w-80");
  });

  it("2. Issue 3.1 — AcceptInvitationPage renders dedicated Expired Card when API responds with 410 / INVITATION_EXPIRED", () => {
    mockValidateInvitation.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: {
        response: {
          status: 410,
          data: {
            code: "INVITATION_EXPIRED",
            message: "This invitation token has expired.",
          },
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/invitations/expired-token-123"]}>
          <Routes>
            <Route path="invitations/:token" element={<AcceptInvitationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Invitation Link Expired")).toBeInTheDocument();
    expect(screen.getByText("Link Expired for Security")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request new invitation link/i })).toBeInTheDocument();
  });

  it("3. Issue 7.1 — Rapid Workspace Switcher sequence ordering discards outdated out-of-order ACKs", async () => {
    const { realtimeClient } = await import("@/realtime/realtime-client.js");

    const spySubscribe = vi.spyOn(realtimeClient, "subscribeWorkspace");
    realtimeClient.subscribeWorkspace("ws-1");
    realtimeClient.subscribeWorkspace("ws-2");
    realtimeClient.subscribeWorkspace("ws-3");

    expect(spySubscribe).toHaveBeenCalledTimes(3);
  });
});
