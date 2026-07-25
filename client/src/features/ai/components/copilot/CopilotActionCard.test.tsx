import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CopilotActionCard } from "./CopilotActionCard";
import { aiApi } from "@/features/ai/services/ai.api";
import type { ProposedAction } from "@/features/ai/types/ai.types";

vi.mock("@/features/ai/services/ai.api", () => ({
  aiApi: {
    dryRunAction: vi.fn(),
    confirmAction: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe("Phase 28 — CopilotActionCard & Review Flow Unit Tests (WP-05)", () => {
  const sampleProjectId = "64f000000000000000000001";
  const sampleMessageId = "msg-123";

  const sampleProposedAction: ProposedAction = {
    action: "UPDATE_TASK_PRIORITY",
    targetRef: "task_1",
    arguments: { priority: "urgent" },
    explanation: "Critical blocker for release candidate.",
  };

  it("1. Renders proposed action card title, target, and explanation correctly", () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <CopilotActionCard
          projectId={sampleProjectId}
          messageId={sampleMessageId}
          proposedAction={sampleProposedAction}
          references={[{ type: "task", id: "task_1", label: "Auth Middleware" }]}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Change task priority")).toBeInTheDocument();
    expect(screen.getByText("Auth Middleware")).toBeInTheDocument();
    expect(screen.getByText(/Critical blocker for release candidate/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review Change/i })).toBeInTheDocument();
  });

  it("2. Clicking 'Review Change' calls dryRunAction and opens ActionReviewDialog", async () => {
    const queryClient = createTestQueryClient();

    vi.mocked(aiApi.dryRunAction).mockResolvedValueOnce({
      dryRun: {
        actionType: "UPDATE_TASK_PRIORITY",
        target: { id: "64f000000000000000000100", label: "Auth Middleware", type: "task" },
        diff: {
          before: { priority: "medium" },
          after: { priority: "urgent" },
        },
        explanation: "Critical blocker for release candidate.",
        expectedVersion: 0,
      },
      confirmationToken: "valid_signed_token_xyz",
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CopilotActionCard
          projectId={sampleProjectId}
          messageId={sampleMessageId}
          proposedAction={sampleProposedAction}
          references={[{ type: "task", id: "task_1", label: "Auth Middleware" }]}
        />
      </QueryClientProvider>,
    );

    const reviewBtn = screen.getByRole("button", { name: /Review Change/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(aiApi.dryRunAction).toHaveBeenCalledWith({
        projectId: sampleProjectId,
        proposedAction: sampleProposedAction,
      });
      expect(screen.getByText("Review Proposed Change for Auth Middleware")).toBeInTheDocument();
      expect(screen.getByText("Confirm Change")).toBeInTheDocument();
    });
  });

  it("3. Clicking 'Confirm Change' calls confirmAction and triggers applied state", async () => {
    const queryClient = createTestQueryClient();
    const handleStateChange = vi.fn();

    vi.mocked(aiApi.dryRunAction).mockResolvedValueOnce({
      dryRun: {
        actionType: "UPDATE_TASK_PRIORITY",
        target: { id: "64f000000000000000000100", label: "Auth Middleware", type: "task" },
        diff: {
          before: { priority: "medium" },
          after: { priority: "urgent" },
        },
        explanation: "Critical blocker.",
        expectedVersion: 0,
      },
      confirmationToken: "valid_signed_token_xyz",
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    });

    vi.mocked(aiApi.confirmAction).mockResolvedValueOnce({
      actionType: "UPDATE_TASK_PRIORITY",
      targetId: "64f000000000000000000100",
      executedAt: new Date().toISOString(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CopilotActionCard
          projectId={sampleProjectId}
          messageId={sampleMessageId}
          proposedAction={sampleProposedAction}
          references={[{ type: "task", id: "task_1", label: "Auth Middleware" }]}
          onActionStateChange={handleStateChange}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Review Change/i }));

    await waitFor(() => {
      expect(screen.getByText("Confirm Change")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Confirm Change"));

    await waitFor(() => {
      expect(aiApi.confirmAction).toHaveBeenCalledWith({
        confirmationToken: "valid_signed_token_xyz",
      });
      expect(handleStateChange).toHaveBeenCalledWith(sampleMessageId, "applied", expect.any(String));
      expect(screen.getByText("Applied")).toBeInTheDocument();
    });
  });
});
