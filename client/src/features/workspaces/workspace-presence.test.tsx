import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { realtimeClient } from "@/realtime/realtime-client";
import { WorkspacePresenceStack } from "./components/WorkspacePresenceStack";
import { PresenceBadge } from "./components/PresenceBadge";
import type { WorkspacePresenceSnapshot } from "@/realtime/realtime-types";

describe("WP-3 — Workspace Presence UI Integration Tests", () => {
  const WORKSPACE_ID = "ws-alpha";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    realtimeClient.disconnect();
  });

  it("1. WorkspacePresenceStack renders null when no online collaborators exist", () => {
    const { container } = render(<WorkspacePresenceStack />);
    expect(container.firstChild).toBeNull();
  });

  it("2. Presence snapshot replaces local presence state and renders avatars", () => {
    render(<WorkspacePresenceStack />);

    const snapshot: WorkspacePresenceSnapshot = {
      workspaceId: WORKSPACE_ID,
      users: [
        { userId: "u1", name: "Alice Smith", username: "alice", viewing: null },
        { userId: "u2", name: "Bob Jones", username: "bob", viewing: null },
      ],
    };

    act(() => {
      // @ts-expect-error accessing private handler for unit test verification
      realtimeClient.handleIncomingPresence(snapshot);
    });

    const stack = screen.getByTestId("workspace-presence-stack");
    expect(stack).toBeInTheDocument();
    expect(stack.children.length).toBe(2);
  });

  it("3. Overflow avatar count rendered when > 5 online users exist", () => {
    render(<WorkspacePresenceStack />);

    const snapshot: WorkspacePresenceSnapshot = {
      workspaceId: WORKSPACE_ID,
      users: Array.from({ length: 8 }, (_, i) => ({
        userId: `user-${i + 1}`,
        name: `User ${i + 1}`,
        username: `user${i + 1}`,
        viewing: null,
      })),
    };

    act(() => {
      // @ts-expect-error accessing private handler for unit test verification
      realtimeClient.handleIncomingPresence(snapshot);
    });

    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("4. PresenceBadge renders online and offline status states", () => {
    const { rerender } = render(<PresenceBadge status="online" showLabel />);
    expect(screen.getByText("Online")).toBeInTheDocument();

    rerender(<PresenceBadge status="offline" showLabel />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });
});
