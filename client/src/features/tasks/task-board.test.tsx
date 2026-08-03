import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TaskBoardView } from "./components/TaskBoardView.js";
import { TaskBoardCard } from "./components/TaskBoardCard.js";
import { TaskViewToggle } from "./components/TaskViewToggle.js";
import type { Task } from "./types/tasks.types.js";

const mockTask: Task & { projectName?: string; projectColor?: string } = {
  id: "task-101",
  projectId: "proj-1",
  projectName: "Engineering Core",
  projectColor: "#3b82f6",
  title: "Implement Production Kanban Board",
  description: "Complete Phase 34.5 WP-02 deliverables.",
  notes: "",
  status: "in_progress",
  priority: "high",
  dueDate: "2026-08-15T00:00:00.000Z",
  estimatedTime: "2d",
  labels: ["frontend", "ux"],
  archived: false,
  isDeleted: false,
  completedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
  version: 1,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
}

describe("WP-02 Kanban Board & View Architecture Component Tests", () => {
  it("1. TaskBoardView renders 6 status columns dynamically", () => {
    renderWithProviders(<TaskBoardView tasks={[mockTask]} />);

    expect(screen.getByText("Backlog")).toBeDefined();
    expect(screen.getByText("Todo")).toBeDefined();
    expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
    expect(screen.getByText("In Review")).toBeDefined();
    expect(screen.getByText("Done")).toBeDefined();
    expect(screen.getByText("Cancelled")).toBeDefined();
    expect(screen.getByText("Implement Production Kanban Board")).toBeDefined();
  });

  it("2. TaskBoardCard renders title, priority, project tag, and labels correctly", () => {
    const onStatusChange = vi.fn();

    renderWithProviders(<TaskBoardCard task={mockTask} onStatusChange={onStatusChange} />);

    expect(screen.getByText("Implement Production Kanban Board")).toBeDefined();
    expect(screen.getByText("Engineering Core")).toBeDefined();
    expect(screen.getByText("frontend")).toBeDefined();
    expect(screen.getByText("ux")).toBeDefined();
  });

  it("3. TaskViewToggle renders active List and Board buttons without disabled state", () => {
    const onViewChange = vi.fn();

    render(<TaskViewToggle view="list" onViewChange={onViewChange} />);

    const listBtn = screen.getByRole("button", { name: /list/i });
    const boardBtn = screen.getByRole("button", { name: /board/i });

    expect(listBtn).toBeDefined();
    expect(boardBtn).toBeDefined();
    expect(boardBtn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(boardBtn);
    expect(onViewChange).toHaveBeenCalledWith("board");
  });
});
