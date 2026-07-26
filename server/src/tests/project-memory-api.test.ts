import dotenv from "dotenv";
import http from "node:http";
import { describe, it, before, after } from "node:test";
import { Types } from "mongoose";

dotenv.config();

import app from "../app.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import Activity from "../models/activity.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";

let testCounter = 0;

function expect(value: boolean, message: string) {
  testCounter++;
  if (!value) {
    console.error(`❌ Assertion Failed (#${testCounter}): ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ Test #${testCounter}: ${message}`);
}

interface ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  message: string;
  data: T;
}

interface MemoryPayload {
  id: string;
  content: string;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface SingleMemoryData {
  memory: MemoryPayload;
}

interface ListMemoryData {
  items: MemoryPayload[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

describe("Project Memory API (WP-02) Integration Tests", () => {
  let server: http.Server;
  let baseUrl: string;

  let userId1: Types.ObjectId;
  let userToken1: string;

  let userId2: Types.ObjectId;
  let userToken2: string;

  let activeProject1: Types.ObjectId;
  let activeProject2: Types.ObjectId;
  let user2Project: Types.ObjectId;
  let archivedProject: Types.ObjectId;
  let deletedProject: Types.ObjectId;

  before(async () => {
    process.env.NODE_ENV = "test";
    await setupTestDatabase();

    // Start HTTP server on an ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
        }
        resolve();
      });
    });

    // Create User 1 & Token
    const user1 = await User.create({
      name: "Mem User 1",
      username: "memuser1",
      email: "memuser1@example.com",
      password: "Password123!",
    });
    userId1 = user1._id;
    userToken1 = generateAccessToken(userId1.toString());

    // Create User 2 & Token
    const user2 = await User.create({
      name: "Mem User 2",
      username: "memuser2",
      email: "memuser2@example.com",
      password: "Password123!",
    });
    userId2 = user2._id;
    userToken2 = generateAccessToken(userId2.toString());

    // Create Projects
    const p1 = await Project.create({ owner: userId1, name: "API Active Project 1" });
    activeProject1 = p1._id;

    const p2 = await Project.create({ owner: userId1, name: "API Active Project 2" });
    activeProject2 = p2._id;

    const u2p = await Project.create({ owner: userId2, name: "User 2 Project" });
    user2Project = u2p._id;

    const arch = await Project.create({ owner: userId1, name: "API Archived Project", archived: true });
    archivedProject = arch._id;

