import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsPage } from "@/features/settings/pages/SettingsPage.js";
import { GeneralSettingsTab } from "@/features/settings/components/GeneralSettingsTab.js";
import { AISettingsTab } from "@/features/settings/components/AISettingsTab.js";
import { DangerZoneTab } from "@/features/settings/components/DangerZoneTab.js";
import { AdaptiveRouteGuard } from "@/features/settings/components/AdaptiveRouteGuard.js";
import type { Workspace } from "./types/workspace.types.js";

const mockPersonalWorkspace: Workspace = {
  id: "ws-personal-1",
  name: "My Personal Lab",
  slug: "personal-lab",
  ownerId: "user-1",
  isPersonal: true,
  type: "PERSONAL",
  role: "OWNER",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockTeamWorkspace: Workspace = {
  id: "ws-team-1",
  name: "Acme Core Engineering",
  slug: "acme-core",
  ownerId: "user-1",
  isPersonal: false,
  type: "TEAM",
  role: "OWNER",
  memberCount: 8,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

let activeWorkspaceMock: Workspace = mockPersonalWorkspace;
let mockWorkspaces: Workspace[] = [mockPersonalWorkspace, mockTeamWorkspace];

const mockSwitchWorkspace = vi.fn().mockResolvedValue(true);
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("./context/WorkspaceContext.js", () => ({
  useActiveWorkspace: () => ({
    currentWorkspace: activeWorkspaceMock,
    workspaces: mockWorkspaces,
    switchWorkspace: mockSwitchWorkspace,
  }),
}));

vi.mock("./hooks/usePermissions.ts", () => ({
  usePermissions: () => ({
    isOwner: true,
    isAdmin: false,
    role: "OWNER",
  }),
}));

vi.mock("./hooks/useWorkspaces.js", () => ({
  useUpdateWorkspace: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteWorkspace: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

describe("Phase 35 WP-05 — Adaptive Workspace Settings Suite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    activeWorkspaceMock = mockPersonalWorkspace;
  });

  it("1. Settings Page in Personal Workspace hides Members & Roles and Realtime tabs completely", () => {
    activeWorkspaceMock = mockPersonalWorkspace;

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/personal-lab/settings/general"]}>
          <Routes>
            <Route path="w/:workspaceSlug/settings" element={<SettingsPage />}>
              <Route path="general" element={<div>General Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();

    // Inapplicable Team tabs must be completely hidden (0 empty placeholders / 0 disabled tabs)
    expect(screen.queryByText("Members & Roles")).not.toBeInTheDocument();
    expect(screen.queryByText("Realtime & Sockets")).not.toBeInTheDocument();
  });

  it("2. Settings Page in Team Workspace renders all 5 settings tabs cleanly", () => {
    activeWorkspaceMock = mockTeamWorkspace;

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/acme-core/settings/general"]}>
          <Routes>
            <Route path="w/:workspaceSlug/settings" element={<SettingsPage />}>
              <Route path="general" element={<div>General Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Members & Roles")).toBeInTheDocument();
    expect(screen.getByText("Realtime & Sockets")).toBeInTheDocument();
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("3. AdaptiveRouteGuard gracefully redirects Personal workspace trying to access /members back to /general", () => {
    activeWorkspaceMock = mockPersonalWorkspace;

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/w/personal-lab/settings/members"]}>
          <Routes>
            <Route
              path="w/:workspaceSlug/settings/members"
              element={
                <AdaptiveRouteGuard allowedTypes={["TEAM"]}>
                  <div>Members Content</div>
                </AdaptiveRouteGuard>
              }
            />
            <Route
              path="w/:workspaceSlug/settings/general"
              element={<div data-testid="redirected-general">Redirected to General</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("redirected-general")).toBeInTheDocument();
    expect(screen.queryByText("Members Content")).not.toBeInTheDocument();
  });

  it("4. DangerZoneTab in Default Personal Workspace prohibits deletion with explanatory banner", () => {
    activeWorkspaceMock = {
      ...mockPersonalWorkspace,
      slug: "personal",
    };
    mockWorkspaces = [activeWorkspaceMock];

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DangerZoneTab />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Default Personal Workspace Protected")).toBeInTheDocument();
    expect(
      screen.getByText(/Default Personal Workspaces serve as your primary fallback space/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete workspace/i })).not.toBeInTheDocument();
  });

  it("5. DangerZoneTab in Team Workspace requires slug confirmation before deletion", async () => {
    activeWorkspaceMock = mockTeamWorkspace;

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DangerZoneTab />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Open Delete Dialog
    const triggerBtn = screen.getByRole("button", { name: /delete workspace/i });
    act(() => {
      triggerBtn.click();
    });

    expect(screen.getByText("Confirm Workspace Deletion")).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: /permanently delete workspace/i });
    expect(confirmBtn).toBeDisabled();

    // Type matching slug
    const confirmInput = screen.getByPlaceholderText("acme-core");
    fireEvent.change(confirmInput, { target: { value: "acme-core" } });

    expect(confirmBtn).not.toBeDisabled();
    act(() => {
      confirmBtn.click();
    });

    expect(mockDeleteMutate).toHaveBeenCalledWith("ws-team-1", expect.any(Object));
  });

  it("6. GeneralSettingsTab modifying workspace name/slug triggers updateWorkspace mutation", () => {
    activeWorkspaceMock = mockTeamWorkspace;

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GeneralSettingsTab />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const nameInput = screen.getByLabelText(/workspace name/i);
    fireEvent.change(nameInput, { target: { value: "Acme NextGen Core" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    act(() => {
      saveBtn.click();
    });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        workspaceId: "ws-team-1",
        input: {
          name: "Acme NextGen Core",
          slug: "acme-nextgen-core",
        },
      },
      expect.any(Object)
    );
  });

  it("7. AISettingsTab modifying AI tier triggers updateWorkspace mutation", () => {
    activeWorkspaceMock = mockTeamWorkspace;

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AISettingsTab />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const fastTierCard = screen.getByText("Fast Tier");
    act(() => {
      fastTierCard.click();
    });

    const saveBtn = screen.getByRole("button", { name: /save ai settings/i });
    act(() => {
      saveBtn.click();
    });

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        workspaceId: "ws-team-1",
        input: {
          aiSettings: {
            model: "FAST",
            proactiveEnabled: true,
            memoryRetentionDays: 90,
          },
        },
      },
      expect.any(Object)
    );
  });
});
