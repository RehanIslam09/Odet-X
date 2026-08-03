import dotenv from "dotenv";
import { Types } from "mongoose";

dotenv.config();
process.env.NODE_ENV = "test";

import { Permission } from "@/constants/permissions.js";
import { WorkspaceRole } from "@/constants/workspace.js";
import { PermissionEngine } from "@/domain/permission-evaluator.js";
import { IUserDocument } from "@/models/user.model.js";
import { IWorkspaceDocument } from "@/models/workspace.model.js";
import { IWorkspaceMemberDocument } from "@/models/workspace-member.model.js";

function expectEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    console.error(`❌ Assertion Failed: ${message}. Got '${actual}', expected '${expected}'`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

function mockUser(idStr: string): IUserDocument {
  return {
    _id: new Types.ObjectId(idStr),
  } as unknown as IUserDocument;
}

function mockWorkspace(idStr: string, isPersonal = false): IWorkspaceDocument {
  return {
    _id: new Types.ObjectId(idStr),
    isPersonal,
  } as unknown as IWorkspaceDocument;
}

function mockMember(wsIdStr: string, role: WorkspaceRole): IWorkspaceMemberDocument {
  return {
    workspaceId: new Types.ObjectId(wsIdStr),
    role,
  } as unknown as IWorkspaceMemberDocument;
}

async function runTests() {
  console.log("\n==================================================");
  console.log("🧪 Phase 33 WP-01 — Permission Engine Unit Tests");
  console.log("==================================================\n");

  const wsId1 = "507f1f77bcf86cd799439011";
  const wsId2 = "507f1f77bcf86cd799439022";
  const userId1 = "507f1f77bcf86cd799439033";
  const userId2 = "507f1f77bcf86cd799439044";

  const ownerUser = mockUser(userId1);
  const ownerWs = mockWorkspace(wsId1);
  const ownerMember = mockMember(wsId1, "OWNER");
  const ownerContext = { user: ownerUser, workspace: ownerWs, member: ownerMember };

  const memberMember = mockMember(wsId1, "MEMBER");
  const memberContext = { user: ownerUser, workspace: ownerWs, member: memberMember };

  // 1. Base Capabilities
  expectEqual(
    PermissionEngine.hasCapability("OWNER", Permission.WORKSPACE_DELETE),
    true,
    "OWNER has WORKSPACE_DELETE capability",
  );
  expectEqual(
    PermissionEngine.hasCapability("MEMBER", Permission.WORKSPACE_DELETE),
    false,
    "MEMBER lacks WORKSPACE_DELETE capability",
  );
  expectEqual(
    PermissionEngine.hasCapability("MEMBER", Permission.PROJECT_CREATE),
    true,
    "MEMBER has PROJECT_CREATE capability",
  );

  // 2. Evaluation Tests (Owner)
  const resOwnerDelete = PermissionEngine.evaluate(ownerContext, Permission.WORKSPACE_DELETE);
  expectEqual(resOwnerDelete.allowed, true, "OWNER allowed to delete workspace");

  // 3. Evaluation Tests (Anti-Enumeration / Tenant Mismatch)
  const resTenantMismatch = PermissionEngine.evaluate(memberContext, Permission.PROJECT_READ, {
    workspaceId: wsId2,
  });
  expectEqual(resTenantMismatch.allowed, false, "Tenant mismatch denied");
  expectEqual(resTenantMismatch.reason, "Workspace not found.", "Anti-enumeration 404 reason returned");

  // 4. Evaluation Tests (Personal Workspace Restrictions)
  const personalWs = mockWorkspace(wsId1, true);
  const personalOwnerContext = { user: ownerUser, workspace: personalWs, member: ownerMember };
  const resPersonalInvite = PermissionEngine.evaluate(personalOwnerContext, Permission.MEMBER_INVITE);
  expectEqual(resPersonalInvite.allowed, false, "Member invitation denied in personal workspace");

  // 5. Evaluation Tests (Member Task Deletion Refinements)
  const taskCreatedBySelf = { createdBy: userId1, workspaceId: wsId1 };
  const taskCreatedByOther = { createdBy: userId2, workspaceId: wsId1 };

  const resMemberDeleteOwn = PermissionEngine.evaluate(memberContext, Permission.TASK_DELETE, taskCreatedBySelf);
  expectEqual(resMemberDeleteOwn.allowed, true, "MEMBER can delete own task");

  const resMemberDeleteOther = PermissionEngine.evaluate(memberContext, Permission.TASK_DELETE, taskCreatedByOther);
  expectEqual(resMemberDeleteOther.allowed, false, "MEMBER cannot delete task created by other user");

  const resOwnerDeleteOther = PermissionEngine.evaluate(ownerContext, Permission.TASK_DELETE, taskCreatedByOther);
  expectEqual(resOwnerDeleteOther.allowed, true, "OWNER can delete task created by any user");

  console.log("\n==================================================");
  console.log("🎉 All Permission Engine Unit Tests Passed!");
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Test runner crashed:", err);
  process.exit(1);
});
