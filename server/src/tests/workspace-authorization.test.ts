import dotenv from "dotenv";
import http from "node:http";

dotenv.config();
process.env.NODE_ENV = "test";

import app from "../app.js";
import User from "../models/user.model.js";
import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspace-member.model.js";
import { provisionPersonalWorkspace, createCustomWorkspace } from "../services/workspace.service.js";
import { createProject } from "../services/project.service.js";
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
    console.log("▶ Phase 32 WP-05 — Workspace Authorization & REST API Tests");
    console.log("==================================================\n");

    // Setup Test Fixtures
    const userOwner = await User.create({
      name: "Alice Owner",
      email: "alice.owner@test.com",
      username: "alice_owner",
      password: "Password123!",
    });

    const userMember = await User.create({
      name: "Bob Member",
      email: "bob.member@test.com",
      username: "bob_member",
      password: "Password123!",
    });

    const userOutsider = await User.create({
      name: "Charlie Outsider",
      email: "charlie.out@test.com",
      username: "charlie_out",
      password: "Password123!",
    });

    const tokenOwner = generateAccessToken(userOwner._id.toString());
    const tokenMember = generateAccessToken(userMember._id.toString());
    const tokenOutsider = generateAccessToken(userOutsider._id.toString());

    await provisionPersonalWorkspace(userOwner);
    await provisionPersonalWorkspace(userMember);
    await provisionPersonalWorkspace(userOutsider);

    const customWs = await createCustomWorkspace(userOwner._id.toString(), {
      name: "Acme Product Team",
      slug: "acme-product-team",
    });

    await WorkspaceMember.create({
      workspaceId: customWs.id,
      userId: userMember._id,
      role: "MEMBER",
    });

    // 1. GET /api/v1/workspaces (List Workspaces)
    console.log(">> 1. GET /api/v1/workspaces (List Workspaces)...");

    const resOwnerList = await fetch(`${baseUrl}/workspaces`, {
      headers: { Authorization: `Bearer ${tokenOwner}` },
    });
    const jsonOwnerList = (await resOwnerList.json()) as any;
    expect(resOwnerList.status === 200, "1. Owner listing returns 200 OK");
    expect(jsonOwnerList.data.length === 2, "2. Owner lists 2 workspaces (personal + custom)");

    const resMemberList = await fetch(`${baseUrl}/workspaces`, {
      headers: { Authorization: `Bearer ${tokenMember}` },
    });
    const jsonMemberList = (await resMemberList.json()) as any;
    expect(resMemberList.status === 200, "3. Member listing returns 200 OK");
    expect(jsonMemberList.data.length === 2, "4. Member lists 2 workspaces");
    const memberCustomItem = jsonMemberList.data.find((w: any) => w.id === customWs.id);
    expect(Boolean(memberCustomItem && memberCustomItem.role === "MEMBER"), "5. Member role correctly reported as MEMBER");

    // 2. POST /api/v1/workspaces (Create Custom Workspace)
    console.log("\n>> 2. POST /api/v1/workspaces (Create Custom Workspace)...");

    const resCreate = await fetch(`${baseUrl}/workspaces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenOwner}`,
      },
      body: JSON.stringify({
        name: "Delta Robotics",
        slug: "delta-robotics",
      }),
    });
    const jsonCreate = (await resCreate.json()) as any;
    expect(resCreate.status === 201, "6. Custom workspace created with 201 Created");
    expect(jsonCreate.data.isPersonal === false, "7. Custom workspace isPersonal is false");
    expect(jsonCreate.data.role === "OWNER", "8. Creator role assigned as OWNER");

    // Test slug collision handling
    const resCreateCol = await fetch(`${baseUrl}/workspaces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMember}`,
      },
      body: JSON.stringify({
        name: "Delta Robotics",
        slug: "delta-robotics",
      }),
    });
    const jsonCreateCol = (await resCreateCol.json()) as any;
    expect(resCreateCol.status === 201, "9. Duplicate slug creates workspace with alternate slug");
    expect(Boolean(jsonCreateCol.data.slug.startsWith("delta-robotics-")), "10. Alternate unique slug generated");

    // 3. GET /api/v1/workspaces/:workspaceId (Get Workspace & Authorization)
    console.log("\n>> 3. GET /api/v1/workspaces/:workspaceId...");

    const resGetOwner = await fetch(`${baseUrl}/workspaces/${customWs.id}`, {
      headers: { Authorization: `Bearer ${tokenOwner}` },
    });
    const jsonGetOwner = (await resGetOwner.json()) as any;
    expect(resGetOwner.status === 200, "11. OWNER can access workspace details");
    expect(jsonGetOwner.data.members.length === 2, "12. Active members list returned");

    const resGetMember = await fetch(`${baseUrl}/workspaces/${customWs.id}`, {
      headers: { Authorization: `Bearer ${tokenMember}` },
    });
    expect(resGetMember.status === 200, "13. MEMBER can access workspace details");

    // Anti-enumeration: Outsider receives 404
    const resGetOutsider = await fetch(`${baseUrl}/workspaces/${customWs.id}`, {
      headers: { Authorization: `Bearer ${tokenOutsider}` },
    });
    const jsonGetOutsider = (await resGetOutsider.json()) as any;
    expect(resGetOutsider.status === 404, "14. Outsider receives 404 Not Found (anti-enumeration)");
    expect(jsonGetOutsider.message === "Workspace not found.", "15. Generic 'Workspace not found.' message returned");

    // 4. PATCH /api/v1/workspaces/:workspaceId (Update Workspace)
    console.log("\n>> 4. PATCH /api/v1/workspaces/:workspaceId...");

    // MEMBER attempts update -> 403 Forbidden
    const resPatchMember = await fetch(`${baseUrl}/workspaces/${customWs.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenMember}`,
      },
      body: JSON.stringify({ name: "Hacked Acme Team" }),
    });
    const jsonPatchMember = (await resPatchMember.json()) as any;
    expect(resPatchMember.status === 403, "16. MEMBER blocked from updating workspace (403 Forbidden)");
    expect(jsonPatchMember.message === "Workspace owner permission required.", "17. Owner permission message returned");

    // OWNER updates name -> 200 OK
    const resPatchOwner = await fetch(`${baseUrl}/workspaces/${customWs.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenOwner}`,
      },
      body: JSON.stringify({ name: "Acme Global Engineering" }),
    });
    const jsonPatchOwner = (await resPatchOwner.json()) as any;
    expect(resPatchOwner.status === 200, "18. OWNER can update workspace name");
    expect(jsonPatchOwner.data.name === "Acme Global Engineering", "19. Name updated successfully");

    // 5. DELETE /api/v1/workspaces/:workspaceId (Delete Custom Workspace)
    console.log("\n>> 5. DELETE /api/v1/workspaces/:workspaceId...");

    const ownerPersonal = await Workspace.findOne({ ownerId: userOwner._id, isPersonal: true });
    const resDelPersonal = await fetch(`${baseUrl}/workspaces/${ownerPersonal!._id.toString()}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenOwner}` },
    });
    expect(resDelPersonal.status === 403, "20. Personal workspace deletion blocked (403 Forbidden)");

    const projInWs = await createProject(userOwner._id.toString(), { name: "Project in Custom WS" }, customWs.id);

    const resDelNonEmpty = await fetch(`${baseUrl}/workspaces/${customWs.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenOwner}` },
    });
    expect(resDelNonEmpty.status === 409, "21. Workspace deletion blocked when containing active projects (409 Conflict)");

    projInWs.isDeleted = true;
    await projInWs.save();

    const resDelEmpty = await fetch(`${baseUrl}/workspaces/${customWs.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenOwner}` },
    });
    expect(resDelEmpty.status === 200, "22. Empty custom workspace deleted successfully (200 OK)");

    const deletedWs = await Workspace.findById(customWs.id);
    expect(deletedWs === null, "23. Workspace document deleted from database");

    const deletedMembers = await WorkspaceMember.find({ workspaceId: customWs.id });
    expect(deletedMembers.length === 0, "24. Associated WorkspaceMember documents cleaned up");

    // 6. Member Removal & Self-Leave Constraints
    console.log("\n>> 6. Member Removal & Self-Leave Constraints...");

    const tempWs = await createCustomWorkspace(userOwner._id.toString(), { name: "Temp Workspace" });

    const resLeaveSoleOwner = await fetch(`${baseUrl}/workspaces/${tempWs.id}/members/${userOwner._id.toString()}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenOwner}` },
    });
    expect(resLeaveSoleOwner.status === 403, "25. Sole OWNER self-leave blocked (403 Forbidden)");

    console.log("\n==================================================");
    console.log("🎉 ALL WP-05 WORKSPACE AUTHORIZATION TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================\n");

    if (server) {
      await new Promise<void>((res) => (server as http.Server).close(() => res()));
    }
    await teardownTestDatabase();
    process.exit(0);
  } catch (err) {
    console.error("❌ WP-05 Workspace Authorization Test Failed:", err);
    if (server) {
      await new Promise<void>((res) => (server as http.Server).close(() => res()));
    }
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
