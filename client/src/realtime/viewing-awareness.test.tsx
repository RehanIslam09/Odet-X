import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { realtimeClient } from "./realtime-client";
import { ViewingCollaborators } from "@/features/tasks/components/ViewingCollaborators";
import { usePresenceAwareness } from "./usePresenceAwareness";
import type { WorkspacePresenceSnapshot } from "./realtime-types";

function TestViewingRouteComponent() {
  const { activeViewingUsers } = usePresenceAwareness();
  return (
    <div>
      <ViewingCollaborators />
      <span data-testid="viewer-count">{activeViewingUsers.length}</span>
    </div>
  );
}

describe("WP-3 — Viewing Awareness & Resource Routing Integration Tests", () => {
  const WORKSPACE_ID = "ws-alpha";
  const TASK_ID = "task-777";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    realtimeClient.disconnect();
  });

  it("1. ViewingCollaborators renders null when no collaborators are viewing active resource", () => {
    const { container } = render(
      <MemoryRouter initialEntries={[`/w/personal/tasks/${TASK_ID}`]}>
        <Routes>
          <Route path="/w/:workspaceSlug/tasks/:taskId" element={<TestViewingRouteComponent />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("viewer-count").textContent).toBe("0");
    expect(container.querySelector('[data-testid="viewing-collaborators"]')).toBeNull();
  });

  it("2. Route detection automatically emits presence:viewing on route enter and clear on leave", () => {
    const setViewingSpy = vi.spyOn(realtimeClient, "setViewingResource");

    const { unmount } = render(
      <MemoryRouter initialEntries={[`/w/personal/tasks/${TASK_ID}`]}>
        <Routes>
          <Route path="/w/:workspaceSlug/tasks/:taskId" element={<TestViewingRouteComponent />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(setViewingSpy).toHaveBeenCalledWith({
      resourceType: "task",
      resourceId: TASK_ID,
    });

    unmount();

    expect(setViewingSpy).toHaveBeenCalledWith(null);
  });

  it("3. Presence snapshot updates activeViewingUsers and renders ViewingCollaborators banner", () => {
    render(
      <MemoryRouter initialEntries={[`/w/personal/tasks/${TASK_ID}`]}>
        <Routes>
          <Route path="/w/:workspaceSlug/tasks/:taskId" element={<TestViewingRouteComponent />} />
        </Routes>
      </MemoryRouter>,
    );

    const snapshot: WorkspacePresenceSnapshot = {
      workspaceId: WORKSPACE_ID,
      users: [
        {
          userId: "u1",
          name: "Jane Doe",
          username: "janedoe",
          viewing: { resourceType: "task", resourceId: TASK_ID },
        },
      ],
    };

    act(() => {
      // @ts-expect-error accessing private handler for unit test verification
      realtimeClient.handleIncomingPresence(snapshot);
    });

    expect(screen.getByTestId("viewer-count").textContent).toBe("1");
    expect(screen.getByTestId("viewing-collaborators")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe is viewing")).toBeInTheDocument();
  });

  it("4. Multiple viewers are formatted cleanly with overflow badge", () => {
    render(
      <MemoryRouter initialEntries={[`/w/personal/tasks/${TASK_ID}`]}>
        <Routes>
          <Route path="/w/:workspaceSlug/tasks/:taskId" element={<TestViewingRouteComponent />} />
        </Routes>
      </MemoryRouter>,
    );

    const snapshot: WorkspacePresenceSnapshot = {
      workspaceId: WORKSPACE_ID,
      users: Array.from({ length: 6 }, (_, i) => ({
        userId: `viewer-${i + 1}`,
        name: `Viewer ${i + 1}`,
        username: `viewer${i + 1}`,
        viewing: { resourceType: "task", resourceId: TASK_ID },
      })),
    };

    act(() => {
      // @ts-expect-error accessing private handler for unit test verification
      realtimeClient.handleIncomingPresence(snapshot);
    });

    expect(screen.getByTestId("viewer-count").textContent).toBe("6");
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});
