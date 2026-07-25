import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { aiApi } from "@/features/ai/services/ai.api";
import { ProjectCopilotSheet } from "./ProjectCopilotSheet";
import { useProjectCopilot } from "@/features/ai/hooks/useProjectCopilot";
import { renderHook } from "@testing-library/react";

// Mock aiApi
vi.mock("@/features/ai/services/ai.api", () => ({
  aiApi: {
    queryCopilot: vi.fn(),
  },
}));

describe("ProjectCopilotSheet & Read-Only Copilot UI (WP-06 Product Polish)", () => {
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

  describe("useProjectCopilot Hook (Read-Only Invariant)", () => {
    it("calls aiApi.queryCopilot and performs ZERO cache invalidations", async () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const mockResult = {
        answer: "Task 1 is in progress.",
        references: [{ type: "task" as const, id: "task-1", label: "Task 1" }],
        unmappedReferenceCount: 0,
        executionId: "exec-1",
        provider: "mock",
        model: "mock-model",
      };

      vi.mocked(aiApi.queryCopilot).mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useProjectCopilot("proj-123"), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ question: "What is the status of Task 1?" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(aiApi.queryCopilot).toHaveBeenCalledWith("proj-123", {
        question: "What is the status of Task 1?",
      });

      // Strict Read-Only Invariant: ZERO cache invalidations
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe("ProjectCopilotSheet Component", () => {
    it("1. Renders empty state and suggested questions when opened", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProjectCopilotSheet
            projectId="proj-123"
            open={true}
            onOpenChange={vi.fn()}
          />
        </QueryClientProvider>,
      );

      expect(screen.getByText("Project Copilot")).toBeInTheDocument();
      expect(screen.getByText("Ask about your project")).toBeInTheDocument();
      expect(screen.getByText("What's blocking this project?")).toBeInTheDocument();
      expect(screen.getByText("Which tasks are overdue?")).toBeInTheDocument();
    });

    it("2. Submitting a question sends request and renders assistant response with reference chips", async () => {
      const mockResult = {
        answer: "Setup Auth System (Task 1) is currently urgent.",
        references: [{ type: "task" as const, id: "64f000000000000000000101", label: "Setup Auth System" }],
        unmappedReferenceCount: 0,
        executionId: "exec-1",
        provider: "mock",
        model: "mock-model",
      };

      vi.mocked(aiApi.queryCopilot).mockResolvedValueOnce(mockResult);

      render(
        <QueryClientProvider client={queryClient}>
          <ProjectCopilotSheet
            projectId="proj-123"
            open={true}
            onOpenChange={vi.fn()}
          />
        </QueryClientProvider>,
      );

      const textarea = screen.getByPlaceholderText("Ask about blockers, risks, priorities...");
      fireEvent.change(textarea, { target: { value: "What is urgent?" } });

      const sendButton = screen.getByRole("button", { name: "Send Question" });
      fireEvent.click(sendButton);

      // User question rendered
      expect(screen.getByText("What is urgent?")).toBeInTheDocument();

      // Wait for assistant answer
      await waitFor(() => {
        expect(screen.getByText("Setup Auth System (Task 1) is currently urgent.")).toBeInTheDocument();
      });

      // Reference chip rendered
      expect(screen.getByText("task:")).toBeInTheDocument();
      expect(screen.getByText("Setup Auth System")).toBeInTheDocument();
    });

    it("3. Renders formatted Markdown headings, bold text, and lists instead of raw syntax", async () => {
      const markdownResult = {
        answer: "### Summary\n\n**Overview:**\n- Item 1\n- Item 2",
        references: [],
        unmappedReferenceCount: 0,
        executionId: "exec-md",
        provider: "mock",
        model: "mock-model",
      };

      vi.mocked(aiApi.queryCopilot).mockResolvedValueOnce(markdownResult);

      render(
        <QueryClientProvider client={queryClient}>
          <ProjectCopilotSheet
            projectId="proj-123"
            open={true}
            onOpenChange={vi.fn()}
          />
        </QueryClientProvider>,
      );

      const textarea = screen.getByPlaceholderText("Ask about blockers, risks, priorities...");
      fireEvent.change(textarea, { target: { value: "Summarize status" } });
      fireEvent.click(screen.getByRole("button", { name: "Send Question" }));

      await waitFor(() => {
        const heading = screen.getByRole("heading", { level: 3 });
        expect(heading).toHaveTextContent("Summary");
        expect(screen.getByText("Overview:")).toBeInTheDocument();
        expect(screen.getByText("Item 1")).toBeInTheDocument();
      });
    });

    it("4. Prevents raw HTML execution (secure untrusted input boundary)", async () => {
      const unsafeResult = {
        answer: 'Safe text <script>alert("xss")</script>',
        references: [],
        unmappedReferenceCount: 0,
        executionId: "exec-sec",
        provider: "mock",
        model: "mock-model",
      };

      vi.mocked(aiApi.queryCopilot).mockResolvedValueOnce(unsafeResult);

      render(
        <QueryClientProvider client={queryClient}>
          <ProjectCopilotSheet
            projectId="proj-123"
            open={true}
            onOpenChange={vi.fn()}
          />
        </QueryClientProvider>,
      );

      const textarea = screen.getByPlaceholderText("Ask about blockers, risks, priorities...");
      fireEvent.change(textarea, { target: { value: "Test security" } });
      fireEvent.click(screen.getByRole("button", { name: "Send Question" }));

      await waitFor(() => {
        expect(screen.getByText(/Safe text/)).toBeInTheDocument();
        expect(document.querySelector("script")).toBeNull();
      });
    });

    it("5. Truncates long reference titles using shrink-safe container structure", async () => {
      const longTitleRef = {
        answer: "Ref test",
        references: [
          {
            type: "task" as const,
            id: "t-long",
            label: "Implement Password Hashing and User Registration Flow with Rate Limiting",
          },
        ],
        unmappedReferenceCount: 0,
        executionId: "exec-long",
        provider: "mock",
        model: "mock-model",
      };

      vi.mocked(aiApi.queryCopilot).mockResolvedValueOnce(longTitleRef);

      render(
        <QueryClientProvider client={queryClient}>
          <ProjectCopilotSheet
            projectId="proj-123"
            open={true}
            onOpenChange={vi.fn()}
          />
        </QueryClientProvider>,
      );

      const textarea = screen.getByPlaceholderText("Ask about blockers, risks, priorities...");
      fireEvent.change(textarea, { target: { value: "Test long title" } });
      fireEvent.click(screen.getByRole("button", { name: "Send Question" }));

      await waitFor(() => {
        const titleSpan = screen.getByText("Implement Password Hashing and User Registration Flow with Rate Limiting");
        expect(titleSpan).toHaveClass("truncate");
        expect(titleSpan).toHaveClass("min-w-0");
      });
    });

    it("6. Prevents submitting empty or whitespace-only questions", () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ProjectCopilotSheet
            projectId="proj-123"
            open={true}
            onOpenChange={vi.fn()}
          />
        </QueryClientProvider>,
      );

      const sendButton = screen.getByRole("button", { name: "Send Question" });
      expect(sendButton).toBeDisabled();

      const textarea = screen.getByPlaceholderText("Ask about blockers, risks, priorities...");
      fireEvent.change(textarea, { target: { value: "    " } });

      expect(sendButton).toBeDisabled();
    });
  });
});
