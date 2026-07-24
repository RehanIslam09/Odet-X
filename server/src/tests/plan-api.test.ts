import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Types } from "mongoose";
import app from "../app.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import PlanDraft from "../models/plan-draft.model.js";
import Activity from "../models/activity.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { aiService } from "../ai/ai.service.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { ACTIVITY_TYPES } from "../constants/activity.js";

describe("Planning API (WP-04) Integration Tests", () => {
  let server: http.Server;
  let baseUrl: string;

  let userId: Types.ObjectId;
  let token: string;
  let projectId: Types.ObjectId;

  let foreignUserId: Types.ObjectId;
  let foreignToken: string;

  let archivedProjectId: Types.ObjectId;

  before(async () => {
    await setupTestDatabase();

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

    const user = await User.create({
      name: "API Test User",
      username: "apiuser",
      email: "apiuser@example.com",
      password: "Password123!",
    });
    userId = user._id;
    token = generateAccessToken(userId.toString());

    const foreignUser = await User.create({
      name: "Foreign API User",
      username: "apiforeign",
      email: "apiforeign@example.com",
      password: "Password123!",
    });
    foreignUserId = foreignUser._id;
    foreignToken = generateAccessToken(foreignUserId.toString());

    const project = await Project.create({
      name: "API Target Project",
      description: "Build an API SaaS platform",
      owner: userId,
    });
    projectId = project._id;

    const archivedProject = await Project.create({
      name: "Archived API Project",
      archived: true,
      owner: userId,
    });
    archivedProjectId = archivedProject._id;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await Milestone.deleteMany({});
    await PlanDraft.deleteMany({});
    await Activity.deleteMany({});
  });

  it("1. AUTHENTICATION BOUNDARY: Unauthenticated requests return 401 Unauthorized", async () => {
    const fakeDraftId = new Types.ObjectId().toString();

    const resGen = await fetch(`${baseUrl}/projects/${projectId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Build SaaS" }),
    });
    assert.equal(resGen.status, 401);

    const resGet = await fetch(`${baseUrl}/projects/${projectId}/plans/${fakeDraftId}`);
    assert.equal(resGet.status, 401);

    const resPatch = await fetch(`${baseUrl}/projects/${projectId}/plans/${fakeDraftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: [] }),
    });
    assert.equal(resPatch.status, 401);

    const resDel = await fetch(`${baseUrl}/projects/${projectId}/plans/${fakeDraftId}`, { method: "DELETE" });
    assert.equal(resDel.status, 401);

    const resCommit = await fetch(`${baseUrl}/projects/${projectId}/plans/${fakeDraftId}/commit`, { method: "POST" });
    assert.equal(resCommit.status, 401);
  });

  it("2. GENERATE DRAFT ENDPOINT: POST /projects/:projectId/plans validates requirements and persists draft", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    (aiService as any).generateStructuredData = async () => ({
      data: {
        milestones: [{ ref: "ms1", title: "M1", position: 1 }],
        tasks: [{ ref: "t1", title: "Task 1", position: 1, dependencies: [], milestoneRef: "ms1" }],
      },
      metadata: { durationMs: 100 },
    });

    try {
      // 2a. Invalid prompt bounds (empty or > 2000 chars)
      const resEmpty = await fetch(`${baseUrl}/projects/${projectId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: "" }),
      });
      assert.equal(resEmpty.status, 400);

      const resOversized = await fetch(`${baseUrl}/projects/${projectId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: "A".repeat(2001) }),
      });
      assert.equal(resOversized.status, 400);

      // 2b. Archived project attempt -> 400 Bad Request
      const resArchived = await fetch(`${baseUrl}/projects/${archivedProjectId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: "Build archived SaaS" }),
      });
      assert.equal(resArchived.status, 400);

      // 2c. Valid request
      const resValid = await fetch(`${baseUrl}/projects/${projectId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: "Build SaaS platform backend" }),
      });

      assert.equal(resValid.status, 201);
      const body = await resValid.json();
      assert.equal(body.success, true);
      assert.equal(body.data.status, "draft");
      assert.equal(body.data.tasks.length, 1);
      assert.equal(body.data.milestones.length, 1);

      // Verify AI_PLAN_GENERATED activity logged in DB
      const activities = await Activity.find({ owner: userId, type: ACTIVITY_TYPES.AI_PLAN_GENERATED });
      assert.equal(activities.length, 1);
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("3. RETRIEVE DRAFT ENDPOINT: GET /projects/:projectId/plans/:draftId enforces project and owner scoping", async () => {
    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Retrieve test",
      expiresAt: new Date(Date.now() + 86400000),
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: [] }],
    });

    // 3a. Owner retrieves own draft -> 200 OK
    const resGet = await fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resGet.status, 200);
    const body = await resGet.json();
    assert.equal(body.data.id, draft._id.toString());

    // 3b. Foreign user attempts retrieval -> 404 Not Found (anti-enumeration)
    const resForeign = await fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}`, {
      headers: { Authorization: `Bearer ${foreignToken}` },
    });
    assert.equal(resForeign.status, 404);

    // 3c. Malformed ObjectId -> 400 Bad Request
    const resMalformed = await fetch(`${baseUrl}/projects/${projectId}/plans/invalid-id`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resMalformed.status, 400);
  });

  it("4. EDIT DRAFT ENDPOINT: PATCH /projects/:projectId/plans/:draftId re-runs PlanValidator and strips immutable fields", async () => {
    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Edit test",
      expiresAt: new Date(Date.now() + 86400000),
      milestones: [{ tempId: "temp_ms_1", title: "M1", position: 1 }],
      tasks: [{ tempId: "temp_task_1", title: "Task 1", position: 1, dependencies: [] }],
    });

    // 4a. Valid edit
    const resValid = await fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        tasks: [
          { tempId: "temp_task_1", title: "Updated Task 1", priority: "high", position: 1, dependencies: [], milestoneTempId: "temp_ms_1" },
        ],
      }),
    });
    assert.equal(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.equal(bodyValid.data.tasks[0].title, "Updated Task 1");

    // 4b. Invalid Graph Edit (DAG Cycle) -> 400 Bad Request
    const resCycle = await fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        tasks: [
          { tempId: "t1", title: "T1", position: 1, dependencies: ["t2"] },
          { tempId: "t2", title: "T2", position: 2, dependencies: ["t1"] },
        ],
      }),
    });
    assert.equal(resCycle.status, 400);

    // Verify draft in MongoDB was NOT changed by invalid edit
    const dbDraft = await PlanDraft.findById(draft._id);
    assert.equal(dbDraft?.tasks[0]?.title, "Updated Task 1");

    // 4c. Tampering with immutable server fields (status, owner, projectId, expiresAt) -> server ignores/strips them
    const resTamper = await fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        status: "committed",
        owner: foreignUserId.toString(),
        tasks: [{ tempId: "temp_task_1", title: "Updated Task 1", position: 1, dependencies: [] }],
      }),
    });
    assert.equal(resTamper.status, 200);

    const dbDraftAfterTamper = await PlanDraft.findById(draft._id);
    assert.equal(dbDraftAfterTamper?.status, "draft");
    assert.equal(dbDraftAfterTamper?.owner.toString(), userId.toString());
  });

  it("5. DISCARD DRAFT ENDPOINT: DELETE /projects/:projectId/plans/:draftId transitions status and logs activity", async () => {
    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Discard test",
      expiresAt: new Date(Date.now() + 86400000),
      tasks: [{ tempId: "t1", title: "Task 1", position: 1, dependencies: [] }],
    });

    const resDel = await fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resDel.status, 200);

    const updatedDraft = await PlanDraft.findById(draft._id);
    assert.equal(updatedDraft?.status, "discarded");

    // Verify AI_PLAN_DISCARDED activity logged
    const activities = await Activity.find({ owner: userId, type: ACTIVITY_TYPES.AI_PLAN_DISCARDED });
    assert.equal(activities.length, 1);
    assert.equal(activities[0]?.metadata.draftId, draft._id.toString());

    // Discarded draft cannot be edited
    const resEdit = await fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tasks: [{ tempId: "t1", title: "New Title", position: 1, dependencies: [] }] }),
    });
    assert.equal(resEdit.status, 400);
  });

  it("6. COMMIT DRAFT ENDPOINT: POST /projects/:projectId/plans/:draftId/commit persists records and rejects replay", async () => {
    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Commit HTTP test",
      expiresAt: new Date(Date.now() + 86400000),
      tasks: [{ tempId: "temp_task_1", title: "API Task 1", position: 1, dependencies: [] }],
    });

    // 6a. Valid Commit
    const resCommit = await fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}/commit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resCommit.status, 200);
    const body = await resCommit.json();
    assert.equal(body.data.taskCount, 1);

    const tasksInDb = await Task.find({ projectId });
    assert.equal(tasksInDb.length, 1);
    assert.equal(tasksInDb[0]?.title, "API Task 1");

    // 6b. Replay Commit -> 400 Bad Request
    const resReplay = await fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}/commit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resReplay.status, 400);

    // Verify only 1 task set exists in DB
    const tasksAfterReplay = await Task.find({ projectId });
    assert.equal(tasksAfterReplay.length, 1);
  });

  it("7. CONCURRENCY INTEGRATION TEST: Concurrent HTTP commit requests produce exactly ONE committed plan in DB", async () => {
    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Race test plan",
      expiresAt: new Date(Date.now() + 86400000),
      milestones: [{ tempId: "m1", title: "Race M1", position: 1 }],
      tasks: [{ tempId: "t1", title: "Race Task 1", position: 1, dependencies: [] }],
    });

    const commitReq1 = fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}/commit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const commitReq2 = fetch(`${baseUrl}/projects/${projectId}/plans/${draft._id}/commit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const results = await Promise.allSettled([commitReq1, commitReq2]);
    assert.equal(results.length, 2);

    // Verify FINAL database state
    const finalDraft = await PlanDraft.findById(draft._id);
    assert.equal(finalDraft?.status, "committed");

    const tasksInDb = await Task.find({ projectId });
    const milestonesInDb = await Milestone.find({ projectId });

    assert.equal(tasksInDb.length, 1, "CONCURRENCY SAFETY VIOLATION: Duplicate tasks were created!");
    assert.equal(milestonesInDb.length, 1, "CONCURRENCY SAFETY VIOLATION: Duplicate milestones were created!");
  });

  it("8. BACKWARD COMPATIBILITY REGRESSION TEST: POST /projects/:id/generate-tasks remains 100% operational", async () => {
    const originalGenerate = aiService.generateStructuredData.bind(aiService);
    (aiService as any).generateStructuredData = async () => ({
      data: {
        tasks: [{ title: "Legacy Generated Task", priority: "medium", estimatedTime: "1h" }],
      },
      metadata: { durationMs: 50 },
    });

    try {
      const resTasks = await fetch(`${baseUrl}/projects/${projectId}/generate-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: "Generate backend tasks" }),
      });

      assert.equal(resTasks.status, 201);
      const body = await resTasks.json();
      assert.equal(body.success, true);
      assert.equal(body.data.items.length, 1);
      assert.equal(body.data.items[0].title, "Legacy Generated Task");
    } finally {
      aiService.generateStructuredData = originalGenerate;
    }
  });

  it("9. ACTIVE DRAFT DISCOVERY API TEST: GET /projects/:projectId/plans/active returns correct active draft state", async () => {
    // 9a. No active draft -> returns data: null
    const resEmpty = await fetch(`${baseUrl}/projects/${projectId}/plans/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resEmpty.status, 200);
    const bodyEmpty = await resEmpty.json();
    assert.equal(bodyEmpty.success, true);
    assert.equal(bodyEmpty.data, null);

    // 9b. Create active draft -> returns active draft
    const draft = await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Active draft test",
      expiresAt: new Date(Date.now() + 86400000),
      tasks: [{ tempId: "t1", title: "Active Task", position: 1, dependencies: [] }],
    });

    const resActive = await fetch(`${baseUrl}/projects/${projectId}/plans/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resActive.status, 200);
    const bodyActive = await resActive.json();
    assert.equal(bodyActive.success, true);
    assert.equal(bodyActive.data.id, draft._id.toString());
    assert.equal(bodyActive.data.status, "draft");

    // 9c. Discard draft -> active endpoint returns null
    draft.status = "discarded";
    await draft.save();

    const resDiscarded = await fetch(`${baseUrl}/projects/${projectId}/plans/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resDiscarded.status, 200);
    const bodyDiscarded = await resDiscarded.json();
    assert.equal(bodyDiscarded.data, null);

    // 9d. Expired draft -> active endpoint returns null
    await PlanDraft.create({
      owner: userId,
      projectId,
      status: "draft",
      promptDescription: "Expired draft test",
      expiresAt: new Date(Date.now() - 1000),
      tasks: [{ tempId: "t1", title: "Expired Task", position: 1, dependencies: [] }],
    });

    const resExpired = await fetch(`${baseUrl}/projects/${projectId}/plans/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resExpired.status, 200);
    const bodyExpired = await resExpired.json();
    assert.equal(bodyExpired.data, null);
  });
});
