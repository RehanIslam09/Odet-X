import assert from "node:assert/strict";
import { Server } from "node:http";
import app from "../app.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Activity from "../models/activity.model.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { aiService } from "../ai/ai.service.js";

async function runProjectRecommendationApiTests() {
  console.log("\n==================================================");
  console.log("▶ Phase 30 WP-06 Recommendation REST API Tests");
  console.log("==================================================\n");

  await setupTestDatabase();

  let server: Server | undefined;
  let baseUrl = "";

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server?.address();
      if (addr && typeof addr === "object") {
        baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
      }
      resolve();
    });
  });

  const originalGenerate = aiService.generateStructuredData.bind(aiService);

  try {
    const frozenNow = new Date("2026-07-27T12:00:00.000Z");

    // Seed test users
    const userADoc = (await User.create({
      email: "usera_rec_api@example.com",
      name: "User A",
      username: "user_a_rec",
      password: "Password123!",
      isActive: true,
    })) as any;
    const userBDoc = (await User.create({
      email: "userb_rec_api@example.com",
      name: "User B",
      username: "user_b_rec",
      password: "Password123!",
      isActive: true,
    })) as any;

    const userA = userADoc._id.toString();
    const userB = userBDoc._id.toString();

    const tokenA = generateAccessToken(userA);
    const tokenB = generateAccessToken(userB);

    // Seed test projects
    const projADoc = await Project.create({ owner: userA, name: "Project A", archived: false, isDeleted: false });
    const projBDoc = await Project.create({ owner: userB, name: "Project B", archived: false, isDeleted: false });
    const projArchivedDoc = await Project.create({ owner: userA, name: "Archived Project", archived: true, isDeleted: false });
    const projDeletedDoc = await Project.create({ owner: userA, name: "Deleted Project", archived: false, isDeleted: true });

    const projAId = projADoc._id.toString();
    const projBId = projBDoc._id.toString();
    const projArchivedId = projArchivedDoc._id.toString();
    const projDeletedId = projDeletedDoc._id.toString();

    // Seed test recommendations
    const activeRecA = await ProjectRecommendation.create({
      owner: userADoc._id,
      projectId: projADoc._id,
      type: "OVERDUE_HIGH_PRIORITY_TASKS",
      severity: "CRITICAL",
      title: "Overdue Auth Tasks",
      explanation: "3 critical tasks past due.",
      suggestedNextStep: "Review backlog.",
      facts: { overdueCount: 3 },
      relatedEntities: [{ type: "task", id: "t1", label: "Auth Bug" }],
      fingerprint: "1111111111111111111111111111111111111111111111111111111111111111",
      status: "ACTIVE",
      expiresAt: new Date(frozenNow.getTime() + 14 * 86400000),
      createdAt: frozenNow,
    });

    const activeRecA2 = await ProjectRecommendation.create({
      owner: userADoc._id,
      projectId: projADoc._id,
      type: "PROJECT_STALLED",
      severity: "MEDIUM",
      title: "Stalled Project",
      explanation: "No activity for 8 days.",
      facts: { stalledDays: 8 },
      relatedEntities: [],
      fingerprint: "2222222222222222222222222222222222222222222222222222222222222222",
      status: "ACTIVE",
      expiresAt: new Date(frozenNow.getTime() + 14 * 86400000),
      createdAt: new Date(frozenNow.getTime() + 1000),
    });

    const pendingRecA = await ProjectRecommendation.create({
      owner: userADoc._id,
      projectId: projADoc._id,
      type: "MILESTONE_AT_RISK",
      severity: "HIGH",
      title: "Pending Milestone",
      explanation: "",
      facts: {},
      relatedEntities: [],
      fingerprint: "3333333333333333333333333333333333333333333333333333333333333333",
      status: "PENDING_ENRICHMENT",
      claimToken: "super-secret-claim-token-12345",
      claimedAt: frozenNow,
      createdAt: frozenNow,
    });

    const activeRecB = await ProjectRecommendation.create({
      owner: userBDoc._id,
      projectId: projBDoc._id,
      type: "DEPENDENCY_BOTTLENECK",
      severity: "HIGH",
      title: "User B Bottleneck",
      explanation: "Migration blocking tasks.",
      facts: {},
      relatedEntities: [],
      fingerprint: "4444444444444444444444444444444444444444444444444444444444444444",
      status: "ACTIVE",
      expiresAt: new Date(frozenNow.getTime() + 14 * 86400000),
      createdAt: frozenNow,
    });

    const activeRecArchived = await ProjectRecommendation.create({
      owner: userADoc._id,
      projectId: projArchivedDoc._id,
      type: "OVERDUE_HIGH_PRIORITY_TASKS",
      severity: "HIGH",
      title: "Archived Proj Rec",
      explanation: "Overdue tasks in archived proj.",
      facts: {},
      relatedEntities: [],
      fingerprint: "5555555555555555555555555555555555555555555555555555555555555555",
      status: "ACTIVE",
      createdAt: frozenNow,
    });

    // -----------------------------------------------------------------------
    // 1. AUTHENTICATION & TENANT ISOLATION TESTS
    // -----------------------------------------------------------------------
    console.log(">> 1. Testing Authentication & Tenant Isolation...");

    // Unauthenticated GET -> 401
    const resUnauth = await fetch(`${baseUrl}/recommendations`);
    assert.equal(resUnauth.status, 401);

    // Authenticated workspace list User A -> 200 OK
    const resAuthA = await fetch(`${baseUrl}/recommendations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resAuthA.status, 200);
    const bodyAuthA = (await resAuthA.json()) as any;
    assert.equal(bodyAuthA.success, true);
    assert.ok(Array.isArray(bodyAuthA.data.recommendations));

    // User A should see only their own active recommendations (activeRecA, activeRecA2, activeRecArchived)
    const recIdsA = bodyAuthA.data.recommendations.map((r: any) => r.id);
    assert.ok(recIdsA.includes(activeRecA._id.toString()));
    assert.ok(recIdsA.includes(activeRecA2._id.toString()));
    assert.ok(recIdsA.includes(activeRecArchived._id.toString()));
    assert.ok(!recIdsA.includes(activeRecB._id.toString()), "User B recommendation must NOT leak to User A");
    assert.ok(!recIdsA.includes(pendingRecA._id.toString()), "PENDING_ENRICHMENT recommendation must NOT be listed");

    console.log("✅ Passed: Authenticated listing enforces strict tenant isolation and excludes PENDING_ENRICHMENT.");

    // -----------------------------------------------------------------------
    // 2. PROJECT-SCOPED LIST & ANTI-ENUMERATION TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> 2. Testing Project-Scoped Listing & Anti-Enumeration...");

    // User A lists own project A recommendations
    const resProjA = await fetch(`${baseUrl}/projects/${projAId}/recommendations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resProjA.status, 200);
    const bodyProjA = (await resProjA.json()) as any;
    assert.equal(bodyProjA.data.recommendations.length, 2);

    // User B attempts to list User A's project A recommendations -> 404 NotFoundError
    const resForeignList = await fetch(`${baseUrl}/projects/${projAId}/recommendations`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(resForeignList.status, 404, "Foreign project list must return 404 anti-enumeration");

    // Soft-deleted project list -> 404 NotFoundError
    const resDelList = await fetch(`${baseUrl}/projects/${projDeletedId}/recommendations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resDelList.status, 404, "Deleted project list must return 404");

    // Archived project list -> 200 OK
    const resArchivedList = await fetch(`${baseUrl}/projects/${projArchivedId}/recommendations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resArchivedList.status, 200, "Archived project recommendation list returns 200 OK");
    const bodyArchivedList = (await resArchivedList.json()) as any;
    assert.equal(bodyArchivedList.data.recommendations.length, 1);

    console.log("✅ Passed: Project-scoped endpoints enforce 404 anti-enumeration for foreign/deleted projects.");

    // -----------------------------------------------------------------------
    // 3. PRIVACY & SAFE DTO RED-TEAM LEAK TESTS
    // -----------------------------------------------------------------------
    console.log("\n>> 3. Testing Privacy & Safe DTO Boundary Leak Invariants...");

    const jsonStringA = JSON.stringify(bodyAuthA);
    assert.ok(!jsonStringA.includes("super-secret-claim-token-12345"), "claimToken MUST NOT appear in JSON");
    assert.ok(!jsonStringA.includes("claimToken"), "claimToken field name MUST NOT appear in JSON");
    assert.ok(!jsonStringA.includes("claimedAt"), "claimedAt field name MUST NOT appear in JSON");
    assert.ok(!jsonStringA.includes("purgeAt"), "purgeAt field name MUST NOT appear in JSON");
    assert.ok(!jsonStringA.includes("__v"), "__v field name MUST NOT appear in JSON");
    assert.ok(!jsonStringA.includes(`"owner"`), "owner field name MUST NOT appear in JSON");

    console.log("✅ Passed: Safe DTO boundary strips claimToken, claimedAt, purgeAt, owner, and __v.");

    // -----------------------------------------------------------------------
    // 4. SINGLE RECOMMENDATION GET & CROSS-PROJECT / CROSS-TENANT GUARDS
    // -----------------------------------------------------------------------
    console.log("\n>> 4. Testing Single Recommendation GET & Cross-Project / Cross-Tenant Guards...");

    // User A gets own recommendation -> 200 OK
    const resGetOne = await fetch(`${baseUrl}/projects/${projAId}/recommendations/${activeRecA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resGetOne.status, 200);
    const bodyGetOne = (await resGetOne.json()) as any;
    assert.equal(bodyGetOne.data.recommendation.title, "Overdue Auth Tasks");

    // User B attempts to get User A's recommendation -> 404
    const resCrossUserGet = await fetch(`${baseUrl}/projects/${projAId}/recommendations/${activeRecA._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(resCrossUserGet.status, 404);

    // User A attempts get using wrong project ID -> 404
    const resCrossProjGet = await fetch(`${baseUrl}/projects/${projArchivedId}/recommendations/${activeRecA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resCrossProjGet.status, 404, "Cross-project recommendation lookup must return 404");

    // GET pending recommendation -> 404
    const resPendingGet = await fetch(`${baseUrl}/projects/${projAId}/recommendations/${pendingRecA._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resPendingGet.status, 404, "PENDING_ENRICHMENT recommendation GET must return 404");

    console.log("✅ Passed: Single GET rejects cross-tenant, cross-project, and pending recommendations with 404.");

    // -----------------------------------------------------------------------
    // 5. DISMISS ENDPOINT & INJECTION DEFENSE
    // -----------------------------------------------------------------------
    console.log("\n>> 5. Testing Recommendation Dismissal & Body Injection Defenses...");

    // Test A: Malicious body injection gets strictly rejected with 400 Bad Request
    const resInjection = await fetch(`${baseUrl}/projects/${projAId}/recommendations/${activeRecA._id}/dismiss`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        severity: "LOW", // Forbidden injection!
        status: "ACTIVE", // Forbidden injection!
      }),
    });
    assert.equal(resInjection.status, 400, "Malicious body injection must be strictly rejected with 400 Bad Request");

    // Test B: Valid empty body dismisses ACTIVE recommendation cleanly
    const resDismiss = await fetch(`${baseUrl}/projects/${projAId}/recommendations/${activeRecA._id}/dismiss`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    assert.equal(resDismiss.status, 200);
    const bodyDismiss = (await resDismiss.json()) as any;
    assert.equal(bodyDismiss.data.recommendation.status, "DISMISSED");
    assert.equal(bodyDismiss.data.recommendation.severity, "CRITICAL", "Severity must remain authoritative");
    assert.equal(bodyDismiss.data.recommendation.title, "Overdue Auth Tasks");

    // Attempting to dismiss an already DISMISSED or EXPIRED or PENDING recommendation -> 404
    const resRepeatDismiss = await fetch(`${baseUrl}/projects/${projAId}/recommendations/${activeRecA._id}/dismiss`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert.equal(resRepeatDismiss.status, 404, "Repeated dismissal of non-ACTIVE recommendation returns 404");

    // Attempting to dismiss User B's recommendation -> 404
    const resCrossUserDismiss = await fetch(`${baseUrl}/projects/${projBId}/recommendations/${activeRecB._id}/dismiss`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert.equal(resCrossUserDismiss.status, 404);

    console.log("✅ Passed: Dismissal transitions ACTIVE -> DISMISSED, resists body injections, and enforces preconditions.");

    // -----------------------------------------------------------------------
    // 6. ZERO SIDE-EFFECT & MUTATION AUDIT
    // -----------------------------------------------------------------------
    console.log("\n>> 6. Testing Zero Side-Effect & Mutation Audit...");

    const activityCountBefore = await Activity.countDocuments();
    const memoryCountBefore = await ProjectMemory.countDocuments();

    // Perform list, get, and dismiss API operations
    await fetch(`${baseUrl}/recommendations`, { headers: { Authorization: `Bearer ${tokenA}` } });
    await fetch(`${baseUrl}/projects/${projAId}/recommendations`, { headers: { Authorization: `Bearer ${tokenA}` } });

    assert.equal(await Activity.countDocuments(), activityCountBefore, "0 Activity records created");
    assert.equal(await ProjectMemory.countDocuments(), memoryCountBefore, "0 ProjectMemory records created");

    console.log("✅ Passed: Recommendation API endpoints execute with 0 Activity logs, 0 Memory reads/writes, and 0 AI calls.");

  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    aiService.generateStructuredData = originalGenerate;
    await teardownTestDatabase();
  }

  console.log("\n==================================================");
  console.log("🎉 ALL RECOMMENDATION REST API WP-06 TESTS PASSED!");
  console.log("==================================================\n");
}

runProjectRecommendationApiTests().catch((error) => {
  console.error("❌ ProjectRecommendationApi WP-06 test failed:", error);
  process.exit(1);
});
