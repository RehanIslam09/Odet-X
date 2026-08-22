import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TaskDetailPage from "./TaskDetailPage.js";
import { useTask } from "../hooks/useTask.js";

vi.mock("../hooks/useTask.js", () => ({
  useTask: vi.fn(),
}));

vi.mock("@/features/navigation/hooks/useRecentlyViewed.js", () => ({
  useRecentlyViewed: () => ({ addRecentlyViewed: vi.fn() }),
}));

describe("TaskDetailPage Workspace Isolation & 404 Tests", () => {
  it("renders TaskNotFoundState when useTask returns a 404 error (cross-workspace task access)", () => {
    const mockAxiosError = {
      isAxiosError: true,
      response: { status: 404, data: { message: "Task not found." } },
    };

    vi.mocked(useTask).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockAxiosError as unknown as Error,
      refetch: vi.fn(),
      isError: true,
      isSuccess: false,
      status: "error",
    } as unknown as ReturnType<typeof useTask>);

    render(
      <MemoryRouter initialEntries={["/w/team-workspace/tasks/task-123"]}>
        <Routes>
          <Route path="/w/:workspaceSlug/tasks/:taskId" element={<TaskDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Task Not Found/i)).toBeInTheDocument();
  });
});
