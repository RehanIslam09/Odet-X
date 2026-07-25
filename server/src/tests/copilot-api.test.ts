import { describe, it, beforeEach, afterEach, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../app.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import PlanDraft from "../models/plan-draft.model.js";
import Activity from "../models/activity.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { aiService } from "../ai/ai.service.js";
import { AIProvider } from "../ai/providers/base.provider.js";
import { AIModelTier, AIRequestOptions, AIProviderResponse } from "../ai/types/index.js";
import { initializeAI } from "../ai/init.js";
import { promptRegistry } from "../ai/prompts/registry/prompt.registry.js";

class MockCopilotApiProvider implements AIProvider {
  public readonly providerName = "mock-copilot-api-provider";
  public callCount = 0;
  public lastPrompt = "";

  constructor(
    private handler?: (prompt: string, schema: unknown, options: AIRequestOptions) => Promise<AIProviderResponse<unknown>>,
  ) {}

  getModelForTier(tier: AIModelTier): string {
    return `mock-copilot-model-${tier.toLowerCase()}`;
  }

  async generateStructured<T>(
    prompt: string,
    schema: unknown,
    options: AIRequestOptions,
  ): Promise<AIProviderResponse<T>> {
    this.callCount++;
    this.lastPrompt = prompt;

    if (this.handler) {
      return (await this.handler(prompt, schema, options)) as AIProviderResponse<T>;
    }

    return {
      data: {
        answer: "Analysis completed. Task 1 is urgent.",
        references: [{ type: "task", ref: "task_1" }],
      } as unknown as T,
      metadata: {
        model: this.getModelForTier(options.tier),
      },
    };
  }
}

describe("Copilot HTTP API Endpoint Integration Tests (WP-04)", () => {
  let server: http.Server;
  let baseUrl: string;

  let userA: { _id: Types.ObjectId };
  let tokenA: string;
  let userB: { _id: Types.ObjectId };
  let tokenB: string;
  let projectA: { _id: Types.ObjectId; isDeleted?: boolean; save: () => Promise<unknown> };
  let task1A: { _id: Types.ObjectId };
  let ms1A: { _id: Types.ObjectId };
  let mockProvider: MockCopilotApiProvider;

  before(async () => {
    await setupTestDatabase();
    promptRegistry.clear();
    initializeAI();

    // Start HTTP server on ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clear database collections
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Milestone.deleteMany({});
    await PlanDraft.deleteMany({});
    await Activity.deleteMany({});

    // Seed test users
    userA = await User.create({
      name: "Owner User A",
      username: "user_a",
      email: "userA@example.com",
      password: "Password123!",
    });
    tokenA = generateAccessToken(userA._id.toString());

    userB = await User.create({
      name: "Other User B",
      username: "user_b",
      email: "userB@example.com",
      password: "Password123!",
    });
    tokenB = generateAccessToken(userB._id.toString());

    // Seed project for User A
    projectA = await Project.create({
      owner: userA._id,
      name: "Alpha Web App",
      description: "Building responsive web application.",
    });

    ms1A = await Milestone.create({
      owner: userA._id,
      projectId: projectA._id,
      title: "v1.0 Milestone",
      position: 1,
    });

    task1A = await Task.create({
      owner: userA._id,
      projectId: projectA._id,
      title: "Setup Auth System",
      status: "in_progress",
      priority: "urgent",
      milestoneId: ms1A._id,
      position: 1,
    });

    mockProvider = new MockCopilotApiProvider();
    (aiService as unknown as { customProvider?: AIProvider }).customProvider = mockProvider;
  });

  afterEach(() => {
    delete (aiService as unknown as { customProvider?: AIProvider }).customProvider;
  });

  // ---------------------------------------------------------------------------
  // 1. Authorization & Pre-Check Matrix
  // ---------------------------------------------------------------------------

  it("1. Authenticated owner can query Copilot successfully (200 OK)", async () => {
    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: "What is the status of Task 1?" }),
    });

    const res = await response.json();

    assert.equal(response.status, 200);
    assert.equal(res.success, true);
    assert.equal(res.message, "Copilot response generated successfully.");
    assert.ok(res.data);
    assert.equal(res.data.answer, "Analysis completed. Task 1 is urgent.");
    assert.equal(res.data.references.length, 1);
    assert.deepStrictEqual(res.data.references[0], {
      type: "task",
      id: task1A._id.toString(),
      label: "Setup Auth System",
    });
    assert.equal(res.data.unmappedReferenceCount, 0);
    assert.equal(res.data.provider, "mock-copilot-api-provider");
  });

  it("2. Unauthenticated request returns 401 Unauthorized", async () => {
    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What tasks exist?" }),
    });

    const res = await response.json();

    assert.equal(response.status, 401);
    assert.equal(res.success, false);
    assert.equal(mockProvider.callCount, 0, "AI must not be invoked for unauthenticated requests");
  });

  it("3. Querying nonexistent project ID returns 404 NotFoundError", async () => {
    const nonExistentId = new Types.ObjectId().toString();
    const response = await fetch(`${baseUrl}/projects/${nonExistentId}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: "What is the project status?" }),
    });

    const res = await response.json();

    assert.equal(response.status, 404);
    assert.equal(res.success, false);
    assert.equal(mockProvider.callCount, 0, "AI must not be invoked for non-existent projects");
  });

  it("4. Querying another user's project returns 404 NotFoundError (Cross-User Isolation)", async () => {
    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`, // User B trying to access User A's project
      },
      body: JSON.stringify({ question: "Tell me about this project." }),
    });

    const res = await response.json();

    assert.equal(response.status, 404);
    assert.equal(res.success, false);
    assert.equal(res.message, "Project not found.");
    assert.equal(mockProvider.callCount, 0, "AI must NOT be invoked for unauthorized cross-user requests");
  });

  it("5. Querying soft-deleted project returns 404 NotFoundError", async () => {
    projectA.isDeleted = true;
    await projectA.save();

    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: "What tasks exist?" }),
    });

    const res = await response.json();

    assert.equal(response.status, 404);
    assert.equal(res.success, false);
    assert.equal(mockProvider.callCount, 0, "AI must not be invoked for soft-deleted projects");
  });

  it("6. Invalid project ID string returns 400 BadRequestError", async () => {
    const response = await fetch(`${baseUrl}/projects/not-an-object-id/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: "What tasks exist?" }),
    });

    const res = await response.json();

    assert.equal(response.status, 400);
    assert.equal(res.success, false);
    assert.equal(mockProvider.callCount, 0, "AI must not be invoked for invalid project IDs");
  });

  // ---------------------------------------------------------------------------
  // 2. Request Body Validation Matrix
  // ---------------------------------------------------------------------------

  it("7. Missing question in body returns 400 Bad Request", async () => {
    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}),
    });

    const res = await response.json();

    assert.equal(response.status, 400);
    assert.equal(res.success, false);
  });

  it("8. Empty string or whitespace-only question returns 400 Bad Request", async () => {
    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: "    " }),
    });

    const res = await response.json();

    assert.equal(response.status, 400);
    assert.equal(res.success, false);
  });

  it("9. Question exceeding 500 characters returns 400 Bad Request", async () => {
    const longQuestion = "q".repeat(501);
    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: longQuestion }),
    });

    const res = await response.json();

    assert.equal(response.status, 400);
    assert.equal(res.success, false);
  });

  it("10. History exceeding 6 messages (3 turns) returns 400 Bad Request", async () => {
    const history = [
      { role: "user", content: "1" },
      { role: "assistant", content: "1" },
      { role: "user", content: "2" },
      { role: "assistant", content: "2" },
      { role: "user", content: "3" },
      { role: "assistant", content: "3" },
      { role: "user", content: "4" },
    ];

    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: "Valid question", history }),
    });

    const res = await response.json();

    assert.equal(response.status, 400);
    assert.equal(res.success, false);
  });

  it("11. History with invalid role (e.g. system) returns 400 Bad Request", async () => {
    const history = [{ role: "system", content: "Malicious role injection" }];

    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: "Valid question", history }),
    });

    const res = await response.json();

    assert.equal(response.status, 400);
    assert.equal(res.success, false);
  });

  // ---------------------------------------------------------------------------
  // 3. Response Security & Envelope Integrity
  // ---------------------------------------------------------------------------

  it("12. Response envelope omits symbolicMap, system prompt, and internal DTOs", async () => {
    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: "Audit response fields." }),
    });

    const res = await response.json();

    assert.equal(response.status, 200);
    const bodyData = res.data;

    assert.equal(bodyData.symbolicMap, undefined, "symbolicMap must NOT be exposed to client");
    assert.equal(bodyData.prompt, undefined, "prompt must NOT be exposed to client");
    assert.equal(bodyData.context, undefined, "context DTO must NOT be exposed to client");
    assert.equal(bodyData.system, undefined);
  });

  it("13. Hallucinated AI reference (task_999) is filtered safely", async () => {
    mockProvider = new MockCopilotApiProvider(async () => ({
      data: {
        answer: "Task 1 exists, but Task 999 does not.",
        references: [
          { type: "task", ref: "task_1" },
          { type: "task", ref: "task_999" }, // Hallucinated
        ],
      },
      metadata: {
        model: "mock-copilot-model-deep_context",
      },
    }));
    (aiService as unknown as { customProvider?: AIProvider }).customProvider = mockProvider;

    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ question: "Check task 999." }),
    });

    const res = await response.json();

    assert.equal(response.status, 200);
    assert.equal(res.data.references.length, 1);
    assert.equal(res.data.references[0].id, task1A._id.toString());
    assert.equal(res.data.unmappedReferenceCount, 1);
    assert.equal(res.data.answer, "Task 1 exists, but Task 999 does not.");
  });

  // ---------------------------------------------------------------------------
  // 4. 100% Zero-Mutation Document-Level Snapshot Proof
  // ---------------------------------------------------------------------------

  it("14. Executing Copilot API performs 100% ZERO database mutations across all collections", async () => {
    // Capture pre-execution snapshots of all 5 domain collections
    const preProjects = await Project.find().lean();
    const preTasks = await Task.find().lean();
    const preMilestones = await Milestone.find().lean();
    const prePlanDrafts = await PlanDraft.find().lean();
    const preActivities = await Activity.find().lean();

    // Execute successful Copilot HTTP query
    const response = await fetch(`${baseUrl}/projects/${projectA._id}/copilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        question: "Does Task 1 depend on anything?",
        history: [{ role: "user", content: "Hi Copilot" }],
      }),
    });

    assert.equal(response.status, 200);

    // Capture post-execution snapshots
    const postProjects = await Project.find().lean();
    const postTasks = await Task.find().lean();
    const postMilestones = await Milestone.find().lean();
    const postPlanDrafts = await PlanDraft.find().lean();
    const postActivities = await Activity.find().lean();

    // Assert 100% document-level structural equality
    assert.deepStrictEqual(postProjects, preProjects, "Project collection must remain 100% unmutated");
    assert.deepStrictEqual(postTasks, preTasks, "Task collection must remain 100% unmutated");
    assert.deepStrictEqual(postMilestones, preMilestones, "Milestone collection must remain 100% unmutated");
    assert.deepStrictEqual(postPlanDrafts, prePlanDrafts, "PlanDraft collection must remain 100% unmutated");
    assert.deepStrictEqual(postActivities, preActivities, "Activity collection must remain 100% unmutated");
  });
});
