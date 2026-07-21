import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { createProject } from "@/services/project.service.js";
import { createTask } from "@/services/task.service.js";
import { generateSummaryForProject } from "@/services/project-summary-ai.service.js";
import { aiService } from "@/ai/ai.service.js";
import { promptRegistry } from "@/ai/prompts/registry/prompt.registry.js";
import { projectSummaryPrompt } from "@/ai/prompts/definitions/project-summary.prompt.js";
import User from "@/models/user.model.js";

describe("Project Summary AI Service", () => {
  let userId: string;
  let projectId: string;

  before(async () => {
    await setupTestDatabase();
    const user = await User.create({
      username: "summary_ai_user",
      name: "Summary AI User",
      email: "summary-ai@example.com",
      password: "password123",
    });
    userId = user._id.toString();

    const project = await createProject(userId, {
      name: "AI Summarization Project",
      description: "Testing summarization",
      emoji: "🚀",
      color: "blue"
    });
    projectId = project._id.toString();

    // Ensure prompt is registered
    try {
      promptRegistry.register(projectSummaryPrompt);
    } catch {
      // Ignore if already registered
    }
  });

  after(async () => {
    await teardownTestDatabase();
  });

  it("should successfully generate and persist a valid AI summary", async () => {
    await createTask(userId, { projectId: projectId as any, title: "Task 1", status: "done" });
    await createTask(userId, { projectId: projectId as any, title: "Task 2", status: "todo", priority: "high" });

    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    aiService.generateStructuredData = async () => ({
      data: { 
        summary: "This is a valid project summary that exceeds ten characters.", 
        highlights: ["Task 1 completed successfully."], 
        risks: ["Task 2 is high priority but not started."] 
      },
      metadata: { executionId: '123', provider: 'test', model: 'test', durationMs: 100, promptName: 'project-summary', promptVersion: '1.0' } } as any);

    try {
      const updatedProject = await generateSummaryForProject(projectId, userId);
      assert.ok(updatedProject.aiSummary);
      assert.strictEqual(updatedProject.aiSummary.summary, "This is a valid project summary that exceeds ten characters.");
      assert.strictEqual(updatedProject.aiSummary.highlights.length, 1);
      assert.strictEqual(updatedProject.aiSummary.risks.length, 1);
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("should normalize and deduplicate highlights and risks", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    aiService.generateStructuredData = async () => ({
      data: { 
        summary: "This is a valid project summary that exceeds ten characters.", 
        highlights: ["Dup highlight", " Dup highlight ", "Unique highlight", ""], 
        risks: ["Risk A", "Risk B", "Risk A"] 
      },
      metadata: { executionId: '123', provider: 'test', model: 'test', durationMs: 100, promptName: 'project-summary', promptVersion: '1.0' } } as any);

    try {
      const updatedProject = await generateSummaryForProject(projectId, userId);
      assert.ok(updatedProject.aiSummary);
      assert.strictEqual(updatedProject.aiSummary.highlights.length, 2);
      assert.strictEqual(updatedProject.aiSummary.highlights[0], "Dup highlight");
      assert.strictEqual(updatedProject.aiSummary.highlights[1], "Unique highlight");

      assert.strictEqual(updatedProject.aiSummary.risks.length, 2);
      assert.strictEqual(updatedProject.aiSummary.risks[0], "Risk A");
      assert.strictEqual(updatedProject.aiSummary.risks[1], "Risk B");
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("should truncate highlights and risks arrays to a maximum of 5 items", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    aiService.generateStructuredData = async () => ({
      data: { 
        summary: "This is a valid project summary that exceeds ten characters.", 
        highlights: ["h1", "h2", "h3", "h4", "h5", "h6"], 
        risks: ["r1", "r2", "r3", "r4", "r5", "r6", "r7"] 
      },
      metadata: { executionId: '123', provider: 'test', model: 'test', durationMs: 100, promptName: 'project-summary', promptVersion: '1.0' } } as any);

    try {
      const updatedProject = await generateSummaryForProject(projectId, userId);
      assert.ok(updatedProject.aiSummary);
      assert.strictEqual(updatedProject.aiSummary.highlights.length, 5);
      assert.strictEqual(updatedProject.aiSummary.risks.length, 5);
      assert.strictEqual(updatedProject.aiSummary.highlights[4], "h5");
      assert.strictEqual(updatedProject.aiSummary.risks[4], "r5");
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("should reject an empty summary generated by the AI", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    aiService.generateStructuredData = async () => ({
      data: { 
        summary: "   ", 
        highlights: [], 
        risks: [] 
      },
      metadata: { executionId: '123', provider: 'test', model: 'test', durationMs: 100, promptName: 'project-summary', promptVersion: '1.0' } } as any);

    try {
      await assert.rejects(
        async () => await generateSummaryForProject(projectId, userId),
        { name: "BadRequestError", message: "AI generated an invalid or empty summary." }
      );
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });
});
