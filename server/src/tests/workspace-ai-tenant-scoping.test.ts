import dotenv from "dotenv";

dotenv.config();

import User from "../models/user.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";
import { provisionPersonalWorkspace } from "../services/workspace.service.js";
import { createProject } from "../services/project.service.js";
import { createProjectMemory, getProjectMemoriesForCopilot } from "../services/project-memory.service.js";
import { acquireRecommendationClaim, dismissRecommendation } from "../services/project-recommendation.service.js";
import { searchGlobalEntities } from "../services/global-search.service.js";
import { buildCopilotContext } from "../domain/copilot-context-builder.js";
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

  try {
    await ProjectMemory.syncIndexes();
    await ProjectRecommendation.syncIndexes();

    console.log("\n==================================================");
    console.log("▶ Phase 32 WP-04 — AI Subsystem Workspace Scoping Tests");
    console.log("==================================================\n");

    // =========================================================================
    // Setup Test Fixtures: User A & User B
    // =========================================================================
    const userA = await User.create({
      name: "Alice AI Tenant",
      email: "alice.ai@test.com",
      username: "alice_ai",
      password: "Password123!",
    });

    const userB = await User.create({
      name: "Bob AI Tenant",
      email: "bob.ai@test.com",
      username: "bob_ai",
      password: "Password123!",
    });

    const provA = await provisionPersonalWorkspace(userA);
    const provB = await provisionPersonalWorkspace(userB);

    const wsAId = provA.workspace._id;
    const _wsBId = provB.workspace._id;

    const projA = await createProject(userA._id.toString(), { name: "Apollo Engine", description: "", emoji: "📁", color: "#6366f1" });
    const projB = await createProject(userB._id.toString(), { name: "Zeus Engine", description: "", emoji: "📁", color: "#6366f1" });

    // =========================================================================
    // 1. ProjectMemory Workspace Inheritance
    // =========================================================================
    console.log(">> 1. ProjectMemory Workspace Inheritance...");

    const memA = await createProjectMemory(userA._id.toString(), projA._id.toString(), {
      content: "PostgreSQL database configuration for Apollo Engine",
    });

    expect(memA.id !== undefined, "Memory A created successfully");

    const dbMemA = await ProjectMemory.findById(memA.id);
    if (!dbMemA || !dbMemA.workspaceId) {
      throw new Error("Memory A not found or missing workspaceId");
    }
    const memAWorkspaceIdStr = dbMemA.workspaceId.toString();
    expect(memAWorkspaceIdStr === wsAId.toString(), "1. ProjectMemory workspaceId matches parent Project workspace");

    // =========================================================================
    // 2. ProjectRecommendation Workspace Inheritance
    // =========================================================================
    console.log("\n>> 2. ProjectRecommendation Workspace Inheritance...");

    const claimRes = await acquireRecommendationClaim({
      projectId: projA._id.toString(),
      ownerId: userA._id.toString(),
      type: "OVERDUE_HIGH_PRIORITY_TASKS",
      severity: "HIGH",
      facts: { overdueCount: 2 },
      relatedEntities: [],
      fingerprint: "sha256-fingerprint-apollo-123",
      detectedAt: new Date(),
    });

    expect(claimRes.outcome === "CLAIMED", "Recommendation claim acquired");
    const recADoc = await ProjectRecommendation.findById(claimRes.recommendationId);
    if (!recADoc || !recADoc.workspaceId) {
      throw new Error("recADoc document is null or missing workspaceId");
    }

    const recAIdString = recADoc._id.toString();
    const recAWorkspaceIdStr = recADoc.workspaceId.toString();

    expect(recAWorkspaceIdStr === wsAId.toString(), "2. ProjectRecommendation workspaceId matches parent Project workspace");

    // =========================================================================
    // 3. Copilot Context Builder Tenant Scoping
    // =========================================================================
    console.log("\n>> 3. Copilot Context Builder Tenant Isolation...");

    const copilotMemories = await getProjectMemoriesForCopilot(userA._id.toString(), projA._id.toString());
    expect(copilotMemories.memories.length === 1, "User A retrieves Memory A for Copilot");
    const firstCopilotMem = copilotMemories.memories[0];
    expect(Boolean(firstCopilotMem && firstCopilotMem.content.includes("PostgreSQL")), "Memory content verified");

    const copilotContextA = await buildCopilotContext({
      projectId: projA._id.toString(),
      userId: userA._id.toString(),
    });
    expect(copilotContextA.context.project.name === "Apollo Engine", "Copilot context built for Apollo Engine");

    const memList = (copilotContextA.context as { memories?: unknown[] }).memories || [];
    expect(memList.length === 1, "3. Copilot context includes User A's memory");

    // Adversarial: User A attempting Copilot context for User B's project
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
    expect(copilotCrossBlocked, "4. User A prevented from building Copilot context for User B's project");

    // =========================================================================
    // 4. Global Search Multi-Workspace Isolation
    // =========================================================================
    console.log("\n>> 4. Global Search Multi-Workspace Isolation...");

    // Create matching text in Project B / Memory B
    await createProjectMemory(userB._id.toString(), projB._id.toString(), {
      content: "PostgreSQL database configuration for Zeus Engine",
    });

    const searchResWorkspaceA = await searchGlobalEntities({
      ownerId: userA._id.toString(),
      query: "PostgreSQL",
      workspaceId: wsAId.toString(),
    });

    expect(searchResWorkspaceA.items.length === 1, "Global Search returns 1 result for User A in Workspace A");
    const firstSearchItem = searchResWorkspaceA.items[0];
    expect(Boolean(firstSearchItem && firstSearchItem.projectName === "Apollo Engine"), "5. Global Search returns ONLY Workspace A results");

    // =========================================================================
    // 5. Cross-Workspace Recommendation Mutation Block
    // =========================================================================
    console.log("\n>> 5. Cross-Workspace Recommendation Mutation Block...");

    const dismissRes = await dismissRecommendation(recAIdString, userB._id.toString());
    expect(dismissRes === null, "6. User B prevented from dismissing User A's recommendation");

    console.log("\n==================================================");
    console.log("🎉 ALL WP-04 AI TENANT SCOPING TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================\n");

    await teardownTestDatabase();
    process.exit(0);
  } catch (err) {
    console.error("❌ WP-04 AI Tenant Scoping Test Failed:", err);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
