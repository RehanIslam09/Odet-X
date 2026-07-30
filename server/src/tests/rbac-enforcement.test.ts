import dotenv from "dotenv";
import http from "node:http";

dotenv.config();
process.env.NODE_ENV = "test";

import app from "../app.js";
import User from "../models/user.model.js";
import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspace-member.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";

function expect(condition: boolean, message: string) {
  if (!condition) {
    console.error(`? Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`? Passed: ${message}`);
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
    console.log("? Phase 33 WP-04 ? RBAC Route Enforcement & API Integration Tests");
    console.log("==================================================\n");

    // Create Test Users
    const ownerUser = await User.create({
      name: "Owner User",
      email: "owner@test.com",
      username: "owneruser",
      password: "Password123!",
    });

    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@test.com",
      username: "adminuser",
      password: "Password123!",
    });

    const member1 = await User.create({
      name: "Member One",
      email: "member1@test.com",
      username: "memberone",
      password: "Password123!",
    });

    const member2 = await User.create({
      name: "Member Two",
      email: "member2@test.com",
      username: "membertwo",
      password: "Password123!",
    });

    const viewerUser = await User.create({
      name: "Viewer User",
      email: "viewer@test.com",
      username: "vieweruser",
      password: "Password123!",
    });

    const outsiderUser = await User.create({
      name: "Outsider User",
      email: "outsider@test.com",
      username: "outsideruser",
      password: "Password123!",
    });

    // Generate JWT Tokens
    const ownerToken = generateAccessToken(ownerUser._id.toString());
    const adminToken = generateAccessToken(adminUser._id.toString());
    const member1Token = generateAccessToken(member1._id.toString());
    const member2Token = generateAccessToken(member2._id.toString());
    const viewerToken = generateAccessToken(viewerUser._id.toString());
    const outsiderToken = generateAccessToken(outsiderUser._id.toString());

    // Create Shared Workspace
    const workspace = await Workspace.create({
      name: "Acme Corp Workspace",
      slug: "acme-corp-ws",
      ownerId: ownerUser._id,
      isPersonal: false,
    });
    const wsIdStr = workspace._id.toString();

    // Attach Workspace Memberships
    await WorkspaceMember.create({ workspaceId: workspace._id, userId: ownerUser._id, role: "OWNER" });
    await WorkspaceMember.create({ workspaceId: workspace._id, userId: adminUser._id, role: "ADMIN" });
    await WorkspaceMember.create({ workspaceId: workspace._id, userId: member1._id, role: "MEMBER" });
    await WorkspaceMember.create({ workspaceId: workspace._id, userId: member2._id, role: "MEMBER" });
    await WorkspaceMember.create({ workspaceId: workspace._id, userId: viewerUser._id, role: "VIEWER" });

    // -------------------------------------------------------------------------
    // 1. Workspace Authorization & Anti-Enumeration
    // -------------------------------------------------------------------------
    console.log(">> 1. Verifying Workspace Authorization & 404 Anti-Enumeration...");

    const resOutsiderWs = await fetch(`${baseUrl}/workspaces/${wsIdStr}`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    expect(resOutsiderWs.status === 404, "1. Non-member workspace access returns 404 Not Found (anti-enumeration)");

    const resMemberUpdateWs = await fetch(`${baseUrl}/workspaces/${wsIdStr}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${member1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Hacked Workspace Name" }),
    });
    expect(resMemberUpdateWs.status === 403, "2. Member workspace update returns 403 Forbidden");

    const resAdminUpdateWs = await fetch(`${baseUrl}/workspaces/${wsIdStr}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Admin Workspace Name" }),
    });
    expect(resAdminUpdateWs.status === 403, "3. Admin workspace update returns 403 Forbidden (OWNER required)");

    const resOwnerUpdateWs = await fetch(`${baseUrl}/workspaces/${wsIdStr}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Acme Corp Renewed" }),
    });
    expect(resOwnerUpdateWs.status === 200, "4. Owner workspace update succeeds");

    // -------------------------------------------------------------------------
    // 2. Project Authorization
    // -------------------------------------------------------------------------
    console.log("\n>> 2. Verifying Project Authorization...");

    const resViewerCreateProj = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        "x-workspace-id": wsIdStr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Viewer Project Attempt" }),
    });
    expect(resViewerCreateProj.status === 403, "5. Viewer creating project returns 403 Forbidden");

    const resMemberCreateProj = await fetch(`${baseUrl}/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${member1Token}`,
        "x-workspace-id": wsIdStr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Alpha Project", description: "Created by Member 1" }),
    });
    expect(resMemberCreateProj.status === 201, "6. Member creating project returns 201 Created");
    const projBody = (await resMemberCreateProj.json()) as any;
    const projId = projBody.data.project.id;

    const resViewerGetProj = await fetch(`${baseUrl}/projects/${projId}`, {
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        "x-workspace-id": wsIdStr,
      },
    });
    expect(resViewerGetProj.status === 200, "7. Viewer reading workspace project returns 200 OK");

    const resViewerUpdateProj = await fetch(`${baseUrl}/projects/${projId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        "x-workspace-id": wsIdStr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Viewer Mod Name" }),
    });
    expect(resViewerUpdateProj.status === 403, "8. Viewer updating project returns 403 Forbidden");

    // -------------------------------------------------------------------------
    // 3. Task Authorization & Ownership Rules
    // -------------------------------------------------------------------------
    console.log("\n>> 3. Verifying Task Authorization & Creator Ownership Rules...");

    const resViewerCreateTask = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        "x-workspace-id": wsIdStr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Viewer Task Attempt", projectId: projId }),
    });
    expect(resViewerCreateTask.status === 403, "9. Viewer creating task returns 403 Forbidden");

    const resMember1CreateTask = await fetch(`${baseUrl}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${member1Token}`,
        "x-workspace-id": wsIdStr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Task 1 by Member 1", projectId: projId }),
    });
    expect(resMember1CreateTask.status === 201, "10. Member creating task returns 201 Created");
    const task1Body = (await resMember1CreateTask.json()) as any;
    const task1Id = task1Body.data.task.id;

    const resMember2DeleteTask1 = await fetch(`${baseUrl}/tasks/${task1Id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${member2Token}`,
        "x-workspace-id": wsIdStr,
      },
    });
    expect(resMember2DeleteTask1.status === 403, "11. Member deleting another member's task returns 403 Forbidden");

    const resAdminDeleteTask1 = await fetch(`${baseUrl}/tasks/${task1Id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "x-workspace-id": wsIdStr,
      },
    });
    expect(resAdminDeleteTask1.status === 200, "12. Admin deleting member task succeeds");

    // -------------------------------------------------------------------------
    // 4. Sub-Resource Route Authorization (Plans, Memories, Copilot Actions)
    // -------------------------------------------------------------------------
    console.log("\n>> 4. Verifying Sub-Resource Route Authorization...");

    const resViewerGenPlan = await fetch(`${baseUrl}/projects/${projId}/plans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        "x-workspace-id": wsIdStr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: "Generate plan" }),
    });
    expect(resViewerGenPlan.status === 403, "13. Viewer generating project plan returns 403 Forbidden");

    const resViewerCreateMemory = await fetch(`${baseUrl}/projects/${projId}/memories`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        "x-workspace-id": wsIdStr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category: "technical", content: "Test memory note" }),
    });
    expect(resViewerCreateMemory.status === 403, "14. Viewer creating project memory returns 403 Forbidden");

    const resViewerDryRun = await fetch(`${baseUrl}/copilot/actions/dry-run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        "x-workspace-id": wsIdStr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actionType: "CREATE_TASK", targetRef: projId, intent: "Add task" }),
    });
    expect(resViewerDryRun.status === 403, "15. Viewer performing copilot dry-run returns 403 Forbidden");

    // -------------------------------------------------------------------------
    // 5. Dashboard & Search Authorization
    // -------------------------------------------------------------------------
    console.log("\n>> 5. Verifying Dashboard & Search Authorization...");

    const resMemberDashboard = await fetch(`${baseUrl}/dashboard/overview`, {
      headers: {
        Authorization: `Bearer ${member1Token}`,
        "x-workspace-id": wsIdStr,
      },
    });
    expect(resMemberDashboard.status === 200, "16. Member viewing dashboard overview returns 200 OK");

    const resMemberSearch = await fetch(`${baseUrl}/search?q=Alpha`, {
      headers: {
        Authorization: `Bearer ${member1Token}`,
        "x-workspace-id": wsIdStr,
      },
    });
    expect(resMemberSearch.status === 200, "17. Member executing global search returns 200 OK");

    console.log("\n==================================================");
    console.log("?? ALL RBAC ENFORCEMENT INTEGRATION TESTS PASSED!");
    console.log("==================================================\n");
  } finally {
    if (server && typeof (server as any).close === "function") {
      (server as any).close();
    }
    await teardownTestDatabase();
  }
}

runTests().catch((err) => {
  console.error("? Test runner crashed:", err);
  process.exit(1);
});
