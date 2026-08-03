import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { toast } from "sonner";

import { aiApi } from "../services/ai.api.js";
import type { Project } from "@/features/projects/types/projects.types.js";
import type { Task } from "@/features/tasks/types/tasks.types.js";
import { useGenerateTasks } from "./useGenerateTasks.js";
import { useGenerateProjectSummary } from "./useGenerateProjectSummary.js";
import { useGenerateTaskLabels } from "./useGenerateTaskLabels.js";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock aiApi module
vi.mock("../services/ai.api", () => ({
  aiApi: {
    generateTasks: vi.fn(),
    generateSummary: vi.fn(),
    generateLabels: vi.fn(),
  },
}));

describe("AI Mutation Hooks", () => {
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

  describe("useGenerateTasks", () => {
    it("calls aiApi.generateTasks, invalidates caches, and triggers toast success", async () => {
      const mockTasks = [
        { id: "task-1", title: "Task 1" } as unknown as Task,
        { id: "task-2", title: "Task 2" } as unknown as Task,
      ];
      vi.mocked(aiApi.generateTasks).mockResolvedValueOnce({ items: mockTasks });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useGenerateTasks("proj-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ description: "Build feature" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(aiApi.generateTasks).toHaveBeenCalledWith("proj-123", { description: "Build feature" });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tasks", "list"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects", "summary", "proj-123"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["activities"] });
      expect(toast.success).toHaveBeenCalledWith("2 tasks generated successfully.");
    });
  });

  describe("useGenerateProjectSummary", () => {
    it("calls aiApi.generateSummary, invalidates project detail, and triggers toast success", async () => {
      const mockProject = { id: "proj-123", name: "Project" } as unknown as Project;
      vi.mocked(aiApi.generateSummary).mockResolvedValueOnce({ project: mockProject });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useGenerateProjectSummary("proj-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(aiApi.generateSummary).toHaveBeenCalledWith("proj-123");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects", "detail", "proj-123"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects", "list"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["activities"] });
      expect(toast.success).toHaveBeenCalledWith("Project summary generated successfully.");
    });
  });

  describe("useGenerateTaskLabels", () => {
    it("calls aiApi.generateLabels, invalidates task detail, and triggers toast success", async () => {
      const mockTask = { id: "task-55", labels: ["ai", "auto"] } as unknown as Task;
      vi.mocked(aiApi.generateLabels).mockResolvedValueOnce({ task: mockTask });

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useGenerateTaskLabels("task-55"), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(aiApi.generateLabels).toHaveBeenCalledWith("task-55");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tasks", "detail", "task-55"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tasks", "list"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["activities"] });
      expect(toast.success).toHaveBeenCalledWith("Labels generated and applied successfully.");
    });
  });
});
