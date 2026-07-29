import dotenv from "dotenv";
import http from "node:http";

dotenv.config();
process.env.NODE_ENV = "test";

import app from "../app.js";
import User from "../models/user.model.js";
import Workspace from "../models/workspace.model.js";
import Project from "../models/project.model.js";

import { provisionPersonalWorkspace } from "../services/workspace.service.js";
import { createProject, updateProject, deleteProject } from "../services/project.service.js";
import { createTask, updateTask } from "../services/task.service.js";
import { createProjectMemory, getProjectMemoriesForCopilot } from "../services/project-memory.service.js";
import { acquireRecommendationClaim, dismissRecommendation } from "../services/project-recommendation.service.js";
import { buildCopilotContext } from "../domain/copilot-context-builder.js";
import { searchGlobalEntities } from "../services/global-search.service.js";
import { generateAccessToken } from "../utils/jwt.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";

function expect(value: boolean, message: string) {
  if (!value) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runTests() {
  await setupTestDatabase();

  let server: http.Server | undefined = undefined;
  let baseUrl = "";

  await new Promise<void>((resolve) => {
    const activeServer = app.listen(0, () => {
      const addr = activeServer.address();
      if (addr && typeof addr === "object") {
        baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
      }
      server = activeServer;
      resolve();
    });
  });

  try {
    console.log("\n==================================================");
    console.log("▶ Phase 32 WP-07 — Cross-Workspace Security Audit Suite");
    console.log("==================================================\n");

    // =========================================================================
    // Setup Multi-Tenant Adversarial Fixtures
    // =========================================================================
    const userA = await User.create({
      name: "Alice Tenant A",
      email: "alice.tenant.a@test.com",
      username: "alice_tenant_a",
      password: "Password123!",
    });

    const userB = await User.create({
      name: "Bob Tenant B",
      email: "bob.tenant.b@test.com",
      username: "bob_tenant_b",
      password: "Password123!",
    });

    const tokenA = generateAccessToken(userA._id.toString());
    const _tokenB = generateAccessToken(userB._id.toString());

    const provA = await provisionPersonalWorkspace(userA);
    const provB = await provisionPersonalWorkspace(userB);

    const wsAId = provA.workspace._id;
    const wsBId = provB.workspace._id;

    // Create Project A in Workspace A
    const projA = await createProject(userA._id.toString(), {
      name: "SECURITY-PROJECT-ALPHA-WORKSPACE-A",
      description: "Confidential Alpha Specs",
    });

    // Create Project B in Workspace B
    const projB = await createProject(userB._id.toString(), {
      name: "SECURITY-PROJECT-BETA-WORKSPACE-B",
      description: "Confidential Beta Specs",
    });

    // Create Task A in Workspace A
    const taskA = await createTask(userA._id.toString(), {
      projectId: projA._id.toString(),
      title: "SECURITY-TASK-A1-WORKSPACE-A",
      description: "Task A1 details",
      priority: "high",
    });

    // Create Task B in Workspace B
    const _taskB = await createTask(userB._id.toString(), {
      projectId: projB._id.toString(),
      title: "SECURITY-TASK-B1-WORKSPACE-B",
      description: "Task B1 details",
      priority: "high",
    });

    // Create ProjectMemory in Workspace A & Workspace B
    const _memA = await createProjectMemory(userA._id.toString(), projA._id.toString(), {
      content: "CONFIDENTIAL-MEMORY-ALPHA-KEY-999123",
    });

    const _memB = await createProjectMemory(userB._id.toString(), projB._id.toString(), {
      content: "CONFIDENTIAL-MEMORY-BETA-KEY-888456",
    });

    // Acquire Recommendation Claim for Project B
    const claimResB = await acquireRecommendationClaim({
      projectId: projB._id.toString(),
      ownerId: userB._id.toString(),
      type: "OVERDUE_HIGH_PRIORITY_TASKS",
      severity: "HIGH",
      facts: { overdueCount: 3 },
      relatedEntities: [],
      fingerprint: "sha256-fingerprint-beta-999",
      detectedAt: new Date(),
    });
    const recBIdStr = claimResB.recommendationId!;

    // =========================================================================
    // 1. REST API & Workspace Authorization Isolation
    // =========================================================================
    console.log(">> 1. REST API & Workspace Authorization Isolation...");

    const resGetWsB = await fetch(`${baseUrl}/workspaces/${wsBId.toString()}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(resGetWsB.status === 404, "1. User A receives 404 when querying Workspace B by ObjectId");

    const resPatchWsB = await fetch(`${baseUrl}/workspaces/${wsBId.toString()}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ name: "Hacked Workspace B Name" }),
    });
    expect(resPatchWsB.status === 404, "2. User A blocked from updating Workspace B (404 anti-enumeration)");

    const resDelWsB = await fetch(`${baseUrl}/workspaces/${wsBId.toString()}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(resDelWsB.status === 404, "3. User A blocked from deleting Workspace B");

    // =========================================================================
    // 2. Project Read & Mutation Cross-Tenant Isolation
    // =========================================================================
    console.log("\n>> 2. Project Read & Mutation Cross-Tenant Isolation...");

    let _readProjBBlocked = false;
    try {
      await Project.findOne({ _id: projB._id, owner: userA._id, isDeleted: false });
    } catch {
      _readProjBBlocked = true;
    }

    let updateProjBBlocked = false;
    try {
      await updateProject(projB._id.toString(), userA._id.toString(), {
        name: "Hacked Project B",
        description: "Hacked Description",
        emoji: "🚀",
        color: "#000000",
      });
    } catch (err: any) {
      if (err.message.includes("not found")) {
        updateProjBBlocked = true;
      }
    }
    expect(updateProjBBlocked, "4. User A prevented from updating Project B (404 anti-enumeration)");

    let deleteProjBBlocked = false;
    try {
      await deleteProject(projB._id.toString(), userA._id.toString());
    } catch (err: any) {
      if (err.message.includes("not found")) {
        deleteProjBBlocked = true;
      }
    }
    expect(deleteProjBBlocked, "5. User A prevented from deleting Project B (404 anti-enumeration)");

    // =========================================================================
    // 3. Task & Child Entity Cross-Workspace Injection Prevention
    // =========================================================================
    console.log("\n>> 3. Cross-Workspace Parent Injection Prevention...");

    let taskInjectBlocked = false;
    try {
      await createTask(userA._id.toString(), {
        projectId: projB._id.toString(), // User A attempting task in User B's project
        title: "Malicious Injection Task",
      });
    } catch (err: any) {
      if (err.message.includes("Project not found")) {
        taskInjectBlocked = true;
      }
    }
    expect(taskInjectBlocked, "6. User A prevented from creating Task in User B's Project");

    let taskMoveBlocked = false;
    try {
      await updateTask(taskA._id.toString(), userA._id.toString(), {
        projectId: projB._id.toString(), // User A attempting to move Task A to Project B
      });
    } catch (err: any) {
      if (err.message.includes("Project not found")) {
        taskMoveBlocked = true;
      }
    }
    expect(taskMoveBlocked, "7. User A prevented from moving Task A to Project B");

    // =========================================================================
    // 4. Copilot AI Context Tenant Scoping
    // =========================================================================
    console.log("\n>> 4. Copilot AI Context Tenant Scoping...");

    let copilotCrossBlocked = false;
    try {
      await buildCopilotContext({
        projectId: projB._id.toString(),
        userId: userA._id.toString(),
      });
    } catch (err: any) {
      if (err.message.includes("Project not found")) {
        copilotCrossBlocked = true;
      }
    }
    expect(copilotCrossBlocked, "8. User A prevented from generating Copilot context for Project B");

    // =========================================================================
    // 5. ProjectMemory & Recommendation Tenant Isolation
    // =========================================================================
    console.log("\n>> 5. ProjectMemory & Recommendation Tenant Isolation...");

    const copilotMemA = await getProjectMemoriesForCopilot(userA._id.toString(), projA._id.toString());
    const memAContent = copilotMemA.memories[0]?.content || "";
    expect(memAContent.includes("CONFIDENTIAL-MEMORY-ALPHA"), "9. User A retrieves Memory A");

    const copilotMemCross = await getProjectMemoriesForCopilot(userA._id.toString(), projB._id.toString());
    expect(copilotMemCross.memories.length === 0, "10. User A receives 0 memories for Project B");

    const dismissResB = await dismissRecommendation(recBIdStr, userA._id.toString());
    expect(dismissResB === null, "11. User A blocked from dismissing User B's recommendation");

    // =========================================================================
    // 6. Global Search Multi-Workspace Isolation & Memory Leakage Guard
    // =========================================================================
    console.log("\n>> 6. Global Search Multi-Workspace Isolation & Memory Leakage Guard...");

    const searchUserAInWsA = await searchGlobalEntities({
      ownerId: userA._id.toString(),
      query: "CONFIDENTIAL",
      workspaceId: wsAId.toString(),
    });

    expect(searchUserAInWsA.items.length >= 1, "12. Search returns authorized results for User A in Workspace A");
    const hasOnlyWorkspaceAItems = searchUserAInWsA.items.every(
      (item) => !item.title.includes("BETA") && !item.subtitle?.includes("888456"),
    );
    expect(hasOnlyWorkspaceAItems, "13. Results strictly match Workspace A entities");

    // User A attempting to search Workspace B by passing foreign workspaceId header/param
    const searchUserAInWsB = await searchGlobalEntities({
      ownerId: userA._id.toString(),
      query: "CONFIDENTIAL",
      workspaceId: wsBId.toString(),
    });

    expect(searchUserAInWsB.items.length === 0, "14. User A search for Workspace B returns ZERO results (owner boundary intact)");

    // =========================================================================
    // 7. Header Spoofing & Anti-Enumeration Verification
    // =========================================================================
    console.log("\n>> 7. Header Spoofing & Anti-Enumeration Verification...");

    const resHeaderSpoof = await fetch(`${baseUrl}/workspaces`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "X-Workspace-Id": wsBId.toString(),
      },
    });
    const jsonHeaderSpoof = (await resHeaderSpoof.json()) as any;
    expect(resHeaderSpoof.status === 200, "15. GET /workspaces with spoofed header succeeds without leaking Workspace B");
    expect(jsonHeaderSpoof.data.length === 1, "16. User A lists only 1 authorized personal workspace");
    expect(jsonHeaderSpoof.data[0].id === wsAId.toString(), "17. Listed workspace is strictly Workspace A");

    // =========================================================================
    // 8. Personal Workspace Invariants & Uniqueness Enforcement
    // =========================================================================
    console.log("\n>> 8. Personal Workspace Invariants & Uniqueness Enforcement...");

    let dupPersonalBlocked = false;
    try {
      const dupWorkspace = new Workspace({
        name: "Second Personal Workspace",
        slug: "second-personal-workspace",
        ownerId: userA._id,
        isPersonal: true,
      });
      await dupWorkspace.save();
    } catch (err: any) {
      if (err.code === 11000) {
        dupPersonalBlocked = true;
      }
    }
    expect(dupPersonalBlocked, "18. Partial unique index blocks duplicate personal workspace creation for same user");

    console.log("\n==================================================");
    console.log("🎉 ALL WP-07 CROSS-TENANT ISOLATION TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================\n");

    if (server) {
      await new Promise<void>((res) => (server as http.Server).close(() => res()));
    }
    await teardownTestDatabase();
    process.exit(0);
  } catch (err) {
    console.error("❌ WP-07 Cross-Tenant Isolation Test Failed:", err);
    if (server) {
      await new Promise<void>((res) => (server as http.Server).close(() => res()));
    }
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
