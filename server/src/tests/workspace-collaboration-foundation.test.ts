import dotenv from "dotenv";

dotenv.config();
process.env.NODE_ENV = "test";

import User from "@/models/user.model.js";
import Workspace from "@/models/workspace.model.js";
import WorkspaceMember from "@/models/workspace-member.model.js";
import WorkspaceInvitation from "@/models/workspace-invitation.model.js";
import {
  acceptInvitation,
  createInvitation,
  getInvitationByToken,
  listPendingInvitations,
  revokeInvitation,
  transferWorkspaceOwnership,
  updateMemberRole,
} from "@/services/workspace-invitation.service.js";
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
    console.log("🧪 Phase 34.5 WP-01 — Workspace Collaboration Foundation Tests");
    console.log("==================================================\n");

    // 1. Setup Owner & Member Users and Workspace
    const ownerUser = await User.create({
      name: "Workspace Owner",
      username: "wsowner",
      email: "owner@workspace.com",
      password: "password123",
    });

    const inviteeUser = await User.create({
      name: "Invitee User",
      username: "invitee",
      email: "invitee@company.com",
      password: "password123",
    });

    const workspace = await Workspace.create({
      name: "Test Collaboration Workspace",
      slug: "test-collab-ws",
      ownerId: ownerUser._id,
      isPersonal: false,
    });

    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: ownerUser._id,
      role: "OWNER",
    });

    const wsIdStr = workspace._id.toString();
    const ownerIdStr = ownerUser._id.toString();
    const inviteeIdStr = inviteeUser._id.toString();

    // -------------------------------------------------------------------------
    // 1. Invitation Generation
    // -------------------------------------------------------------------------
    console.log(">> 1. Testing invitation creation...");

    const inviteDto = await createInvitation(
      wsIdStr,
      "invitee@company.com",
      "MEMBER",
      ownerIdStr,
    );

    expect(inviteDto.email === "invitee@company.com", "1.1. Invitation email matches input");
    expect(inviteDto.role === "MEMBER", "1.2. Invitation role matches MEMBER");
    expect(Boolean(inviteDto.token), "1.3. Secure token generated");

    // -------------------------------------------------------------------------
    // 2. Pending Invitations Listing & Validation
    // -------------------------------------------------------------------------
    console.log("\n>> 2. Testing pending invitations list & token validation...");

    const pendingList = await listPendingInvitations(wsIdStr, ownerIdStr);
    expect(pendingList.length === 1, "2.1. Pending invitation list returns 1 item");
    expect(pendingList[0]!.email === "invitee@company.com", "2.2. Pending item matches invite email");

    const tokenDetails = await getInvitationByToken(inviteDto.token);
    expect(tokenDetails.workspaceName === "Test Collaboration Workspace", "2.3. Token validation returns workspace name");
    expect(tokenDetails.workspaceSlug === "test-collab-ws", "2.4. Token validation returns workspace slug");

    // -------------------------------------------------------------------------
    // 3. Invitation Acceptance Flow
    // -------------------------------------------------------------------------
    console.log("\n>> 3. Testing invitation acceptance...");

    const acceptResult = await acceptInvitation(inviteDto.token, inviteeIdStr);
    expect(acceptResult.workspaceId === wsIdStr, "3.1. Accept result returns workspaceId");
    expect(acceptResult.workspaceSlug === "test-collab-ws", "3.2. Accept result returns workspaceSlug");

    const newMember = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId: inviteeUser._id,
    });
    expect(Boolean(newMember), "3.3. WorkspaceMember record created for invitee");
    expect(newMember?.role === "MEMBER", "3.4. Member role assigned as MEMBER");

    const acceptedInviteDoc = await WorkspaceInvitation.findById(inviteDto.id);
    expect(acceptedInviteDoc?.status === "ACCEPTED", "3.5. Invitation status updated to ACCEPTED");

    // -------------------------------------------------------------------------
    // 4. Role Promotion & Demotion
    // -------------------------------------------------------------------------
    console.log("\n>> 4. Testing role promotion & demotion...");

    await updateMemberRole(wsIdStr, inviteeIdStr, "OWNER", ownerIdStr);
    let updatedMember = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId: inviteeUser._id,
    });
    expect(updatedMember?.role === "OWNER", "4.1. Invitee promoted to OWNER role");

    await updateMemberRole(wsIdStr, ownerIdStr, "OWNER", inviteeIdStr);
    updatedMember = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId: inviteeUser._id,
    });
    expect(updatedMember?.role === "MEMBER", "4.2. Invitee demoted back to MEMBER role");

    // Test sole owner demotion protection
    let soleOwnerErr = false;
    try {
      await updateMemberRole(wsIdStr, ownerIdStr, "MEMBER", ownerIdStr);
    } catch {
      soleOwnerErr = true;
    }
    expect(soleOwnerErr, "4.3. Sole owner demotion prevented");

    // -------------------------------------------------------------------------
    // 5. Ownership Transfer Flow
    // -------------------------------------------------------------------------
    console.log("\n>> 5. Testing workspace ownership transfer...");

    await transferWorkspaceOwnership(wsIdStr, inviteeIdStr, ownerIdStr);
    const updatedWs = await Workspace.findById(workspace._id);
    expect(updatedWs?.ownerId.toString() === inviteeIdStr, "5.1. Primary workspace owner updated to new user");

    const newOwnerMemberDoc = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId: inviteeUser._id,
    });
    expect(newOwnerMemberDoc?.role === "OWNER", "5.2. New primary owner role set to OWNER");

    const oldOwnerMemberDoc = await WorkspaceMember.findOne({
      workspaceId: workspace._id,
      userId: ownerUser._id,
    });
    expect(oldOwnerMemberDoc?.role === "MEMBER", "5.3. Former owner role demoted to MEMBER");

    const ownerCount = await WorkspaceMember.countDocuments({
      workspaceId: workspace._id,
      role: "OWNER",
    });
    expect(ownerCount === 1, "5.4. Exactly 1 OWNER record exists in workspace");

    // -------------------------------------------------------------------------
    // 6. Revocation Flow
    // -------------------------------------------------------------------------
    console.log("\n>> 6. Testing invitation revocation...");

    const secondInvite = await createInvitation(
      wsIdStr,
      "second@company.com",
      "MEMBER",
      inviteeIdStr,
    );

    await revokeInvitation(wsIdStr, secondInvite.id, inviteeIdStr);
    const revokedDoc = await WorkspaceInvitation.findById(secondInvite.id);
    expect(revokedDoc?.status === "REVOKED", "6.1. Invitation status set to REVOKED");

    console.log("\n==================================================");
    console.log("🎉 ALL WORKSPACE COLLABORATION FOUNDATION TESTS PASSED!");
    console.log("==================================================\n");
  } finally {
    await teardownTestDatabase();
  }
}

runTests().catch((err) => {
  console.error("❌ Test runner crashed:", err);
  process.exit(1);
});
