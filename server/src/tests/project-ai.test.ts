import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import { setupTestDB, teardownTestDB } from "./test-db.js";
import { createProject } from "@/services/project.service.js";
import { createTask } from "@/services/task.service.js";
import { generateTasksForProject } from "@/services/project-ai.service.js";
import { aiService } from "@/ai/ai.service.js";
import { promptRegistry } from "@/ai/prompts/registry/prompt.registry.js";
import { projectToTasksPrompt } from "@/ai/prompts/definitions/project-tasks.prompt.js";
import User from "@/models/user.model.js";

describe("Project AI Service - Task Generation", () => {
  let userId: string;
  let projectId: string;

  before(async () => {
    await setupTestDB();
    const user = await User.create({
      name: "AI Test User",
      email: "ai-test@example.com",
      password: "password123",
    });
    userId = user._id.toString();

    const project = await createProject(userId, {
      name: "AI Test Project",
      description: "A project for testing AI tasks",
    });
    projectId = project._id.toString();

    // Ensure prompt is registered for testing
    try {
      promptRegistry.register(projectToTasksPrompt);
    } catch (e) {
      // ignore if already registered
    }
  });

  after(async () => {
    await teardownTestDB();
  });

  it("should successfully generate and persist tasks from AI", async () => {
    // Mock the AI service
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    aiService.generateStructuredData = async () => ({
      data: {
        tasks: [
          { title: "Task 1", description: "Desc 1", priority: "high", estimatedTime: "1h", suggestedOrder: 1 },
          { title: "Task 2", description: "Desc 2", priority: "low", estimatedTime: null, suggestedOrder: 2 }
        ]
      },
      metadata: { executionId: '123', provider: 'test', model: 'test', durationMs: 100, promptName: 'project-to-tasks', promptVersion: '1.0' }
    });

    try {
      const tasks = await generateTasksForProject(projectId, userId, "Make a generic test suite");
      assert.strictEqual(tasks.length, 2);
      assert.strictEqual(tasks[0].title, "Task 1");
      assert.strictEqual(tasks[0].projectId?.toString(), projectId);
      assert.strictEqual(tasks[1].title, "Task 2");
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("should filter out duplicate task titles from the AI response", async () => {
    // Manually create a task first
    await createTask(userId, { projectId, title: "Duplicate Task" });

    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    aiService.generateStructuredData = async () => ({
      data: {
        tasks: [
          { title: "Duplicate Task", description: "Existing", priority: "none", estimatedTime: null, suggestedOrder: 1 },
          { title: "New Task", description: "New", priority: "none", estimatedTime: null, suggestedOrder: 2 }
        ]
      },
      metadata: { executionId: '123', provider: 'test', model: 'test', durationMs: 100, promptName: 'project-to-tasks', promptVersion: '1.0' }
    });

    try {
      const tasks = await generateTasksForProject(projectId, userId, "Test duplicates");
      assert.strictEqual(tasks.length, 1);
      assert.strictEqual(tasks[0].title, "New Task");
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("should throw BadRequestError if AI returns no actionable new tasks", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    aiService.generateStructuredData = async () => ({
      data: { tasks: [] },
      metadata: { executionId: '123', provider: 'test', model: 'test', durationMs: 100, promptName: 'project-to-tasks', promptVersion: '1.0' }
    });

    try {
      await assert.rejects(
        () => generateTasksForProject(projectId, userId, "Empty test"),
        /AI did not generate any new actionable tasks/
      );
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });
});
