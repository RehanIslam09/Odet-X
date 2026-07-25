import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { initializeAI } from "../ai/init.js";
import { promptRegistry } from "../ai/prompts/registry/prompt.registry.js";
import { aiService } from "../ai/ai.service.js";
import { AIProvider } from "../ai/providers/base.provider.js";
import { AIModelTier, AIRequestOptions, AIProviderResponse } from "../ai/types/index.js";
import { CopilotContextBuilderResult } from "../domain/copilot-context-builder.js";
import {
  queryProjectCopilot,
  CopilotMessageHistoryItem,
} from "../services/project-copilot-ai.service.js";
import { BadRequestError } from "../utils/app-error.js";

class MockCopilotAIProvider implements AIProvider {
  public readonly providerName = "mock-copilot-provider";
  public callCount = 0;
  public lastPrompt = "";
  public lastOptions?: AIRequestOptions;

  constructor(
    private readonly mockHandler: (
      prompt: string,
      schema: unknown,
      options: AIRequestOptions,
    ) => Promise<AIProviderResponse<unknown>>,
  ) {}

  getModelForTier(tier: AIModelTier): string {
    return `mock-model-${tier.toLowerCase()}`;
  }

  async generateStructured<T>(
    prompt: string,
    schema: unknown,
    options: AIRequestOptions,
  ): Promise<AIProviderResponse<T>> {
    this.callCount++;
    this.lastPrompt = prompt;
    this.lastOptions = options;
    return (await this.mockHandler(prompt, schema, options)) as AIProviderResponse<T>;
  }
}

