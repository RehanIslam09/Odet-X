import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkspaceSwitcher } from "./components/WorkspaceSwitcher.js";
import type { Workspace } from "./types/workspace.types.js";

const mockWorkspaces: Workspace[] = [
  {
    id: "ws-personal-1",
    name: "Rehan's Personal Workspace",
    slug: "rehan-personal",
    ownerId: "user-1",
    isPersonal: true,
    role: "OWNER",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "ws-team-1",
    name: "Acme Engineering",
    slug: "acme-engineering",
    ownerId: "user-1",
    isPersonal: false,
    role: "OWNER",
    memberCount: 12,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "ws-team-2",
    name: "AI Startup Core",
    slug: "ai-startup",
    ownerId: "user-2",
    isPersonal: false,
    role: "MEMBER",
    memberCount: 5,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const mockSwitchWorkspace = vi.fn().mockResolvedValue(true);

vi.mock("./context/WorkspaceContext.js", () => ({
  useActiveWorkspace: () => ({
    currentWorkspace: mockWorkspaces[0],
    workspaces: mockWorkspaces,
    switchWorkspace: mockSwitchWorkspace,
    isLoading: false,
    isError: false,
  }),
}));

describe("Phase 35 WP-03 — Workspace Switcher Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Renders trigger button with current active workspace name and type badge", () => {
    render(
      <MemoryRouter>
        <WorkspaceSwitcher />
      </MemoryRouter>
    );

    expect(screen.getByText("Rehan's Personal Workspace")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /select active workspace/i })).toBeInTheDocument();
  });

  it("2. Opens popover dropdown on click and displays grouped Personal and Team sections", () => {
    render(
      <MemoryRouter>
        <WorkspaceSwitcher />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByRole("combobox", { name: /select active workspace/i });
    act(() => {
      triggerBtn.click();
    });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByPlaceholderText("Filter workspaces...")).toBeInTheDocument();
    expect(within(dialog).getByText("Personal Workspaces")).toBeInTheDocument();
    expect(within(dialog).getByText("Team Workspaces")).toBeInTheDocument();

    expect(within(dialog).getByText("Rehan's Personal Workspace")).toBeInTheDocument();
    expect(within(dialog).getByText("Acme Engineering")).toBeInTheDocument();
    expect(within(dialog).getByText("AI Startup Core")).toBeInTheDocument();
    expect(within(dialog).getByText("12 Members")).toBeInTheDocument();
  });

  it("3. Instant filtering reduces workspace list in real-time by query", () => {
    render(
      <MemoryRouter>
        <WorkspaceSwitcher />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByRole("combobox", { name: /select active workspace/i });
    act(() => {
      triggerBtn.click();
    });

    const dialog = screen.getByRole("dialog");
    const searchInput = within(dialog).getByPlaceholderText("Filter workspaces...");
    act(() => {
      fireEvent.change(searchInput, { target: { value: "Acme" } });
    });

    expect(within(dialog).getByText("Acme Engineering")).toBeInTheDocument();
    expect(within(dialog).queryByText("Rehan's Personal Workspace")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("AI Startup Core")).not.toBeInTheDocument();
  });

  it("4. Global keyboard shortcut Cmd+Shift+W / Ctrl+Shift+W toggles popover open", () => {
    render(
      <MemoryRouter>
        <WorkspaceSwitcher />
      </MemoryRouter>
    );

    expect(screen.queryByPlaceholderText("Filter workspaces...")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "w", ctrlKey: true, shiftKey: true, bubbles: true })
      );
    });

    expect(screen.getByPlaceholderText("Filter workspaces...")).toBeInTheDocument();
  });

  it("5. Selecting a workspace triggers switchWorkspace call", async () => {
    render(
      <MemoryRouter>
        <WorkspaceSwitcher />
      </MemoryRouter>
    );

    const triggerBtn = screen.getByRole("combobox", { name: /select active workspace/i });
    act(() => {
      triggerBtn.click();
    });

    const dialog = screen.getByRole("dialog");
    const teamOption = within(dialog).getByText("Acme Engineering");
    await act(async () => {
      teamOption.click();
    });

    expect(mockSwitchWorkspace).toHaveBeenCalledWith("ws-team-1");
  });
});