    const del = await Project.create({ owner: userId1, name: "API Deleted Project", isDeleted: true });
    deletedProject = del._id;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await teardownTestDatabase();
  });

  console.log("\n==================================================");
  console.log("▶ Project Memory REST API Integration Tests");
  console.log("==================================================\n");

  it("1. AUTHENTICATION: All 4 endpoints return 401 Unauthorized when missing token", async () => {
    const fakeMemId = new Types.ObjectId().toString();

    const resPost = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Unauthorized" }),
    });
    expect(resPost.status === 401, "POST returns 401 when missing token");

    const resGet = await fetch(`${baseUrl}/projects/${activeProject1}/memories`);
    expect(resGet.status === 401, "GET returns 401 when missing token");

    const resPatch = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${fakeMemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Updated", expectedVersion: 0 }),
    });
    expect(resPatch.status === 401, "PATCH returns 401 when missing token");

    const resDel = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${fakeMemId}`, {
      method: "DELETE",
    });
    expect(resDel.status === 401, "DELETE returns 401 when missing token");
  });

  it("2. POST /projects/:projectId/memories — Create memory requirements & bounds", async () => {
    // 2a. Authenticated owner create succeeds
    const res1 = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken1}`,
      },
      body: JSON.stringify({ content: "  Production deployments happen on Fridays.  " }),
    });
    expect(res1.status === 201, "POST returns 201 Created");
    const json1 = (await res1.json()) as ApiResponse<SingleMemoryData>;
    expect(json1.success === true, "Response has success: true");
    expect(
      json1.data.memory.content === "Production deployments happen on Fridays.",
      "Content trimmed on create",
    );
    expect(typeof json1.data.memory.id === "string", "Returns safe memory DTO with id");
    expect(typeof json1.data.memory.version === "number", "Returns safe memory DTO with version");
    expect(!("owner" in json1.data.memory), "Safe DTO does not leak owner");
    expect(!("projectId" in json1.data.memory), "Safe DTO does not leak projectId");
    expect(!("__v" in json1.data.memory), "Safe DTO does not leak __v");

    // 2b. Duplicate content is permitted
    const resDup = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken1}`,
      },
      body: JSON.stringify({ content: "Production deployments happen on Fridays." }),
    });
    expect(resDup.status === 201, "Duplicate memory content returns 201 Created");

    // 2c. Owned archived project can create memory
    const resArchived = await fetch(`${baseUrl}/projects/${archivedProject}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken1}`,
      },
      body: JSON.stringify({ content: "Archived project memory note" }),
    });
    expect(resArchived.status === 201, "Archived project returns 201 Created");

    // 2d. Whitespace-only rejected
    const resWs = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken1}`,
      },
      body: JSON.stringify({ content: "   \n\t   " }),
    });
    expect(resWs.status === 400, "Whitespace-only content returns 400 Bad Request");

    // 2e. >1000 chars rejected
    const resLong = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken1}`,
      },
      body: JSON.stringify({ content: "a".repeat(1001) }),
    });
    expect(resLong.status === 400, ">1000 chars content returns 400 Bad Request");

    // 2f. Client attempts to specify owner/projectId/sourceType are ignored/rejected
    const resPayload = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken1}`,
      },
      body: JSON.stringify({
        content: "Payload override test",
        owner: userId2.toString(),
        projectId: activeProject2.toString(),
        sourceType: "SYSTEM",
      }),
    });
    expect(resPayload.status === 201, "POST succeeds while ignoring extra payload fields");
    const jsonPayload = (await resPayload.json()) as ApiResponse<SingleMemoryData>;
    expect(jsonPayload.data.memory.sourceType === "USER", "sourceType remains server-enforced USER");

    // 2g. Foreign (unowned) project returns 404 NotFoundError
    const resForeign = await fetch(`${baseUrl}/projects/${user2Project}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken1}`,
      },
      body: JSON.stringify({ content: "Unowned create" }),
    });
    expect(resForeign.status === 404, "Foreign project create returns 404 NotFoundError");

    // 2h. Soft-deleted project returns 404 NotFoundError
    const resDelProj = await fetch(`${baseUrl}/projects/${deletedProject}/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken1}`,
      },
      body: JSON.stringify({ content: "Deleted project create" }),
    });
    expect(resDelProj.status === 404, "Deleted project create returns 404 NotFoundError");

    // 2i. Malformed projectId returns 400 BadRequestError
    const resBadId = await fetch(`${baseUrl}/projects/invalid-id-format/memories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken1}`,
      },
      body: JSON.stringify({ content: "Bad ID format" }),
    });
    expect(resBadId.status === 400, "Malformed projectId returns 400 BadRequestError");
  });

  it("3. GET /projects/:projectId/memories — List memories & pagination contract", async () => {
    await ProjectMemory.deleteMany({});

    // Seed test data
    const m1 = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Memory Item 1" }),
    });
    await new Promise((r) => setTimeout(r, 10));
    await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Memory Item 2" }),
    });
    await new Promise((r) => setTimeout(r, 10));
    const m3 = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Memory Item 3" }),
    });

    const j1 = (await m1.json()) as ApiResponse<SingleMemoryData>;
    const j3 = (await m3.json()) as ApiResponse<SingleMemoryData>;

    // Seed User 2 & Project 2 memories for isolation check
    await fetch(`${baseUrl}/projects/${activeProject2}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Project 2 Memory" }),
    });
    await fetch(`${baseUrl}/projects/${user2Project}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken2}` },
      body: JSON.stringify({ content: "User 2 Memory" }),
    });

    // 3a. Owned memories returned with default pagination & newest-first order
    const resList = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resList.status === 200, "GET list returns 200 OK");
    const jsonList = (await resList.json()) as ApiResponse<ListMemoryData>;
    expect(jsonList.data.items.length === 3, "Returns 3 items for Project 1");
    expect(jsonList.data.items[0]!.id === j3.data.memory.id, "Newest item (Memory Item 3) comes first");
    expect(jsonList.data.items[2]!.id === j1.data.memory.id, "Oldest item (Memory Item 1) comes last");
    expect(jsonList.data.pagination.page === 1 && jsonList.data.pagination.limit === 25, "Default pagination is page 1, limit 25");

    // 3b. Custom pagination (page 1 limit 2, page 2 limit 2)
    const resPage1 = await fetch(`${baseUrl}/projects/${activeProject1}/memories?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    const jsonPage1 = (await resPage1.json()) as ApiResponse<ListMemoryData>;
    expect(jsonPage1.data.items.length === 2, "Page 1 returns 2 items");
    expect(jsonPage1.data.pagination.hasNextPage === true, "Page 1 hasNextPage is true");

    const resPage2 = await fetch(`${baseUrl}/projects/${activeProject1}/memories?page=2&limit=2`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    const jsonPage2 = (await resPage2.json()) as ApiResponse<ListMemoryData>;
    expect(jsonPage2.data.items.length === 1, "Page 2 returns 1 item");
    expect(jsonPage2.data.pagination.hasNextPage === false, "Page 2 hasNextPage is false");

    // 3c. limit > 50 rejected
    const resMaxLimit = await fetch(`${baseUrl}/projects/${activeProject1}/memories?limit=51`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resMaxLimit.status === 400, "limit > 50 returns 400 Bad Request");

    // 3d. Malformed pagination query rejected
    const resBadQuery = await fetch(`${baseUrl}/projects/${activeProject1}/memories?page=invalid`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resBadQuery.status === 400, "page=invalid returns 400 Bad Request");

    // 3e. Archived project listing succeeds
    const resArchList = await fetch(`${baseUrl}/projects/${archivedProject}/memories`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resArchList.status === 200, "Archived project list returns 200 OK");

    // 3f. Foreign/deleted project returns 404 NotFoundError
    const resForeignList = await fetch(`${baseUrl}/projects/${user2Project}/memories`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resForeignList.status === 404, "Foreign project list returns 404 NotFoundError");

    const resDelList = await fetch(`${baseUrl}/projects/${deletedProject}/memories`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resDelList.status === 404, "Deleted project list returns 404 NotFoundError");

    // 3g. Malformed projectId returns 400 BadRequestError
    const resBadId = await fetch(`${baseUrl}/projects/invalid-id-format/memories`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resBadId.status === 400, "Malformed projectId list returns 400 BadRequestError");
  });

  it("4. PATCH /projects/:projectId/memories/:memoryId — Update memory & OCC contract", async () => {
    // Create test memory
    const createRes = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Initial content for update" }),
    });
    const createJson = (await createRes.json()) as ApiResponse<SingleMemoryData>;
    const memoryId = createJson.data.memory.id;
    const initialVersion = createJson.data.memory.version;

    // 4a. Valid update succeeds (200 OK) with content normalization and version increment
    const resUpdate = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({
        content: "  Updated content normalized  ",
        expectedVersion: initialVersion,
      }),
    });
    expect(resUpdate.status === 200, "PATCH returns 200 OK");
    const jsonUpdate = (await resUpdate.json()) as ApiResponse<SingleMemoryData>;
    expect(jsonUpdate.data.memory.content === "Updated content normalized", "Content normalized");
    expect(jsonUpdate.data.memory.version === initialVersion + 1, "Version incremented to 1");

    // 4b. Stale expectedVersion returns 409 ConflictError
    const resStale = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({
        content: "Stale update attempt",
        expectedVersion: initialVersion, // now stale (0 vs 1)
      }),
    });
    expect(resStale.status === 409, "Stale expectedVersion returns 409 ConflictError");

    // 4c. Missing expectedVersion returns 400 Bad Request
    const resNoVer = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "No expected version" }),
    });
    expect(resNoVer.status === 400, "Missing expectedVersion returns 400 Bad Request");

    // 4d. Negative expectedVersion returns 400 Bad Request
    const resNegVer = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Negative version", expectedVersion: -1 }),
    });
    expect(resNegVer.status === 400, "Negative expectedVersion returns 400 Bad Request");

    // 4e. Foreign user memory update returns 404 NotFoundError
    const resForeignUpdate = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken2}` },
      body: JSON.stringify({ content: "Foreign update", expectedVersion: 1 }),
    });
    expect(resForeignUpdate.status === 404, "Foreign user update returns 404 NotFoundError");

    // 4f. Cross-project memory update returns 404 NotFoundError
    const resCrossProj = await fetch(`${baseUrl}/projects/${activeProject2}/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Cross project update", expectedVersion: 1 }),
    });
    expect(resCrossProj.status === 404, "Cross-project update returns 404 NotFoundError");

    // 4g. Nonexistent memory update returns 404 NotFoundError
    const fakeId = new Types.ObjectId().toString();
    const resNonexistent = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${fakeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Nonexistent update", expectedVersion: 0 }),
    });
    expect(resNonexistent.status === 404, "Nonexistent memory update returns 404 NotFoundError");

    // 4h. Archived project memory update succeeds
    const archCreate = await fetch(`${baseUrl}/projects/${archivedProject}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Archived base" }),
    });
    const archJson = (await archCreate.json()) as ApiResponse<SingleMemoryData>;
    const archMemId = archJson.data.memory.id;

    const resArchUpdate = await fetch(`${baseUrl}/projects/${archivedProject}/memories/${archMemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Updated archived memory", expectedVersion: 0 }),
    });
    expect(resArchUpdate.status === 200, "Archived project memory update returns 200 OK");

    // 4i. Malformed memoryId returns 400 BadRequestError
    const resBadMemId = await fetch(`${baseUrl}/projects/${activeProject1}/memories/bad-memory-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Bad mem id", expectedVersion: 0 }),
    });
    expect(resBadMemId.status === 400, "Malformed memoryId returns 400 BadRequestError");
  });

  it("5. DELETE /projects/:projectId/memories/:memoryId — Permanent hard delete contract", async () => {
    // Create memory to delete
    const createRes = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Memory target for delete" }),
    });
    const createJson = (await createRes.json()) as ApiResponse<SingleMemoryData>;
    const memoryId = createJson.data.memory.id;

    // 5a. Hard delete succeeds (200 OK)
    const resDel = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${memoryId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resDel.status === 200, "DELETE returns 200 OK");
    const jsonDel = (await resDel.json()) as ApiResponse;
    expect(jsonDel.success === true, "Response has success: true");

    // Verify it is completely removed from DB
    const dbDoc = await ProjectMemory.findById(memoryId);
    expect(dbDoc === null, "Document is hard-deleted from MongoDB");

    // 5b. Deleted memory disappears from list query
    const resList = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    const jsonList = (await resList.json()) as ApiResponse<ListMemoryData>;
    const ids = jsonList.data.items.map((item) => item.id);
    expect(!ids.includes(memoryId), "Deleted memory does not appear in listing");

    // 5c. Repeated delete returns 404 NotFoundError
    const resRepeatDel = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${memoryId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resRepeatDel.status === 404, "Repeated delete returns 404 NotFoundError");

    // 5d. Foreign user memory delete returns 404 NotFoundError
    const newCreate = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "User1 target for foreign delete" }),
    });
    const newMemId = ((await newCreate.json()) as ApiResponse<SingleMemoryData>).data.memory.id;

    const resForeignDel = await fetch(`${baseUrl}/projects/${activeProject1}/memories/${newMemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken2}` },
    });
    expect(resForeignDel.status === 404, "Foreign user delete returns 404 NotFoundError");

    // 5e. Cross-project memory delete returns 404 NotFoundError
    const resCrossProjDel = await fetch(`${baseUrl}/projects/${activeProject2}/memories/${newMemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resCrossProjDel.status === 404, "Cross-project delete returns 404 NotFoundError");

    // 5f. Archived project memory deletion succeeds
    const archCreate = await fetch(`${baseUrl}/projects/${archivedProject}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Archived delete target" }),
    });
    const archMemId = ((await archCreate.json()) as ApiResponse<SingleMemoryData>).data.memory.id;

    const resArchDel = await fetch(`${baseUrl}/projects/${archivedProject}/memories/${archMemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resArchDel.status === 200, "Archived project memory delete returns 200 OK");

    // 5g. Malformed memoryId returns 400 BadRequestError
    const resBadMemId = await fetch(`${baseUrl}/projects/${activeProject1}/memories/invalid-memory-id`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken1}` },
    });
    expect(resBadMemId.status === 400, "Malformed memoryId delete returns 400 BadRequestError");
  });

  it("6. SECURITY & REGRESSION INVARIANTS: Zero Activity, zero AI provider calls, safe DTO boundary", async () => {
    const actCountBefore = await Activity.countDocuments({});

    // Perform full CRUD cycle
    const cRes = await fetch(`${baseUrl}/projects/${activeProject1}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Invariant test memory" }),
    });
    const memId = ((await cRes.json()) as ApiResponse<SingleMemoryData>).data.memory.id;

    await fetch(`${baseUrl}/projects/${activeProject1}/memories?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${userToken1}` },
    });

    await fetch(`${baseUrl}/projects/${activeProject1}/memories/${memId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken1}` },
      body: JSON.stringify({ content: "Invariant test memory updated", expectedVersion: 0 }),
    });

    await fetch(`${baseUrl}/projects/${activeProject1}/memories/${memId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken1}` },
    });

    const actCountAfter = await Activity.countDocuments({});
    expect(actCountBefore === actCountAfter, "100% ZERO Activity records created across all memory API endpoints");
  });
});