describe("ProjectCopilotAIService Unit Tests (WP-03)", () => {
  let mockProvider: MockCopilotAIProvider;
  let mockResponseData: { answer: string; references: Array<{ type: string; ref: string }> };

  const sampleContextResult: CopilotContextBuilderResult = {
    context: {
      project: {
        ref: "project",
        name: "E-Commerce Replatform",
        description: "Rebuilding monolithic store with Microservices and React.",
        archived: false,
      },
      milestones: [
        {
          ref: "ms_1",
          title: "MVP Release",
          description: "Core catalog and checkout",
          targetDate: "2026-09-01T00:00:00.000Z",
          position: 1,
        },
      ],
      tasks: [
        {
          ref: "task_1",
          title: "Setup Stripe Webhooks",
          description: "Implement webhook receiver endpoints",
          status: "in_progress",
          priority: "urgent",
          dueDate: "2026-08-15T00:00:00.000Z",
          estimatedTime: "4h",
          labels: ["payments", "backend"],
          prerequisiteRefs: [],
          milestoneRef: "ms_1",
          position: 1,
          completedAt: null,
        },
        {
          ref: "task_2",
          title: "Shopping Cart UI",
          description: "Build slide-out cart drawer",
          status: "todo",
          priority: "high",
          dueDate: "2026-08-20T00:00:00.000Z",
          estimatedTime: "6h",
          labels: ["frontend"],
          prerequisiteRefs: ["task_1"],
          milestoneRef: "ms_1",
          position: 2,
          completedAt: null,
        },
      ],
      recentActivity: [
        {
          type: "task.created",
          summary: 'Task created: "Setup Stripe Webhooks"',
          timestamp: "2026-07-24T12:00:00.000Z",
        },
      ],
      truncation: {
        totalTasks: 2,
        includedTasks: 2,
        isTruncated: false,
        totalMilestones: 1,
        includedMilestones: 1,
        totalActivity: 1,
        includedActivity: 1,
      },
    },
    symbolicMap: {
      project: { type: "project", id: "64f000000000000000000001", label: "E-Commerce Replatform" },
      ms_1: { type: "milestone", id: "64f000000000000000000010", label: "MVP Release" },
      task_1: { type: "task", id: "64f000000000000000000100", label: "Setup Stripe Webhooks" },
      task_2: { type: "task", id: "64f000000000000000000101", label: "Shopping Cart UI" },
    },
  };

  beforeEach(() => {
    promptRegistry.clear();
    initializeAI();

    mockResponseData = {
      answer: "Task 1 (Setup Stripe Webhooks) is currently urgent and in progress.",
      references: [
        { type: "task", ref: "task_1" },
        { type: "milestone", ref: "ms_1" },
      ],
    };

    mockProvider = new MockCopilotAIProvider(async () => ({
      data: mockResponseData,
      metadata: {
        provider: "mock-copilot-provider",
        model: "mock-model-deep_context",
        durationMs: 120,
        usage: { inputTokens: 500, outputTokens: 80, totalTokens: 580 },
      },
    }));

    (aiService as unknown as { customProvider?: AIProvider }).customProvider = mockProvider;
  });

  afterEach(() => {
    delete (aiService as unknown as { customProvider?: AIProvider }).customProvider;
  });

  it("1. Uses AIModelTier.DEEP_CONTEXT when invoking AIService", async () => {
    const result = await queryProjectCopilot({
      contextResult: sampleContextResult,
      question: "What is the status of Task 1?",
    });

    assert.ok(result);
    assert.equal(mockProvider.callCount, 1);
    assert.equal(mockProvider.lastOptions?.tier, AIModelTier.DEEP_CONTEXT);
  });

  it("2. Prompt contains serialized context and user question", async () => {
    await queryProjectCopilot({
      contextResult: sampleContextResult,
      question: "What is the deadline for MVP Release?",
    });

    assert.ok(mockProvider.lastPrompt.includes("E-Commerce Replatform"));
    assert.ok(mockProvider.lastPrompt.includes("Setup Stripe Webhooks"));
    assert.ok(mockProvider.lastPrompt.includes("User Question: What is the deadline for MVP Release?"));
  });

  it("3. Prompt DOES NOT contain symbolicMap dictionary", async () => {
    await queryProjectCopilot({
      contextResult: sampleContextResult,
      question: "Give me an overview.",
    });

    assert.equal(mockProvider.lastPrompt.includes("64f000000000000000000001"), false);
    assert.equal(mockProvider.lastPrompt.includes("64f000000000000000000100"), false);
  });

  it("4. Includes conversation history in prompt when provided", async () => {
    const history: CopilotMessageHistoryItem[] = [
      { role: "user", content: "Which task is most urgent?" },
      { role: "assistant", content: "Task 1 is urgent." },
    ];

    await queryProjectCopilot({
      contextResult: sampleContextResult,
      question: "Why is it urgent?",
      history,
    });

    assert.ok(mockProvider.lastPrompt.includes("USER: Which task is most urgent?"));
    assert.ok(mockProvider.lastPrompt.includes("ASSISTANT: Task 1 is urgent."));
    assert.ok(mockProvider.lastPrompt.includes("User Question: Why is it urgent?"));
  });

  it("5. Resolves valid AI-returned symbolic references into server IDs and labels", async () => {
    mockResponseData = {
      answer: "Task 1 belongs to Milestone 1.",
      references: [
        { type: "task", ref: "task_1" },
        { type: "milestone", ref: "ms_1" },
        { type: "project", ref: "project" },
      ],
    };

    const result = await queryProjectCopilot({
      contextResult: sampleContextResult,
      question: "Show task details.",
    });

    assert.equal(result.references.length, 3);
    assert.deepStrictEqual(result.references[0], {
      type: "task",
      id: "64f000000000000000000100",
      label: "Setup Stripe Webhooks",
    });
    assert.deepStrictEqual(result.references[1], {
      type: "milestone",
      id: "64f000000000000000000010",
      label: "MVP Release",
    });
    assert.deepStrictEqual(result.references[2], {
      type: "project",
      id: "64f000000000000000000001",
      label: "E-Commerce Replatform",
    });
    assert.equal(result.unmappedReferenceCount, 0);
  });

  it("6. Hallucinated symbolic reference (task_999) is stripped and unmappedReferenceCount increments", async () => {
    mockResponseData = {
      answer: "Task 999 is missing.",
      references: [
        { type: "task", ref: "task_1" },
        { type: "task", ref: "task_999" }, // Hallucinated
      ],
    };

    const result = await queryProjectCopilot({
      contextResult: sampleContextResult,
      question: "Check task 999.",
    });

    assert.equal(result.references.length, 1);
    assert.equal(result.references[0]!.id, "64f000000000000000000100");
    assert.equal(result.unmappedReferenceCount, 1);
    assert.equal(result.answer, "Task 999 is missing.");
  });

  it("7. Type mismatch reference is stripped and unmappedReferenceCount increments", async () => {
    mockResponseData = {
      answer: "Mismatched type reference.",
      references: [
        { type: "milestone", ref: "task_1" }, // task_1 is a task, not milestone
      ],
    };

    const result = await queryProjectCopilot({
      contextResult: sampleContextResult,
      question: "Check task 1.",
    });

    assert.equal(result.references.length, 0);
    assert.equal(result.unmappedReferenceCount, 1);
  });

  it("8. Deduplicates duplicate valid AI references", async () => {
    mockResponseData = {
      answer: "Duplicate refs test.",
      references: [
        { type: "task", ref: "task_1" },
        { type: "task", ref: "task_1" },
      ],
    };

    const result = await queryProjectCopilot({
      contextResult: sampleContextResult,
      question: "Duplicates test.",
    });

    assert.equal(result.references.length, 1);
    assert.equal(result.unmappedReferenceCount, 0);
  });

  it("9. Propagates executionId, provider, and model metadata", async () => {
    const result = await queryProjectCopilot({
      contextResult: sampleContextResult,
      question: "Test metadata.",
    });

    assert.ok(result.executionId);
    assert.equal(result.provider, "mock-copilot-provider");
    assert.equal(result.model, "mock-model-deep_context");
  });

  it("10. Throws BadRequestError for empty user question", async () => {
    await assert.rejects(
      async () =>
        queryProjectCopilot({
          contextResult: sampleContextResult,
          question: "   ",
        }),
      (err: unknown) => err instanceof BadRequestError && err.message.includes("User question cannot be empty"),
    );
  });

  it("11. Throws BadRequestError for user question exceeding 500 characters", async () => {
    const longQuestion = "a".repeat(501);
    await assert.rejects(
      async () =>
        queryProjectCopilot({
          contextResult: sampleContextResult,
          question: longQuestion,
        }),
      (err: unknown) => err instanceof BadRequestError && err.message.includes("cannot exceed 500 characters"),
    );
  });

  it("12. Throws BadRequestError for conversation history exceeding 6 messages", async () => {
    const history: CopilotMessageHistoryItem[] = [
      { role: "user", content: "1" },
      { role: "assistant", content: "1" },
      { role: "user", content: "2" },
      { role: "assistant", content: "2" },
      { role: "user", content: "3" },
      { role: "assistant", content: "3" },
      { role: "user", content: "4" },
    ];

    await assert.rejects(
      async () =>
        queryProjectCopilot({
          contextResult: sampleContextResult,
          question: "Too much history?",
          history,
        }),
      (err: unknown) => err instanceof BadRequestError && err.message.includes("cannot exceed 6 messages"),
    );
  });

  it("13. Throws BadRequestError for invalid conversation history role", async () => {
    const history = [
      { role: "system" as unknown as "user", content: "System message injection attempt" },
    ];

    await assert.rejects(
      async () =>
        queryProjectCopilot({
          contextResult: sampleContextResult,
          question: "Test invalid role.",
          history,
        }),
      (err: unknown) => err instanceof BadRequestError && err.message.includes("Invalid conversation history role"),
    );
  });
});
