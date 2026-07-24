import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanGenerationForm } from "@/features/projects/components/planning/PlanGenerationForm";
import { PlanReviewWorkspace } from "@/features/projects/components/planning/PlanReviewWorkspace";
import type { PlanDraft } from "@/features/ai/types/ai.types";

describe("WP-05 Planning UI Components & Interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PlanGenerationForm", () => {
    it("1. Renders form and prevents empty prompt submission", () => {
      const mockGenerate = vi.fn();
      const mockCancel = vi.fn();

      render(
        <PlanGenerationForm
          onGenerate={mockGenerate}
          isLoading={false}
          onCancel={mockCancel}
        />
      );

      expect(screen.getByText("Project Outcome & Planning Requirements")).toBeInTheDocument();

      const submitBtn = screen.getByRole("button", { name: /Generate Plan/i });
      expect(submitBtn).toBeDisabled();

      fireEvent.click(submitBtn);
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("2. Triggers onGenerate when valid prompt description is entered", () => {
      const mockGenerate = vi.fn();

      render(
        <PlanGenerationForm
          onGenerate={mockGenerate}
          isLoading={false}
          onCancel={vi.fn()}
        />
      );

      const textarea = screen.getByPlaceholderText(/Example: Build a SaaS authentication system/i);
      fireEvent.change(textarea, { target: { value: "Build e-commerce SaaS product" } });

      const submitBtn = screen.getByRole("button", { name: /Generate Plan/i });
      expect(submitBtn).not.toBeDisabled();

      fireEvent.click(submitBtn);
      expect(mockGenerate).toHaveBeenCalledWith("Build e-commerce SaaS product");
    });
  });

  describe("PlanReviewWorkspace", () => {
    const sampleDraft: PlanDraft = {
      id: "draft-101",
      owner: "user-1",
      projectId: "proj-1",
      status: "draft",
      promptDescription: "Test SaaS plan",
      expiresAt: "2026-08-01T00:00:00.000Z",
      createdAt: "2026-07-24T00:00:00.000Z",
      updatedAt: "2026-07-24T00:00:00.000Z",
      milestones: [
        {
          tempId: "ms1",
          title: "Phase 1: Database Setup",
          description: "Initialize Mongoose schemas",
          targetDate: null,
          position: 1,
        },
      ],
      tasks: [
        {
          tempId: "t1",
          title: "Task 1: Create Models",
          description: "Define User and Task models",
          priority: "high",
          estimatedTime: "3h",
          position: 1,
          dependencies: [],
          milestoneTempId: "ms1",
        },
      ],
    };

    it("3. Renders task and milestone count pills and task title input", () => {
      render(
        <PlanReviewWorkspace
          draft={sampleDraft}
          onSave={vi.fn()}
          onDiscard={vi.fn()}
          onCommit={vi.fn()}
          isSaving={false}
          isCommitting={false}
          isDiscarding={false}
        />
      );

      expect(screen.getByText("1 Tasks")).toBeInTheDocument();
      expect(screen.getByText("1 Milestones")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Task 1: Create Models")).toBeInTheDocument();
    });

    it("4. Shows Discard confirmation dialog when Discard is clicked", () => {
      const mockDiscard = vi.fn();

      render(
        <PlanReviewWorkspace
          draft={sampleDraft}
          onSave={vi.fn()}
          onDiscard={mockDiscard}
          onCommit={vi.fn()}
          isSaving={false}
          isCommitting={false}
          isDiscarding={false}
        />
      );

      const discardBtn = screen.getByRole("button", { name: /Discard/i });
      fireEvent.click(discardBtn);

      expect(screen.getByText("Discard Project Plan?")).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: "Discard Plan" });
      fireEvent.click(confirmBtn);

      expect(mockDiscard).toHaveBeenCalled();
    });

    it("5. Shows Commit confirmation dialog when Commit Plan is clicked", () => {
      const mockCommit = vi.fn();

      render(
        <PlanReviewWorkspace
          draft={sampleDraft}
          onSave={vi.fn()}
          onDiscard={vi.fn()}
          onCommit={mockCommit}
          isSaving={false}
          isCommitting={false}
          isDiscarding={false}
        />
      );

      const commitBtn = screen.getByRole("button", { name: /Commit Plan/i });
      fireEvent.click(commitBtn);

      expect(screen.getByText("Commit Plan to Project?")).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: "Commit & Create Tasks" });
      fireEvent.click(confirmBtn);

      expect(mockCommit).toHaveBeenCalled();
    });

    it("6. Cancelled Commit does not invoke commit or discard mutations", () => {
      const mockCommit = vi.fn();
      const mockDiscard = vi.fn();

      render(
        <PlanReviewWorkspace
          draft={sampleDraft}
          onSave={vi.fn()}
          onDiscard={mockDiscard}
          onCommit={mockCommit}
          isSaving={false}
          isCommitting={false}
          isDiscarding={false}
        />
      );

      const commitBtn = screen.getByRole("button", { name: /Commit Plan/i });
      fireEvent.click(commitBtn);

      expect(screen.getByText("Commit Plan to Project?")).toBeInTheDocument();

      const cancelBtn = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelBtn);

      expect(screen.queryByText("Commit Plan to Project?")).not.toBeInTheDocument();
      expect(mockCommit).not.toHaveBeenCalled();
      expect(mockDiscard).not.toHaveBeenCalled();
    });
  });
});
