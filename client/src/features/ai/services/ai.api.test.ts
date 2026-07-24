import { describe, it, expect, beforeEach, afterEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { apiClient } from "@/services/axios";
import { aiApi } from "./ai.api";

describe("AI API Module (ai.api.ts)", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  describe("generateTasks", () => {
    it("calls POST /projects/:id/generate-tasks with correct payload", async () => {
      const mockTasks = [
        {
          id: "task-1",
          title: "Build Landing Page",
          description: "Create hero section",
          status: "todo",
          priority: "high",
          projectId: "proj-123",
          dueDate: null,
          estimatedTime: "4h",
          labels: ["frontend"],
          archived: false,
          isDeleted: false,
          completedAt: null,
          createdAt: "2026-07-24T00:00:00.000Z",
          updatedAt: "2026-07-24T00:00:00.000Z",
          version: 1,
        },
      ];

      mock.onPost("/projects/proj-123/generate-tasks", { description: "Build landing page" }).reply(201, {
        success: true,
        message: "Tasks generated successfully.",
        data: { items: mockTasks },
      });

      const result = await aiApi.generateTasks("proj-123", { description: "Build landing page" });

      expect(result.items).toEqual(mockTasks);
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe("/projects/proj-123/generate-tasks");
      expect(JSON.parse(mock.history.post[0].data)).toEqual({ description: "Build landing page" });
    });

    it("throws error on API failure", async () => {
      mock.onPost("/projects/proj-123/generate-tasks").reply(400, {
        success: false,
        message: "A project description is required for task generation.",
      });

      await expect(aiApi.generateTasks("proj-123", { description: "" })).rejects.toThrow();
    });
  });

  describe("generateSummary", () => {
    it("calls POST /projects/:id/generate-summary with empty body", async () => {
      const mockProject = {
        id: "proj-123",
        name: "AI Project",
        description: "Demo",
        emoji: "📁",
        color: "#6366f1",
        archived: false,
        owner: "user-1",
        aiSummary: {
          summary: "Project is on track.",
          highlights: ["Initial setup complete"],
          risks: [" tight deadline"],
        },
        createdAt: "2026-07-24T00:00:00.000Z",
        updatedAt: "2026-07-24T00:00:00.000Z",
      };

      mock.onPost("/projects/proj-123/generate-summary", {}).reply(201, {
        success: true,
        message: "Project summary generated successfully.",
        data: { project: mockProject },
      });

      const result = await aiApi.generateSummary("proj-123");

      expect(result.project).toEqual(mockProject);
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe("/projects/proj-123/generate-summary");
    });
  });

  describe("generateLabels", () => {
    it("calls POST /tasks/:id/generate-labels with empty body", async () => {
      const mockTask = {
        id: "task-100",
        title: "Setup Auth",
        description: "Implement JWT login",
        status: "in_progress",
        priority: "urgent",
        projectId: "proj-123",
        dueDate: null,
        estimatedTime: null,
        labels: ["auth", "security", "jwt"],
        archived: false,
        isDeleted: false,
        completedAt: null,
        createdAt: "2026-07-24T00:00:00.000Z",
        updatedAt: "2026-07-24T00:00:00.000Z",
        version: 1,
      };

      mock.onPost("/tasks/task-100/generate-labels", {}).reply(201, {
        success: true,
        message: "Labels generated and applied successfully.",
        data: { task: mockTask },
      });

      const result = await aiApi.generateLabels("task-100");

      expect(result.task).toEqual(mockTask);
      expect(mock.history.post.length).toBe(1);
      expect(mock.history.post[0].url).toBe("/tasks/task-100/generate-labels");
    });
  });
});
