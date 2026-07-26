import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import AxiosError from "axios";

import { projectMemoryApi } from "@/features/projects/services/project-memory.api";
import { ProjectMemoriesCard } from "./ProjectMemoriesCard";

vi.mock("@/features/projects/services/project-memory.api", () => ({
  projectMemoryApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("ProjectMemoriesCard Component & OCC 409 Lifecycle Tests", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("1. LIST RENDERING: Renders project memory list and context guidance banner", async () => {
    const mockList = {
      items: [
        {
          id: "mem-101",
          content: "Use Postgres for database persistence",
          sourceType: "USER" as const,
          createdAt: "2026-07-26T00:00:00Z",
          updatedAt: "2026-07-26T12:00:00Z",
          version: 0,
        },
      ],
      pagination: {
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(projectMemoryApi.list).mockResolvedValue(mockList);

    render(<ProjectMemoriesCard projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Project Memories")).toBeInTheDocument();
      expect(
        screen.getByText("Use Postgres for database persistence"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Project memory gives Copilot persistent context about this project. Memories are added and managed by you.",
      ),
    ).toBeInTheDocument();
  });

  it("2. EMPTY STATE: Renders empty state banner when zero memories exist", async () => {
    const mockEmpty = {
      items: [],
      pagination: {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(projectMemoryApi.list).mockResolvedValue(mockEmpty);

    render(<ProjectMemoriesCard projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No project memories yet")).toBeInTheDocument();
      expect(screen.getByText("Add First Memory")).toBeInTheDocument();
    });
  });

  it("3. CREATE FLOW & FORM VALIDATION: Create dialog validates input and permits duplicate content", async () => {
    const mockEmpty = {
      items: [],
      pagination: {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(projectMemoryApi.list).mockResolvedValue(mockEmpty);
    vi.mocked(projectMemoryApi.create).mockResolvedValueOnce({
      id: "mem-new",
      content: "Duplicate content allowed",
      sourceType: "USER",
      createdAt: "2026-07-26T00:00:00Z",
      updatedAt: "2026-07-26T00:00:00Z",
      version: 0,
    });

    render(<ProjectMemoriesCard projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Add Memory")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Add Memory"));

    const textarea = screen.getByLabelText("Memory content");
    const saveButton = screen.getByRole("button", { name: "Save Memory" });

    // Whitespace-only input rejected
    fireEvent.change(textarea, { target: { value: "    " } });
    expect(saveButton).toBeDisabled();

    // >1000 character input rejected
    fireEvent.change(textarea, { target: { value: "a".repeat(1005) } });
    expect(saveButton).toBeDisabled();

    // Exactly 1000 characters accepted
    fireEvent.change(textarea, { target: { value: "a".repeat(1000) } });
    expect(saveButton).toBeEnabled();

    // Valid submission with duplicate content allowed
    fireEvent.change(textarea, { target: { value: "Duplicate content allowed" } });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(projectMemoryApi.create).toHaveBeenCalledWith("proj-1", {
        content: "Duplicate content allowed",
      });
    });
  });

  it("4. STRENGTHENED OCC 409 CONFLICT LIFECYCLE (A-G): Complete 409 refresh and retry flow", async () => {
    const memoryV0 = {
      id: "mem-occ",
      content: "Version 0 content",
      sourceType: "USER" as const,
      createdAt: "2026-07-26T00:00:00Z",
      updatedAt: "2026-07-26T00:00:00Z",
      version: 0,
    };

    const memoryV1 = {
      id: "mem-occ",
      content: "Version 1 updated by another session",
      sourceType: "USER" as const,
      createdAt: "2026-07-26T00:00:00Z",
      updatedAt: "2026-07-26T01:00:00Z",
      version: 1,
    };

    // Initial list fetch returns version 0
    vi.mocked(projectMemoryApi.list).mockResolvedValueOnce({
      items: [memoryV0],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    render(<ProjectMemoriesCard projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Version 0 content")).toBeInTheDocument();
    });

    // Open edit dialog
    fireEvent.click(screen.getByLabelText("Edit memory"));

    const textarea = screen.getByLabelText("Edit memory content") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Version 0 content");
    expect(screen.getByText("Version: 0")).toBeInTheDocument();

    // Prepare 409 error response for first attempt
    const error409 = new AxiosError.AxiosError("Conflict error");
    (error409 as any).response = { status: 409, data: { message: "Conflict" } };

    vi.mocked(projectMemoryApi.update).mockRejectedValueOnce(error409);

    // Mock next list query to return version 1
    vi.mocked(projectMemoryApi.list).mockResolvedValueOnce({
      items: [memoryV1],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    // A & B: User clicks save, first PATCH sends expectedVersion: 0, server returns 409
    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(projectMemoryApi.update).toHaveBeenCalledWith("proj-1", "mem-occ", {
        content: "Version 0 content",
        expectedVersion: 0,
      });
    });

    // C, E: UI displays warning and synchronizes content to version 1
    await waitFor(() => {
      expect(screen.getByText("Memory Updated in Another Session")).toBeInTheDocument();
      expect(screen.getByText("Version: 1")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Review & Save Again" })).toBeInTheDocument();
    });

    // D, F, G: User intentionally initiates second retry, sending expectedVersion: 1
    vi.mocked(projectMemoryApi.update).mockResolvedValueOnce({
      ...memoryV1,
      content: "Version 1 updated content saved",
      version: 2,
    });

    const retryButton = screen.getByRole("button", { name: "Review & Save Again" });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(projectMemoryApi.update).toHaveBeenLastCalledWith("proj-1", "mem-occ", {
        content: "Version 1 updated by another session",
        expectedVersion: 1,
      });
    });
  });

  it("5. DELETE & PAGINATION RECOVERY: Hard deletes memory and recovers from empty page 2", async () => {
    // Page 1 initial fetch
    vi.mocked(projectMemoryApi.list).mockResolvedValueOnce({
      items: [
        {
          id: "mem-page1",
          content: "Page 1 item remaining",
          sourceType: "USER",
          createdAt: "2026-07-26T00:00:00Z",
          updatedAt: "2026-07-26T00:00:00Z",
          version: 0,
        },
      ],
      pagination: { page: 1, limit: 25, total: 26, totalPages: 2, hasNextPage: true, hasPreviousPage: false },
    });

    render(<ProjectMemoriesCard projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Page 1 item remaining")).toBeInTheDocument();
    });

    // Page 2 mock response when user clicks Next
    vi.mocked(projectMemoryApi.list).mockResolvedValueOnce({
      items: [
        {
          id: "mem-page2",
          content: "Page 2 item",
          sourceType: "USER",
          createdAt: "2026-07-26T00:00:00Z",
          updatedAt: "2026-07-26T00:00:00Z",
          version: 0,
        },
      ],
      pagination: { page: 2, limit: 25, total: 26, totalPages: 2, hasNextPage: false, hasPreviousPage: true },
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("Page 2 item")).toBeInTheDocument();
    });

    vi.mocked(projectMemoryApi.delete).mockResolvedValueOnce(undefined);

    // After deletion, list query refetch for page 2 returns 0 items
    vi.mocked(projectMemoryApi.list).mockResolvedValueOnce({
      items: [],
      pagination: { page: 2, limit: 25, total: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: true },
    });

    // Page 1 recovery query fetch
    vi.mocked(projectMemoryApi.list).mockResolvedValueOnce({
      items: [
        {
          id: "mem-page1",
          content: "Page 1 item remaining",
          sourceType: "USER",
          createdAt: "2026-07-26T00:00:00Z",
          updatedAt: "2026-07-26T00:00:00Z",
          version: 0,
        },
      ],
      pagination: { page: 1, limit: 25, total: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    fireEvent.click(screen.getByLabelText("Delete memory"));

    await waitFor(() => {
      expect(screen.getByText("Delete Project Memory?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Memory" }));

    await waitFor(() => {
      expect(projectMemoryApi.delete).toHaveBeenCalledWith("proj-1", "mem-page2");
    });

    await waitFor(() => {
      expect(screen.getByText("Page 1 item remaining")).toBeInTheDocument();
    });
  });

  it("6. ARCHIVED PROJECT & PRIVACY AUDIT: Operational on archived projects and hides internal metadata", async () => {
    vi.mocked(projectMemoryApi.list).mockResolvedValue({
      items: [
        {
          id: "mem-privacy",
          content: "Privacy check note",
          sourceType: "USER",
          createdAt: "2026-07-26T00:00:00Z",
          updatedAt: "2026-07-26T00:00:00Z",
          version: 0,
        },
      ],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    render(<ProjectMemoriesCard projectId="proj-1" isArchived={true} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Archived Project")).toBeInTheDocument();
      expect(screen.getByText("Privacy check note")).toBeInTheDocument();
    });

    // Verify owner, projectId, __v field names are NOT rendered in UI text
    expect(screen.queryByText("owner")).toBeNull();
    expect(screen.queryByText("projectId")).toBeNull();
    expect(screen.queryByText("__v")).toBeNull();
  });
});
