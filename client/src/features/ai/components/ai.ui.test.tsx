import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { GenerateTasksDialog } from "@/features/projects/components/GenerateTasksDialog";
import { ProjectAISummaryCard } from "@/features/projects/components/ProjectAISummaryCard";
import { TaskPropertiesPanel } from "@/features/tasks/components/TaskPropertiesPanel";
import { useGenerateTasks, useGenerateProjectSummary, useGenerateTaskLabels } from "@/features/ai";
import type { Project } from "@/features/projects/types/projects.types";
import type { Task } from "@/features/tasks/types/tasks.types";

// Mock AI hooks
vi.mock("@/features/ai", () => ({
  useGenerateTasks: vi.fn(),
  useGenerateProjectSummary: vi.fn(),
  useGenerateTaskLabels: vi.fn(),
}));

// Mock project hook
vi.mock("@/features/projects/hooks/useProject.js", () => ({
  useProject: vi.fn(() => ({ data: { project: null } })),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe("WP-03 AI UI Components & Interactions", () => {
  const mockGenerateTasksMutate = vi.fn();
  const mockGenerateSummaryMutate = vi.fn();
  const mockGenerateLabelsMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGenerateTasks).mockReturnValue({
      mutate: mockGenerateTasksMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateTasks>);

    vi.mocked(useGenerateProjectSummary).mockReturnValue({
      mutate: mockGenerateSummaryMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateProjectSummary>);

    vi.mocked(useGenerateTaskLabels).mockReturnValue({
      mutate: mockGenerateLabelsMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateTaskLabels>);
  });

  // =========================================================================
  // GenerateTasksDialog
  // =========================================================================
  describe("GenerateTasksDialog", () => {
    it("renders dialog when open and prevents empty submission", () => {
      const handleOpenChange = vi.fn();

      render(
        <MemoryRouter>
          <GenerateTasksDialog
            projectId="proj-1"
            open={true}
            onOpenChange={handleOpenChange}
          />
        </MemoryRouter>,
      );

      // Verify header and description
      expect(screen.getByText("Generate Tasks with AI")).toBeInTheDocument();
      expect(
        screen.getByText(/Describe what feature, module, or goal/i),
      ).toBeInTheDocument();

      // Submit empty form -> should NOT trigger mutation
      const submitBtn = screen.getByRole("button", { name: /Generate Tasks/i });
      fireEvent.click(submitBtn);

      expect(mockGenerateTasksMutate).not.toHaveBeenCalled();
    });

    it("triggers generateTasks mutation on valid input", () => {
      render(
        <MemoryRouter>
          <GenerateTasksDialog
            projectId="proj-1"
            open={true}
            onOpenChange={vi.fn()}
          />
        </MemoryRouter>,
      );

      const input = screen.getByPlaceholderText(/Build user authentication/i);
      fireEvent.change(input, {
        target: { value: "Implement OAuth2 login with Google" },
      });

      const submitBtn = screen.getByRole("button", { name: /Generate Tasks/i });
      fireEvent.click(submitBtn);

      expect(mockGenerateTasksMutate).toHaveBeenCalledWith(
        { description: "Implement OAuth2 login with Google" },
        expect.any(Object),
      );
    });

    it("shows loading state and disables buttons while pending", () => {
      vi.mocked(useGenerateTasks).mockReturnValue({
        mutate: mockGenerateTasksMutate,
        isPending: true,
      } as unknown as ReturnType<typeof useGenerateTasks>);

      render(
        <MemoryRouter>
          <GenerateTasksDialog
            projectId="proj-1"
            open={true}
            onOpenChange={vi.fn()}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Generating Tasks/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
    });
  });

  // =========================================================================
  // ProjectAISummaryCard
  // =========================================================================
  describe("ProjectAISummaryCard", () => {
    const mockProject: Project = {
      id: "proj-1",
      name: "Core Infrastructure",
      description: "Main backend and frontend repo",
      emoji: "📁",
      color: "#6366f1",
      owner: "user-1",
      archived: false,
      createdAt: "2026-07-24T00:00:00.000Z",
      updatedAt: "2026-07-24T00:00:00.000Z",
    };

    it("renders empty state when project has no aiSummary", () => {
      render(<ProjectAISummaryCard project={mockProject} />);

      expect(screen.getByText(/No AI summary generated/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Generate AI Summary/i }),
      ).toBeInTheDocument();
    });

    it("renders summary, highlights, and risks when aiSummary exists", () => {
      const projectWithSummary: Project = {
        ...mockProject,
        aiSummary: {
          summary: "Project is proceeding according to schedule.",
          highlights: ["Frontend architecture completed", "API spec finalized"],
          risks: ["Third-party auth rate limits"],
        },
      };

      render(<ProjectAISummaryCard project={projectWithSummary} />);

      expect(
        screen.getByText("Project is proceeding according to schedule."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Frontend architecture completed"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Third-party auth rate limits"),
      ).toBeInTheDocument();
    });

    it("triggers summary generation mutation when button is clicked", () => {
      render(<ProjectAISummaryCard project={mockProject} />);

      const generateBtn = screen.getByRole("button", {
        name: /Generate AI Summary/i,
      });
      fireEvent.click(generateBtn);

      expect(mockGenerateSummaryMutate).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // TaskPropertiesPanel Labels Integration
  // =========================================================================
  describe("TaskPropertiesPanel Labels Integration", () => {
    it("renders AI Labels button and triggers label generation mutation", () => {
      const mockTask: Task = {
        id: "task-100",
        title: "Test Task",
        description: "Test description",
        status: "todo",
        priority: "medium",
        projectId: "proj-1",
        dueDate: null,
        estimatedTime: null,
        labels: ["frontend", "auth"],
        archived: false,
        isDeleted: false,
        completedAt: null,
        createdAt: "2026-07-24T00:00:00.000Z",
        updatedAt: "2026-07-24T00:00:00.000Z",
        version: 1,
      };

      const queryClient = createTestQueryClient();

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <TaskPropertiesPanel task={mockTask} />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      expect(screen.getByText("frontend")).toBeInTheDocument();
      expect(screen.getByText("auth")).toBeInTheDocument();

      const aiLabelsBtn = screen.getByRole("button", { name: /AI Labels/i });
      fireEvent.click(aiLabelsBtn);

      expect(mockGenerateLabelsMutate).toHaveBeenCalled();
    });
  });
});
