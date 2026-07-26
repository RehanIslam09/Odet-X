import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/services/axios";
import { projectMemoryApi } from "./project-memory.api";

vi.mock("@/services/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("projectMemoryApi Service Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list sends GET to /projects/:projectId/memories with query params", async () => {
    const mockData = {
      items: [
        {
          id: "mem-1",
          content: "Test note",
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

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { success: true, message: "OK", data: mockData },
    });

    const res = await projectMemoryApi.list("proj-1", { page: 1, limit: 25 });
    expect(apiClient.get).toHaveBeenCalledWith("/projects/proj-1/memories", {
      params: { page: 1, limit: 25 },
    });
    expect(res).toEqual(mockData);
  });

  it("create sends POST to /projects/:projectId/memories with data", async () => {
    const mockMemory = {
      id: "mem-2",
      content: "New note",
      sourceType: "USER" as const,
      createdAt: "2026-07-26T00:00:00Z",
      updatedAt: "2026-07-26T00:00:00Z",
      version: 0,
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { success: true, message: "Created", data: { memory: mockMemory } },
    });

    const res = await projectMemoryApi.create("proj-1", { content: "New note" });
    expect(apiClient.post).toHaveBeenCalledWith("/projects/proj-1/memories", {
      content: "New note",
    });
    expect(res).toEqual(mockMemory);
  });

  it("update sends PATCH to /projects/:projectId/memories/:memoryId with expectedVersion", async () => {
    const mockUpdatedMemory = {
      id: "mem-2",
      content: "Updated note",
      sourceType: "USER" as const,
      createdAt: "2026-07-26T00:00:00Z",
      updatedAt: "2026-07-26T01:00:00Z",
      version: 1,
    };

    vi.mocked(apiClient.patch).mockResolvedValueOnce({
      data: {
        success: true,
        message: "Updated",
        data: { memory: mockUpdatedMemory },
      },
    });

    const res = await projectMemoryApi.update("proj-1", "mem-2", {
      content: "Updated note",
      expectedVersion: 0,
    });
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/projects/proj-1/memories/mem-2",
      { content: "Updated note", expectedVersion: 0 },
    );
    expect(res).toEqual(mockUpdatedMemory);
  });

  it("delete sends DELETE to /projects/:projectId/memories/:memoryId", async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({
      data: { success: true, message: "Deleted" },
    });

    await projectMemoryApi.delete("proj-1", "mem-2");
    expect(apiClient.delete).toHaveBeenCalledWith("/projects/proj-1/memories/mem-2");
  });
});
