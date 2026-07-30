/**
 * REST API & Authorization Integration Tests for Global Search
 * Phase 31 ? Global Search & Command Palette
 * WP-03 ? Search REST API & Authorization
 */

import dotenv from "dotenv";
import http from "node:http";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";

dotenv.config();
process.env.NODE_ENV = "test";

import app from "../app.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import Activity from "../models/activity.model.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";
import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspace-member.model.js";
import { provisionPersonalWorkspace } from "../services/workspace.service.js";
import { generateAccessToken } from "../utils/jwt.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { SearchResultDto } from "../types/search.types.js";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

interface SearchResponseData {
  query: string;
  totalResults: number;
  items: SearchResultDto[];
}

describe("Phase 31 ? Global Search REST API Integration Tests", () => {
  let server: http.Server;
  let baseUrl: string;
  let userIdA: Types.ObjectId;
  let userIdB: Types.ObjectId;
  let workspaceIdA: Types.ObjectId;
  let workspaceIdB: Types.ObjectId;
  let tokenA: string;
  let tokenB: string;

  before(async () => {
    await setupTestDatabase();

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
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Milestone.deleteMany({});
    await ProjectMemory.deleteMany({});
    await Activity.deleteMany({});
    await ProjectRecommendation.deleteMany({});
    await WorkspaceMember.deleteMany({});
    await Workspace.deleteMany({});
    await User.deleteMany({});

    // Create User A & Personal Workspace
    const userA = await User.create({
      name: "User Alpha",
      username: "useralpha",
      email: "useralpha@example.com",
      password: "Password123!",
    });
    userIdA = userA._id;
    tokenA = generateAccessToken(userIdA.toString());
    const wsA = await provisionPersonalWorkspace(userA);
    workspaceIdA = wsA.workspace._id;

    // Create User B & Personal Workspace
    const userB = await User.create({
      name: "User Beta",
      username: "userbeta",
      email: "userbeta@example.com",
      password: "Password123!",
    });
    userIdB = userB._id;
    tokenB = generateAccessToken(userIdB.toString());
    const wsB = await provisionPersonalWorkspace(userB);
    workspaceIdB = wsB.workspace._id;
  });

  // A. AUTHENTICATION REQUIREMENT
  describe("A. Authentication Requirement", () => {
    it("1. rejects unauthenticated request with 401 Unauthorized", async () => {
      const res = await fetch(`${baseUrl}/search?q=alpha`);
      assert.equal(res.status, 401);
      const body = (await res.json()) as ApiResponse;
      assert.equal(body.success, false);
      assert.equal(body.message, "Authentication required.");
    });
  });

  // B. SEARCH REST API INPUT VALIDATION
  describe("B. Input Validation & Query Bounds", () => {
    it("2. rejects missing query parameter 'q' with 400", async () => {
      const res = await fetch(`${baseUrl}/search`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 400);
    });

    it("3. rejects empty or whitespace-only query parameter with 400", async () => {
      const res = await fetch(`${baseUrl}/search?q=%20%20`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 400);
    });

    it("4. rejects single-character query parameter with 400", async () => {
      const res = await fetch(`${baseUrl}/search?q=a`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 400);
    });

    it("18. rejects queries > 100 characters with 400", async () => {
      const longQuery = "a".repeat(101);
      const res = await fetch(`${baseUrl}/search?q=${longQuery}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 400);
    });

    it("19. rejects invalid entity type parameter with 400", async () => {
      const invalidTypes = ["user", "activity", "recommendation", "admin"];
      for (const t of invalidTypes) {
        const res = await fetch(`${baseUrl}/search?q=alpha&type=${t}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        assert.equal(res.status, 400);
      }
    });

    it("20-23. rejects invalid limit parameters (<=0, >50, non-numeric) with 400", async () => {
      const invalidLimits = ["0", "51", "-5", "abc"];
      for (const lim of invalidLimits) {
        const res = await fetch(`${baseUrl}/search?q=alpha&limit=${lim}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        assert.equal(res.status, 400);
      }
    });
  });

  // D. TENANT ISOLATION & AUTHORIZATION
  describe("D. Strict Tenant Authorization & Isolation", () => {
    it("24-29. User A searches User A records and cannot discover User B records", async () => {
      const projA = await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: "Alpha Project A" });
      await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: projA._id, title: "Alpha Task A" });
      await Milestone.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: projA._id, title: "Alpha Milestone A" });
      await ProjectMemory.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: projA._id, content: "Alpha Memory A" });

      const projB = await Project.create({ owner: userIdB, workspaceId: workspaceIdB, name: "Alpha Project B" });
      await Task.create({ owner: userIdB, workspaceId: workspaceIdB, projectId: projB._id, title: "Alpha Task B" });
      await Milestone.create({ owner: userIdB, workspaceId: workspaceIdB, projectId: projB._id, title: "Alpha Milestone B" });
      await ProjectMemory.create({ owner: userIdB, workspaceId: workspaceIdB, projectId: projB._id, content: "Alpha Memory B" });

      // User A search
      const resA = await fetch(`${baseUrl}/search?q=alpha`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const jsonA = (await resA.json()) as ApiResponse<SearchResponseData>;
      assert.equal(jsonA.data?.totalResults, 4);
      for (const item of jsonA.data?.items || []) {
        assert.ok(item.title.endsWith("A") || item.subtitle?.endsWith("A"));
      }

      // User B search
      const resB = await fetch(`${baseUrl}/search?q=alpha`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const jsonB = (await resB.json()) as ApiResponse<SearchResponseData>;
      assert.equal(jsonB.data?.totalResults, 4);
      for (const item of jsonB.data?.items || []) {
        assert.ok(item.title.endsWith("B") || item.subtitle?.endsWith("B"));
      }
    });

    it("30. query parameter manipulation (e.g. ?owner=...) cannot override authenticated user identity", async () => {
      const projB = await Project.create({ owner: userIdB, workspaceId: workspaceIdB, name: "Alpha Project B" });
      await Task.create({ owner: userIdB, workspaceId: workspaceIdB, projectId: projB._id, title: "Alpha Task B" });

      const res = await fetch(`${baseUrl}/search?q=alpha&owner=${userIdB.toString()}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const json = (await res.json()) as ApiResponse<SearchResponseData>;
      assert.equal(json.data?.totalResults, 0);
    });

    it("31-37. soft-deleted and archived entities or children under deleted/archived parents are excluded", async () => {
      const activeP = await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: "Main Active Project" });
      await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: activeP._id, title: "Alpha Active Task" });

      const delP = await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: "Alpha Deleted Project", isDeleted: true });
      await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: delP._id, title: "Alpha Task in Deleted Parent" });

      const archP = await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: "Alpha Archived Project", archived: true });
      await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: archP._id, title: "Alpha Task in Archived Parent" });
      await ProjectMemory.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: archP._id, content: "Alpha Memory in Archived Parent" });

      const res = await fetch(`${baseUrl}/search?q=alpha`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const json = (await res.json()) as ApiResponse<SearchResponseData>;
      assert.equal(json.data?.totalResults, 1);
      assert.equal(json.data?.items[0]?.title, "Alpha Active Task");
    });
  });

  // F. PUBLIC DTO PRIVACY BOUNDARY
  describe("F. Public DTO Privacy Boundary", () => {
    it("38-44. returns only approved public DTO fields and omits forbidden internal fields", async () => {
      const p = await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: "Alpha Project", description: "Alpha desc" });
      await ProjectMemory.create({
        owner: userIdA,
        workspaceId: workspaceIdA,
        projectId: p._id,
        content: "Secret content " + "M".repeat(200) + " alpha info",
      });

      const res = await fetch(`${baseUrl}/search?q=alpha`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const json = (await res.json()) as ApiResponse<SearchResponseData>;
      assert.ok(json.data);
      const items = json.data.items;

      const allowedKeys = new Set([
        "id",
        "type",
        "title",
        "subtitle",
        "url",
        "projectId",
        "projectName",
        "status",
        "updatedAt",
      ]);

      const forbiddenKeys = [
        "owner",
        "userId",
        "password",
        "refreshToken",
        "__v",
        "content",
        "claimToken",
        "fingerprint",
      ];

      for (const item of items) {
        const itemKeys = Object.keys(item);
        for (const k of itemKeys) {
          assert.ok(allowedKeys.has(k), `Forbidden or unexpected key '${k}' found in DTO`);
        }
        for (const f of forbiddenKeys) {
          assert.equal(
            (item as unknown as Record<string, unknown>)[f],
            undefined,
            `Forbidden field '${f}' leaked`
          );
        }
      }

      // Memory item snippet length bound assertion
      const memItem = items.find((i) => i.type === "memory");
      assert.ok(memItem?.subtitle);
      assert.ok(memItem.subtitle.length <= 100);
    });
  });

  // G. REGEX & INPUT SAFETY
  describe("G. Regex & Input Safety", () => {
    it("45-48. handles regex metacharacters and malicious HTML text safely without errors or execution", async () => {
      const p = await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: "C++ [API] Proj (draft)" });
      await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: p._id, title: "Task .* Wildcard" });
      await ProjectMemory.create({
        owner: userIdA,
        workspaceId: workspaceIdA,
        projectId: p._id,
        content: "Memory with <script>alert('xss')</script> text",
      });

      const resPlus = await fetch(`${baseUrl}/search?q=${encodeURIComponent("C++")}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(resPlus.status, 200);

      const resWild = await fetch(`${baseUrl}/search?q=${encodeURIComponent(".*")}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(resWild.status, 200);
      const jsonWild = (await resWild.json()) as ApiResponse<SearchResponseData>;
      assert.equal(jsonWild.data?.totalResults, 1);
      assert.equal(jsonWild.data?.items[0]?.title, "Task .* Wildcard");

      const resHtml = await fetch(`${baseUrl}/search?q=${encodeURIComponent("script")}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(resHtml.status, 200);
      const jsonHtml = (await resHtml.json()) as ApiResponse<SearchResponseData>;
      assert.ok(jsonHtml.data?.items[0]?.subtitle?.includes("<script>alert('xss')</script>"));
    });
  });

  // H. DETERMINISTIC RANKING PRESERVATION
  describe("H. Deterministic Ranking Preservation", () => {
    it("49-53. preserves WP-02 relevance ordering (exact > prefix > substring)", async () => {
      const p = await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: "Main Proj" });
      await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: p._id, title: "Alpha" });
      await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: p._id, title: "Alpha Engine" });
      await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: p._id, title: "Fix Alpha Bug" });

      const res = await fetch(`${baseUrl}/search?q=alpha&type=task`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const json = (await res.json()) as ApiResponse<SearchResponseData>;
      assert.equal(json.data?.items.length, 3);
      assert.equal(json.data?.items[0]?.title, "Alpha");
      assert.equal(json.data?.items[1]?.title, "Alpha Engine");
      assert.equal(json.data?.items[2]?.title, "Fix Alpha Bug");
    });
  });

  // I. BOUNDS ENFORCEMENT
  describe("I. Result Bounding Enforcement", () => {
    it("54-57. respects global limit (20) and per-type limit (5) for type=all", async () => {
      const p = await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: "Main Proj" });
      for (let i = 1; i <= 8; i++) {
        await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: `Alpha Proj ${i}` });
        await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: p._id, title: `Alpha Task ${i}` });
        await Milestone.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: p._id, title: `Alpha Milestone ${i}` });
        await ProjectMemory.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: p._id, content: `Alpha Memory ${i}` });
      }

      const res = await fetch(`${baseUrl}/search?q=alpha&type=all`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const json = (await res.json()) as ApiResponse<SearchResponseData>;
      assert.equal(json.data?.totalResults, 20);
      assert.equal(json.data?.items.length, 20);
    });
  });

  // J. RATE LIMITING
  describe("J. Rate Limiting (30 req/min/user)", () => {
    it("58-61. permits requests within rate limit and returns 429 when limit is exceeded per user", async () => {
      // Execute 30 valid requests with rate limit header enabled
      for (let i = 0; i < 30; i++) {
        const res = await fetch(`${baseUrl}/search?q=alpha`, {
          headers: {
            Authorization: `Bearer ${tokenA}`,
            "x-test-rate-limit": "true",
          },
        });
        assert.equal(res.status, 200, `Request #${i + 1} should succeed`);
      }

      // 31st request from User A MUST be rate limited (429)
      const resLimited = await fetch(`${baseUrl}/search?q=alpha`, {
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "x-test-rate-limit": "true",
        },
      });
      assert.equal(resLimited.status, 429);
      const jsonLimited = (await resLimited.json()) as ApiResponse;
      assert.equal(jsonLimited.success, false);
      assert.equal(jsonLimited.message, "Too many search requests, please try again after a minute.");

      // User B must NOT be rate limited by User A's traffic
      const resUserB = await fetch(`${baseUrl}/search?q=alpha`, {
        headers: {
          Authorization: `Bearer ${tokenB}`,
          "x-test-rate-limit": "true",
        },
      });
      assert.equal(resUserB.status, 200);
    });
  });

  // K. ZERO SIDE EFFECTS AUDIT
  describe("K. Zero Side-Effects Audit", () => {
    it("62-70. search endpoint executes zero database writes or side-effect entity creations", async () => {
      const p = await Project.create({ owner: userIdA, workspaceId: workspaceIdA, name: "Alpha Proj" });
      await Task.create({ owner: userIdA, workspaceId: workspaceIdA, projectId: p._id, title: "Alpha Task" });

      const countActivities = await Activity.countDocuments();
      const countRecs = await ProjectRecommendation.countDocuments();
      const countMemories = await ProjectMemory.countDocuments();

      const res = await fetch(`${baseUrl}/search?q=alpha`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      assert.equal(res.status, 200);

      assert.equal(await Activity.countDocuments(), countActivities);
      assert.equal(await ProjectRecommendation.countDocuments(), countRecs);
      assert.equal(await ProjectMemory.countDocuments(), countMemories);
    });
  });
});
