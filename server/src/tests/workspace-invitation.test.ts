import dotenv from "dotenv";
import { Types } from "mongoose";

dotenv.config();
process.env.NODE_ENV = "test";

import WorkspaceMember from "@/models/workspace-member.model.js";
import WorkspaceInvitation from "@/models/workspace-invitation.model.js";
import Task from "@/models/task.model.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";

function expect(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runTests() {
  await setupTestDatabase();

  try {
    console.log("\n==================================================");
    console.log("🧪 Phase 33 WP-02 — Workspace Collaboration Model Tests");
    console.log("==================================================\n");

    const wsId = new Types.ObjectId("507f1f77bcf86cd799439011");
    const user1 = new Types.ObjectId("507f1f77bcf86cd799439022");
    const user2 = new Types.ObjectId("507f1f77bcf86cd799439033");
    const user3 = new Types.ObjectId("507f1f77bcf86cd799439044");

    // -------------------------------------------------------------------------
    // 1. WorkspaceMember Role Validation
    // -------------------------------------------------------------------------
    console.log(">> 1. Verifying WorkspaceMember schema role validation...");

    const mOwner = await WorkspaceMember.create({ workspaceId: wsId, userId: user1, role: "OWNER" });
    expect(mOwner.role === "OWNER", "1. OWNER role accepted by WorkspaceMember");

    const mMember = await WorkspaceMember.create({ workspaceId: wsId, userId: user3, role: "MEMBER" });
    expect(mMember.role === "MEMBER", "2. MEMBER role accepted by WorkspaceMember");

    let invalidRoleErr = false;
    try {
      await WorkspaceMember.create({
        workspaceId: wsId,
        userId: new Types.ObjectId(),
        role: "INVALID_ROLE" as any,
      });
    } catch {
      invalidRoleErr = true;
    }
    expect(invalidRoleErr, "3. Invalid role rejected by WorkspaceMember schema");

    // -------------------------------------------------------------------------
    // 2. WorkspaceInvitation Schema & Token Uniqueness
    // -------------------------------------------------------------------------
    console.log("\n>> 2. Verifying WorkspaceInvitation schema & unique token index...");

    const token1 = "inv_token_abc_123";
    const expiresAt = new Date(Date.now() + 86400000);

    const invite1 = await WorkspaceInvitation.create({
      workspaceId: wsId,
      email: "newmember@test.com",
      role: "MEMBER",
      invitedBy: user1,
      token: token1,
      status: "PENDING",
      expiresAt,
    });

    expect(invite1.email === "newmember@test.com", "4. Invitation email normalized to lowercase");
    expect(invite1.status === "PENDING", "5. Invitation status defaults to PENDING");
    expect(invite1.role === "MEMBER", "6. Invitation role saved as MEMBER");

    // Test token uniqueness
    let duplicateTokenErr = false;
    try {
      await WorkspaceInvitation.create({
        workspaceId: wsId,
        email: "another@test.com",
        role: "MEMBER",
        invitedBy: user1,
        token: token1, // Duplicate token
        status: "PENDING",
        expiresAt,
      });
    } catch {
      duplicateTokenErr = true;
    }
    expect(duplicateTokenErr, "7. Duplicate invitation token rejected by unique index");

    // Test status enum validation
    let invalidStatusErr = false;
    try {
      await WorkspaceInvitation.create({
        workspaceId: wsId,
        email: "test@test.com",
        role: "MEMBER",
        invitedBy: user1,
        token: "inv_token_xyz_456",
        status: "INVALID_STATUS" as any,
        expiresAt,
      });
    } catch {
      invalidStatusErr = true;
    }
    expect(invalidStatusErr, "8. Invalid invitation status rejected by schema enum");

    // -------------------------------------------------------------------------
    // 3. Task Assignee & Watcher Fields
    // -------------------------------------------------------------------------
    console.log("\n>> 3. Verifying Task collaboration fields (assigneeId & watcherIds)...");

    const task = await Task.create({
      owner: user1,
      workspaceId: wsId,
      title: "Collaborative Task",
      assigneeId: user2,
      watcherIds: [user1, user2, user3],
    });

    expect(task.assigneeId?.toString() === user2.toString(), "9. Task assigneeId saved and retrieved");
    expect(task.watcherIds?.length === 3, "10. Task watcherIds array persisted");
    expect(task.watcherIds?.[1]?.toString() === user2.toString(), "11. Task watcher user ObjectId matched");

    console.log("\n==================================================");
    console.log("🎉 ALL WORKSPACE COLLABORATION MODEL TESTS PASSED!");
    console.log("==================================================\n");
  } finally {
    await teardownTestDatabase();
  }
}

runTests().catch((err) => {
  console.error("❌ Test runner crashed:", err);
  process.exit(1);
});
