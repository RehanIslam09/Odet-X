import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CreateWorkspaceModal, generateSlug } from "./components/CreateWorkspaceModal.js";

const mockMutateAsync = vi.fn().mockResolvedValue({
  id: "ws-new-123",
  name: "Acme Quantum AI",
  slug: "acme-quantum-ai",
  isPersonal: false,
  role: "OWNER",
});

const mockSwitchWorkspace = vi.fn().mockResolvedValue(true);

vi.mock("./hooks/useWorkspaces.js", () => ({
  useCreateWorkspace: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("./context/WorkspaceContext.js", () => ({
  useActiveWorkspace: () => ({
    switchWorkspace: mockSwitchWorkspace,
  }),
}));

describe("Phase 35 WP-04 — Workspace Creation Experience V2 Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Pure helper generateSlug normalizes strings into URL-safe slugs", () => {
    expect(generateSlug("Acme Engineering Team!")).toBe("acme-engineering-team");
    expect(generateSlug("  Research & AI Labs  ")).toBe("research-ai-labs");
    expect(generateSlug("///Special---Characters***")).toBe("special-characters");
  });

  it("2. Step 1 renders Personal and Team workspace type selection cards", () => {
    const handleOpenChange = vi.fn();
    render(
      <MemoryRouter>
        <CreateWorkspaceModal open={true} onOpenChange={handleOpenChange} />
      </MemoryRouter>
    );

    expect(screen.getByText("Create New Workspace")).toBeInTheDocument();
    expect(screen.getByText("Personal Workspace")).toBeInTheDocument();
    expect(screen.getByText("Team Workspace")).toBeInTheDocument();
    expect(screen.getByText("Single owner member")).toBeInTheDocument();
    expect(screen.getByText("Multiple members & roles")).toBeInTheDocument();
  });

  it("3. Selecting Team workspace proceeds to Step 2 with invitation controls", () => {
    render(
      <MemoryRouter>
        <CreateWorkspaceModal open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>
    );

    // Select Team card
    const teamCard = screen.getByText("Team Workspace").closest('[role="radio"]') as HTMLElement;
    expect(teamCard).toBeInTheDocument();
    act(() => {
      teamCard.click();
    });

    // Click Continue
    const continueBtn = screen.getByRole("button", { name: /continue to details/i });
    act(() => {
      continueBtn.click();
    });

    // Step 2 Form & Live Preview rendered
    expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument();
    expect(screen.getByText(/invite team members/i)).toBeInTheDocument();
    expect(screen.getByText(/live preview/i)).toBeInTheDocument();
  });

  it("4. Personal workspace selection in Step 1 hides invitation controls in Step 2", () => {
    render(
      <MemoryRouter>
        <CreateWorkspaceModal open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>
    );

    // Default is Personal Workspace -> Click Continue
    const continueBtn = screen.getByRole("button", { name: /continue to details/i });
    act(() => {
      continueBtn.click();
    });

    expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument();
    expect(screen.queryByText(/invite team members/i)).not.toBeInTheDocument();
  });

  it("5. Auto-slugification auto-generates slug from workspace name until manually edited", () => {
    render(
      <MemoryRouter>
        <CreateWorkspaceModal open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>
    );

    // Go to Step 2
    act(() => {
      screen.getByRole("button", { name: /continue to details/i }).click();
    });

    const nameInput = screen.getByLabelText(/workspace name/i);
    const slugInput = screen.getByPlaceholderText("acme-engineering");

    // Type Workspace Name
    fireEvent.change(nameInput, { target: { value: "Apollo Space Mission" } });
    expect(slugInput).toHaveValue("apollo-space-mission");

    // Manually Edit Slug
    fireEvent.change(slugInput, { target: { value: "custom-apollo-slug" } });
    expect(slugInput).toHaveValue("custom-apollo-slug");

    // Further Name Typing Preserves Manual Custom Slug
    fireEvent.change(nameInput, { target: { value: "Apollo Space Mission Extended" } });
    expect(slugInput).toHaveValue("custom-apollo-slug");
  });

  it("6. Live preview card updates in real-time as user types workspace name", () => {
    render(
      <MemoryRouter>
        <CreateWorkspaceModal open={true} onOpenChange={vi.fn()} />
      </MemoryRouter>
    );

    act(() => {
      screen.getByRole("button", { name: /continue to details/i }).click();
    });

    const nameInput = screen.getByLabelText(/workspace name/i);
    fireEvent.change(nameInput, { target: { value: "Nebula Research" } });

    const previewSection = screen.getByText(/live preview/i).closest("div")?.parentElement;
    expect(within(previewSection!).getByText("Nebula Research")).toBeInTheDocument();
    expect(within(previewSection!).getByText("/w/nebula-research")).toBeInTheDocument();
  });

  it("7. Submitting valid form calls useCreateWorkspace mutation and switches active workspace", async () => {
    const handleOpenChange = vi.fn();
    render(
      <MemoryRouter>
        <CreateWorkspaceModal open={true} onOpenChange={handleOpenChange} />
      </MemoryRouter>
    );

    // Select Team Card
    const teamCard = screen.getByText("Team Workspace").closest('[role="radio"]') as HTMLElement;
    act(() => {
      teamCard.click();
    });

    // Continue to Step 2
    act(() => {
      screen.getByRole("button", { name: /continue to details/i }).click();
    });

    // Fill form
    const nameInput = screen.getByLabelText(/workspace name/i);
    fireEvent.change(nameInput, { target: { value: "Acme Quantum AI" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /create workspace/i });
    await act(async () => {
      submitBtn.click();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      name: "Acme Quantum AI",
      slug: "acme-quantum-ai",
      type: "TEAM",
      color: "indigo",
      initialInvites: undefined,
    });

    expect(mockSwitchWorkspace).toHaveBeenCalledWith("acme-quantum-ai");
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
