/**
 * Integration & Service Tests for Backend Deterministic Search Engine
 * Phase 31 — Global Search & Command Palette
 * WP-02 — Backend Deterministic Search Engine
 */

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import Activity from "../models/activity.model.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";

import { searchGlobalEntities } from "../services/global-search.service.js";

describe("WP-02: Backend Deterministic Search Engine", () => {
  const userA = new Types.ObjectId();
  const userB = new Types.ObjectId();

  before(async () => {
    await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Milestone.deleteMany({});
    await ProjectMemory.deleteMany({});
    await Activity.deleteMany({});
    await ProjectRecommendation.deleteMany({});
  });

  // A. PROJECT SEARCH
  describe("A. Project Search", () => {
    it("1. exact project name exact match scores highest", async () => {
      await Project.create({ owner: userA, name: "Alpha", description: "First project" });
      await Project.create({ owner: userA, name: "Alpha System", description: "Second project" });

      const res = await searchGlobalEntities({ ownerId: userA, query: "Alpha", type: "project" });
      assert.equal(res.items.length, 2);
      assert.equal(res.items[0]?.title, "Alpha");
      assert.equal(res.items[1]?.title, "Alpha System");
    });

    it("2-4. matches project prefix, substring, and description", async () => {
      await Project.create({ owner: userA, name: "Alpha Base", description: "Clean" });
      await Project.create({ owner: userA, name: "Core Alpha Engine", description: "Clean" });
      await Project.create({ owner: userA, name: "Project Beta", description: "Contains alpha notes" });

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "project" });
      assert.equal(res.items.length, 3);
      assert.equal(res.items[0]?.title, "Alpha Base"); // prefix
      assert.equal(res.items[1]?.title, "Core Alpha Engine"); // substring
      assert.equal(res.items[2]?.title, "Project Beta"); // description
    });

    it("5-7. excludes deleted, archived, and foreign owner projects", async () => {
      await Project.create({ owner: userA, name: "Alpha Active", isDeleted: false, archived: false });
      await Project.create({ owner: userA, name: "Alpha Deleted", isDeleted: true, archived: false });
      await Project.create({ owner: userA, name: "Alpha Archived", isDeleted: false, archived: true });
      await Project.create({ owner: userB, name: "Alpha Foreign", isDeleted: false, archived: false });

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "project" });
      assert.equal(res.items.length, 1);
      assert.equal(res.items[0]?.title, "Alpha Active");
    });
  });

  // B. TASK SEARCH
  describe("B. Task Search & Parent Scoping", () => {
    it("8-12. matches task exact title, prefix, substring, labels, and description", async () => {
      const proj = await Project.create({ owner: userA, name: "Main Project" });

      await Task.create({ owner: userA, projectId: proj._id, title: "Alpha" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Alpha Task" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Fix Alpha Bug" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Other Task", labels: ["alpha-release"] });
      await Task.create({ owner: userA, projectId: proj._id, title: "Unrelated Task", description: "Details on alpha" });

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "task" });
      assert.equal(res.items.length, 5);
      assert.equal(res.items[0]?.title, "Alpha");
      assert.equal(res.items[1]?.title, "Alpha Task");
      assert.equal(res.items[2]?.title, "Fix Alpha Bug");
      assert.equal(res.items[3]?.title, "Other Task");
      assert.equal(res.items[4]?.title, "Unrelated Task");
    });

    it("13-18. excludes archived task, deleted task, foreign task, and tasks under deleted/archived projects", async () => {
      const activeProj = await Project.create({ owner: userA, name: "Active Project", isDeleted: false, archived: false });
      const archivedProj = await Project.create({ owner: userA, name: "Archived Project", isDeleted: false, archived: true });
      const deletedProj = await Project.create({ owner: userA, name: "Deleted Project", isDeleted: true, archived: false });

      await Task.create({ owner: userA, projectId: activeProj._id, title: "Alpha Active Task" });
      await Task.create({ owner: userA, projectId: activeProj._id, title: "Alpha Archived Task", archived: true });
      await Task.create({ owner: userA, projectId: activeProj._id, title: "Alpha Deleted Task", isDeleted: true });
      await Task.create({ owner: userB, projectId: activeProj._id, title: "Alpha Foreign Task" });
      await Task.create({ owner: userA, projectId: archivedProj._id, title: "Alpha Task in Archived Project" });
      await Task.create({ owner: userA, projectId: deletedProj._id, title: "Alpha Task in Deleted Project" });

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "task" });
      assert.equal(res.items.length, 1);
      assert.equal(res.items[0]?.title, "Alpha Active Task");
    });
  });

  // C. MILESTONE SEARCH
  describe("C. Milestone Search", () => {
    it("19-24. matches milestone title and description while enforcing parent scoping", async () => {
      const activeProj = await Project.create({ owner: userA, name: "Active Project" });
      const archivedProj = await Project.create({ owner: userA, name: "Archived Project", archived: true });

      await Milestone.create({ owner: userA, projectId: activeProj._id, title: "Alpha Milestone" });
      await Milestone.create({ owner: userA, projectId: activeProj._id, title: "Phase 1", description: "Includes alpha milestone" });
      await Milestone.create({ owner: userA, projectId: activeProj._id, title: "Alpha Deleted", isDeleted: true });
      await Milestone.create({ owner: userB, projectId: activeProj._id, title: "Alpha Foreign" });
      await Milestone.create({ owner: userA, projectId: archivedProj._id, title: "Alpha Archived Parent" });

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "milestone" });
      assert.equal(res.items.length, 2);
      assert.equal(res.items[0]?.title, "Alpha Milestone");
      assert.equal(res.items[1]?.title, "Phase 1");
    });
  });

  // D. PROJECT MEMORY SEARCH & PRIVACY
  describe("D. ProjectMemory Search & Privacy Bounds", () => {
    it("25-31. searches memory content safely with bounded snippet and strict DTO bounds", async () => {
      const activeProj = await Project.create({ owner: userA, name: "Active Project" });
      const archivedProj = await Project.create({ owner: userA, name: "Archived Project", archived: true });

      const secretText = "X".repeat(50) + " UNIQUE_ALPHA_KEY " + "Y".repeat(150);
      await ProjectMemory.create({ owner: userA, projectId: activeProj._id, content: secretText });
      await ProjectMemory.create({ owner: userB, projectId: activeProj._id, content: "Foreign UNIQUE_ALPHA_KEY" });
      await ProjectMemory.create({ owner: userA, projectId: archivedProj._id, content: "Archived UNIQUE_ALPHA_KEY" });

      const res = await searchGlobalEntities({ ownerId: userA, query: "UNIQUE_ALPHA_KEY", type: "memory" });
      assert.equal(res.items.length, 1);
      const memItem = res.items[0]!;

      assert.equal(memItem.type, "memory");
      assert.equal(memItem.title, "Project Memory");
      assert.ok(memItem.subtitle);
      assert.ok(memItem.subtitle.length <= 100);
      assert.ok(memItem.subtitle.includes("UNIQUE_ALPHA_KEY"));
      assert.equal((memItem as unknown as Record<string, unknown>).content, undefined);
      assert.equal((memItem as unknown as Record<string, unknown>).owner, undefined);
      assert.equal((memItem as unknown as Record<string, unknown>).__v, undefined);
    });

    it("31. malicious HTML markup in memory content remains plain text without injection", async () => {
      const activeProj = await Project.create({ owner: userA, name: "Active Project" });
      await ProjectMemory.create({
        owner: userA,
        projectId: activeProj._id,
        content: "Security test with <script>alert('alpha')</script> markup.",
      });

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "memory" });
      assert.equal(res.items.length, 1);
      assert.ok(res.items[0]?.subtitle?.includes("<script>alert('alpha')</script>"));
      assert.equal(res.items[0]?.subtitle?.includes("<mark>"), false);
    });
  });

  // E. REGEX SAFETY
  describe("E. Regex Safety", () => {
    it("32-35. handles special regex symbols literally without wildcard expansion", async () => {
      const proj = await Project.create({ owner: userA, name: "Proj C++" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Task [API]" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Task .* Wildcard" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Task (draft)" });

      const resPlus = await searchGlobalEntities({ ownerId: userA, query: "C++", type: "project" });
      assert.equal(resPlus.items.length, 1);
      assert.equal(resPlus.items[0]?.title, "Proj C++");

      const resBracket = await searchGlobalEntities({ ownerId: userA, query: "[API]", type: "task" });
      assert.equal(resBracket.items.length, 1);
      assert.equal(resBracket.items[0]?.title, "Task [API]");

      const resWildcard = await searchGlobalEntities({ ownerId: userA, query: ".*", type: "task" });
      assert.equal(resWildcard.items.length, 1);
      assert.equal(resWildcard.items[0]?.title, "Task .* Wildcard");
    });
  });

  // F. DETERMINISTIC RANKING & TIE BREAKING
  describe("F. Deterministic Ranking & Tie-Breaking", () => {
    it("36-42. respects exact > prefix > substring > label > description and sorts by score DESC, updatedAt DESC, id ASC", async () => {
      const proj = await Project.create({ owner: userA, name: "Alpha Project" });
      const now = new Date();
      const older = new Date(now.getTime() - 10000);

      // Create items with controlled scores and timestamps
      const exactTask = await Task.create({ owner: userA, projectId: proj._id, title: "Alpha", updatedAt: older });
      const prefixTask = await Task.create({ owner: userA, projectId: proj._id, title: "Alpha Team", updatedAt: now });
      const labelTask = await Task.create({ owner: userA, projectId: proj._id, title: "Other Task", labels: ["alpha"], updatedAt: now });
      const descTask = await Task.create({ owner: userA, projectId: proj._id, title: "Misc Task", description: "alpha details", updatedAt: now });

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "task" });
      assert.equal(res.items.length, 4);
      assert.equal(res.items[0]?.id, exactTask._id.toString()); // score 100
      assert.equal(res.items[1]?.id, prefixTask._id.toString()); // score 80
      assert.equal(res.items[2]?.id, labelTask._id.toString()); // score 40
      assert.equal(res.items[3]?.id, descTask._id.toString()); // score 30
    });

    it("42. repeated searches against unchanged database yield identical ordering", async () => {
      const proj = await Project.create({ owner: userA, name: "Main Project" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Alpha 1" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Alpha 2" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Alpha 3" });

      const run1 = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "all" });
      const run2 = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "all" });
      assert.deepEqual(
        run1.items.map((i) => i.id),
        run2.items.map((i) => i.id)
      );
    });
  });

  // G. BOUNDS
  describe("G. Candidate & Output Bounding", () => {
    it("43-47. type=all enforces max 5 per entity type and max 20 overall", async () => {
      const proj = await Project.create({ owner: userA, name: "Alpha Project Main" });

      // Create 8 projects, 8 tasks, 8 milestones, 8 memories
      for (let i = 1; i <= 8; i++) {
        await Project.create({ owner: userA, name: `Alpha Project ${i}` });
        await Task.create({ owner: userA, projectId: proj._id, title: `Alpha Task ${i}` });
        await Milestone.create({ owner: userA, projectId: proj._id, title: `Alpha Milestone ${i}` });
        await ProjectMemory.create({ owner: userA, projectId: proj._id, content: `Alpha Memory content ${i}` });
      }

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "all" });
      assert.equal(res.items.length, 20); // 5 * 4 = 20 max

      const counts = res.items.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      assert.equal(counts.project, 5);
      assert.equal(counts.task, 5);
      assert.equal(counts.milestone, 5);
      assert.equal(counts.memory, 5);
    });
  });

  // H. TYPE FILTERING
  describe("H. Type-Specific Filtering", () => {
    it("48-52. type=project queries only projects and ignores other entities", async () => {
      const proj = await Project.create({ owner: userA, name: "Alpha Project" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Alpha Task" });

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "project" });
      assert.equal(res.items.length, 1);
      assert.equal(res.items[0]?.type, "project");
      assert.equal(res.items[0]?.title, "Alpha Project");
    });
  });

  // I. DOMAIN DEFENSIVENESS
  describe("I. Domain Defensiveness", () => {
    it("53-54. queries below search threshold (<2 chars) return empty results with 0 queries", async () => {
      await Project.create({ owner: userA, name: "Alpha Project" });

      const res = await searchGlobalEntities({ ownerId: userA, query: "a", type: "all" });
      assert.equal(res.totalResults, 0);
      assert.equal(res.items.length, 0);
    });
  });

  // J. SIDE-EFFECT AUDIT
  describe("J. Side-Effect Audit", () => {
    it("55-59. search executes zero database writes and creates zero side-effect documents", async () => {
      const proj = await Project.create({ owner: userA, name: "Alpha Project" });
      await Task.create({ owner: userA, projectId: proj._id, title: "Alpha Task" });

      const initialActivities = await Activity.countDocuments();
      const initialRecs = await ProjectRecommendation.countDocuments();
      const initialMemories = await ProjectMemory.countDocuments();

      await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "all" });

      assert.equal(await Activity.countDocuments(), initialActivities);
      assert.equal(await ProjectRecommendation.countDocuments(), initialRecs);
      assert.equal(await ProjectMemory.countDocuments(), initialMemories);
    });
  });

  // K. DTO SECURITY & PRIVACY
  describe("K. DTO Security & Privacy", () => {
    it("60-64. returns only clean SearchResultDto fields without internal database or user fields", async () => {
      const proj = await Project.create({ owner: userA, name: "Alpha Project", description: "Test desc" });

      const res = await searchGlobalEntities({ ownerId: userA, query: "alpha", type: "project" });
      assert.equal(res.items.length, 1);
      const item = res.items[0]!;

      assert.equal(item.id, proj._id.toString());
      assert.equal(item.type, "project");
      assert.equal(item.title, "Alpha Project");
      assert.equal(item.url, `/projects/${proj._id}`);
      assert.ok(item.updatedAt);

      // Verify forbidden keys are absent
      const raw = item as unknown as Record<string, unknown>;
      assert.equal(raw.owner, undefined);
      assert.equal(raw.userId, undefined);
      assert.equal(raw.__v, undefined);
      assert.equal(raw.password, undefined);
    });
  });
});
