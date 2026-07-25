import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { initializeAI } from "../ai/init.js";
import { ProjectCopilotResponseSchema } from "../ai/schemas/project-copilot.schema.js";
import { projectCopilotPrompt } from "../ai/prompts/definitions/project-copilot.prompt.js";
import { queryProjectCopilot } from "../services/project-copilot-ai.service.js";
import { CopilotContextBuilderResult } from "../domain/copilot-context-builder.js";
import { aiService } from "../ai/ai.service.js";

describe("Phase 28 — AI Platform Integration & Copilot Prompt Evolution (WP-04)", () => {
  before(() => {
    initializeAI();
  });

  // -------------------------------------------------------------------------
  // 1. Schema Validation Unit Tests
  // -------------------------------------------------------------------------

  describe("ProjectCopilotResponseSchema Validation", () => {
    it("parses valid response with proposedAction: null (default no-action state)", () => {
      const raw = {
        answer: "The project has 3 overdue tasks.",
        references: [{ type: "task" as const, ref: "task_1" }],
        proposedAction: null,
      };

      const parsed = ProjectCopilotResponseSchema.parse(raw);
      assert.equal(parsed.answer, "The project has 3 overdue tasks.");
      assert.equal(parsed.references.length, 1);
      assert.equal(parsed.proposedAction, null);
    });

    it("parses valid response with missing proposedAction field (optional)", () => {
      const raw = {
        answer: "No blockers identified.",
        references: [],
      };

      const parsed = ProjectCopilotResponseSchema.parse(raw);
      assert.equal(parsed.proposedAction, undefined);
    });

    it("parses valid response with all 5 approved action proposal types", () => {
      const validActions = [
        {
          action: "CREATE_TASK" as const,
          targetRef: "project" as const,
          arguments: { title: "Configure Redis Cache" },
          explanation: "Improves session caching.",
        },
        {
          action: "UPDATE_TASK_STATUS" as const,
          targetRef: "task_1",
          arguments: { status: "in_progress" as const },
          explanation: "Started work on auth controller.",
        },
        {
          action: "UPDATE_TASK_PRIORITY" as const,
          targetRef: "task_2",
          arguments: { priority: "urgent" as const },
          explanation: "Blocks release candidate.",
        },
        {
          action: "UPDATE_TASK_DUE_DATE" as const,
          targetRef: "task_3",
          arguments: { dueDate: "2026-11-01T00:00:00.000Z" },
          explanation: "Pushed due date.",
        },
        {
          action: "ADD_TASK_LABEL" as const,
          targetRef: "task_4",
          arguments: { label: "backend" },
          explanation: "Tagged as backend.",
        },
      ];

      for (const proposedAction of validActions) {
        const raw = {
          answer: "I can help with that change.",
          references: [],
          proposedAction,
        };

        const parsed = ProjectCopilotResponseSchema.parse(raw);
        assert.ok(parsed.proposedAction);
        assert.equal(parsed.proposedAction?.action, proposedAction.action);
      }
    });

    it("rejects response containing forbidden / blacklisted actions at schema level", () => {
      const forbiddenAction = {
        action: "DELETE_TASK",
        targetRef: "task_1",
        explanation: "Malicious deletion proposal",
      };

      const raw = {
        answer: "Deleting task.",
        references: [],
        proposedAction: forbiddenAction,
      };

      assert.throws(() => ProjectCopilotResponseSchema.parse(raw));
    });

    it("rejects malformed action proposals missing required arguments", () => {
      const malformedAction = {
        action: "UPDATE_TASK_STATUS",
        targetRef: "task_1",
        arguments: {}, // missing required status string
        explanation: "Missing status",
      };

      const raw = {
        answer: "Updating status.",
        references: [],
        proposedAction: malformedAction,
      };

      assert.throws(() => ProjectCopilotResponseSchema.parse(raw));
    });
  });

  // -------------------------------------------------------------------------
  // 2. Copilot Prompt Definition Verification
  // -------------------------------------------------------------------------

  describe("Project Copilot Prompt Contract", () => {
    it("has version 2.0.0 and contains controlled action rules", () => {
      assert.equal(projectCopilotPrompt.metadata.version, "2.0.0");

      const systemSection = projectCopilotPrompt.sections.find((s) => s.identifier === "system");
      assert.ok(systemSection);

      const content = systemSection.content;
      assert.ok(content.includes("CONTROLLED ACTION BOUNDARY"));
      assert.ok(content.includes("proposedAction"));
      assert.ok(content.includes("CREATE_TASK"));
      assert.ok(content.includes("UPDATE_TASK_STATUS"));
      assert.ok(content.includes("UPDATE_TASK_PRIORITY"));
      assert.ok(content.includes("UPDATE_TASK_DUE_DATE"));
      assert.ok(content.includes("ADD_TASK_LABEL"));
      assert.ok(content.includes("FORBIDDEN Actions"));
      assert.ok(content.includes("PROMPT INJECTION DEFENSE"));
    });
  });

  // -------------------------------------------------------------------------
  // 3. Symbolic Target Validation & Service Integration
  // -------------------------------------------------------------------------

  describe("Copilot AI Service Action Target Grounding", () => {
    const mockContextResult: CopilotContextBuilderResult = {
      context: {
        project: {
          ref: "project",
          name: "Sample Project",
          description: "Sample",
          archived: false,
        },
        milestones: [],
        tasks: [
          {
            ref: "task_1",
            title: "Task One",
            description: "",
            status: "todo",
            priority: "medium",
            dueDate: null,
            estimatedTime: null,
            labels: [],
            prerequisiteRefs: [],
            milestoneRef: null,
            position: 1,
            completedAt: null,
          },
        ],
        recentActivity: [],
        truncation: {
          totalTasks: 1,
          includedTasks: 1,
          isTruncated: false,
          totalMilestones: 0,
          includedMilestones: 0,
          totalActivity: 0,
          includedActivity: 0,
        },
      },
      symbolicMap: {
        project: { type: "project", id: "64f000000000000000000001", label: "Sample Project" },
        task_1: { type: "task", id: "64f000000000000000000100", label: "Task One" },
      },
    };

    it("preserves proposedAction when targetRef exists in symbolicMap", async () => {
      const originalGenerate = aiService.generateStructuredData;
      aiService.generateStructuredData = (async () => ({
        data: {
          answer: "I can update the priority of Task One.",
          references: [{ type: "task" as const, ref: "task_1" }],
          proposedAction: {
            action: "UPDATE_TASK_PRIORITY" as const,
            targetRef: "task_1",
            arguments: { priority: "high" as const },
            explanation: "High priority needed.",
          },
        },
        metadata: {
          executionId: "exec_test_1",
          provider: "mock-provider",
          model: "mock-model",
          promptName: "project-copilot",
          promptVersion: "2.0.0",
          durationMs: 10,
        },
      })) as unknown as typeof aiService.generateStructuredData;

      try {
        const result = await queryProjectCopilot({
          contextResult: mockContextResult,
          question: "Change priority of Task One to high",
        });

        assert.equal(result.answer, "I can update the priority of Task One.");
        assert.ok(result.proposedAction);
        assert.equal(result.proposedAction?.action, "UPDATE_TASK_PRIORITY");
        assert.equal(result.proposedAction?.targetRef, "task_1");
      } finally {
        aiService.generateStructuredData = originalGenerate;
      }
    });

    it("nullifies proposedAction if targetRef is hallucinated / unmapped", async () => {
      const originalGenerate = aiService.generateStructuredData;
      aiService.generateStructuredData = (async () => ({
        data: {
          answer: "I can update the priority.",
          references: [],
          proposedAction: {
            action: "UPDATE_TASK_PRIORITY" as const,
            targetRef: "task_999", // Unmapped hallucinated reference
            arguments: { priority: "urgent" as const },
            explanation: "Urgent fix.",
          },
        },
        metadata: {
          executionId: "exec_test_2",
          provider: "mock-provider",
          model: "mock-model",
          promptName: "project-copilot",
          promptVersion: "2.0.0",
          durationMs: 10,
        },
      })) as unknown as typeof aiService.generateStructuredData;

      try {
        const result = await queryProjectCopilot({
          contextResult: mockContextResult,
          question: "Change priority of non-existent task",
        });

        assert.equal(result.answer, "I can update the priority.");
        // Unmapped targetRef causes proposedAction to be safely nullified!
        assert.equal(result.proposedAction, null);
      } finally {
        aiService.generateStructuredData = originalGenerate;
      }
    });
  });
});
