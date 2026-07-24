import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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

describe("WP-03 AI UI Components & Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGenerateTasks).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateTasks>);

    vi.mocked(useGenerateProjectSummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateProjectSummary>);

    vi.mocked(useGenerateTaskLabels).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateTaskLabels>);
  });

  describe("GenerateTasksDialog", () => {
    it("renders dialog when open and prevents empty submission", async () => {
      const mockMutate = vi.fn();
      vi.mocked(useGenerateTasks).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useGenerateTasks>);

      render(
        <GenerateTasksDialog projectId="proj-1" open={true} onOpenChange={vi.fn()} />,
      );

      expect(screen.getByText("Generate Tasks with AI")).toBeInTheDocument();

      // Submit empty form
      const submitBtn = screen.getByRole("button", { name: /Generate Tasks/i });
      fireEvent.click(submitBtn);

      expect(mockMutate).not.toHaveBeenCalled();
      expect(
        screen.getByText("Please enter a description for the tasks you want to generate."),
      ).toBeInTheDocument();
    });

    it("triggers generateTasks mutation on valid input", async () => {
      const mockMutate = vi.fn();
      vi.mocked(useGenerateTasks).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useGenerateTasks>);

      render(
        <GenerateTasksDialog projectId="proj-1" open={true} onOpenChange={vi.fn()} />,
      );

      const textarea = screen.getByLabelText(/Project Requirement/i);
      fireEvent.change(textarea, { target: { value: "Build payment integration" } });

      const submitBtn = screen.getByRole("button", { name: /Generate Tasks/i });
      fireEvent.click(submitBtn);

      expect(mockMutate).toHaveBeenCalledWith(
        { description: "Build payment integration" },
        expect.any(Object),
      );
    });

    it("shows loading state and disables buttons while pending", () => {
      vi.mocked(useGenerateTasks).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as unknown as ReturnType<typeof useGenerateTasks>);

      render(
        <GenerateTasksDialog projectId="proj-1" open={true} onOpenChange={vi.fn()} />,
      );

      expect(screen.getByText("Generating Tasks…")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Generating Tasks…/i })).toBeDisabled();
    });
  });

  describe("ProjectAISummaryCard", () => {
    it("renders empty state when project has no aiSummary", () => {
      const mockProject: Project = {
        id: "proj-1",
        name: "Test Project",
        description: "",
        emoji: "📁",
        color: "#6366f1",
        archived: false,
        owner: "user-1",
        createdAt: "2026-07-24T00:00:00.000Z",
        updatedAt: "2026-07-24T00:00:00.000Z",
      };

      render(<ProjectAISummaryCard project={mockProject} />);

      expect(screen.getByText("AI Project Summary")).toBeInTheDocument();
      expect(screen.getByText(/No AI summary generated for this project yet/i)).toBeInTheDocument();
    });

    it("renders summary, highlights, and risks when aiSummary exists", () => {
      const mockProject: Project = {
        id: "proj-1",
        name: "Test Project",
        description: "",
        emoji: "📁",
        color: "#6366f1",
        archived: false,
        owner: "user-1",
        aiSummary: {
          summary: "The project is making great progress on core infrastructure.",
          highlights: ["Database migration complete", "API gateway operational"],
          risks: [" tight timeline for frontend integration"],
        },
        createdAt: "2026-07-24T00:00:00.000Z",
        updatedAt: "2026-07-24T00:00:00.000Z",
      };

      render(<ProjectAISummaryCard project={mockProject} />);

      expect(screen.getByText("The project is making great progress on core infrastructure.")).toBeInTheDocument();
      expect(screen.getByText("Database migration complete")).toBeInTheDocument();
      expect(screen.getByText("tight timeline for frontend integration")).toBeInTheDocument();
      expect(screen.getByText("Regenerate")).toBeInTheDocument();
    });

    it("triggers summary generation mutation when button is clicked", () => {
      const mockMutate = vi.fn();
      vi.mocked(useGenerateProjectSummary).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useGenerateProjectSummary>);

      const mockProject: Project = {
        id: "proj-1",
        name: "Test Project",
        description: "",
        emoji: "📁",
        color: "#6366f1",
        archived: false,
        owner: "user-1",
        createdAt: "2026-07-24T00:00:00.000Z",
        updatedAt: "2026-07-24T00:00:00.000Z",
      };

      render(<ProjectAISummaryCard project={mockProject} />);

      const btn = screen.getAllByRole("button", { name: /Generate Summary|Generate AI Summary/i })[0];
      fireEvent.click(btn);

      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe("TaskPropertiesPanel Labels Integration", () => {
    it("renders AI Labels button and triggers label generation mutation", () => {
      const mockMutate = vi.fn();
      vi.mocked(useGenerateTaskLabels).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof useGenerateTaskLabels>);

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

      render(
        <MemoryRouter>
          <TaskPropertiesPanel task={mockTask} />
        </MemoryRouter>,
      );

      expect(screen.getByText("frontend")).toBeInTheDocument();
      expect(screen.getByText("auth")).toBeInTheDocument();

      const aiLabelsBtn = screen.getByRole("button", { name: /AI Labels/i });
      fireEvent.click(aiLabelsBtn);

      expect(mockMutate).toHaveBeenCalled();
    });
  });
});
