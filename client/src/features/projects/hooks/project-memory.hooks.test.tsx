import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { projectMemoryApi } from "@/features/projects/services/project-memory.api";
import {
  useProjectMemories,
  projectMemoryKeys,
} from "./useProjectMemories";
import { useCreateProjectMemory } from "./useCreateProjectMemory";
import { useUpdateProjectMemory } from "./useUpdateProjectMemory";
import { useDeleteProjectMemory } from "./useDeleteProjectMemory";

vi.mock("@/features/projects/services/project-memory.api", () => ({
  projectMemoryApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Project Memory TanStack Query Hooks", () => {
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

  it("useProjectMemories fetches memory list using project-scoped query key", async () => {
    const mockData = {
      items: [
        {
          id: "mem-1",
          content: "Hook test note",
          sourceType: "USER" as const,
          createdAt: "2026-07-26T00:00:00Z",
          updatedAt: "2026-07-26T00:00:00Z",
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

    vi.mocked(projectMemoryApi.list).mockResolvedValueOnce(mockData);

    const { result } = renderHook(
      () => useProjectMemories("proj-100", { page: 1, limit: 25 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(projectMemoryApi.list).toHaveBeenCalledWith("proj-100", {
      page: 1,
      limit: 25,
    });
    expect(result.current.data).toEqual(mockData);
  });

  it("useCreateProjectMemory invalidates project-scoped list queries on success", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const mockMemory = {
      id: "mem-new",
      content: "Created via hook",
      sourceType: "USER" as const,
      createdAt: "2026-07-26T00:00:00Z",
      updatedAt: "2026-07-26T00:00:00Z",
      version: 0,
    };

    vi.mocked(projectMemoryApi.create).mockResolvedValueOnce(mockMemory);

    const { result } = renderHook(() => useCreateProjectMemory("proj-100"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ content: "Created via hook" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: projectMemoryKeys.projectLists("proj-100"),
    });
  });

  it("useUpdateProjectMemory invalidates project lists on success and on error", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const mockUpdatedMemory = {
      id: "mem-1",
      content: "Updated hook note",
      sourceType: "USER" as const,
      createdAt: "2026-07-26T00:00:00Z",
      updatedAt: "2026-07-26T01:00:00Z",
      version: 1,
    };

    vi.mocked(projectMemoryApi.update).mockResolvedValueOnce(mockUpdatedMemory);

    const { result } = renderHook(() => useUpdateProjectMemory("proj-100"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      memoryId: "mem-1",
      data: { content: "Updated hook note", expectedVersion: 0 },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: projectMemoryKeys.projectLists("proj-100"),
    });
  });

  it("useDeleteProjectMemory invalidates project lists on success", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.mocked(projectMemoryApi.delete).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteProjectMemory("proj-100"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("mem-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: projectMemoryKeys.projectLists("proj-100"),
    });
  });
});
