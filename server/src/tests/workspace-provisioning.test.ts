import dotenv from "dotenv";
import { Types } from "mongoose";

dotenv.config();

import User from "../models/user.model.js";
import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspace-member.model.js";
import { provisionPersonalWorkspace } from "../services/workspace.service.js";
import { registerUser } from "../services/auth.service.js";
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
    await Workspace.syncIndexes();
    await WorkspaceMember.syncIndexes();

    console.log("\n==================================================");
    console.log("▶ Phase 32 WP-02 — Personal Workspace Provisioning Tests");
    console.log("==================================================\n");

    // =========================================================================
    // 1. Direct Service Provisioning Tests
    // =========================================================================
    console.log(">> 1. Direct Personal Workspace Provisioning Service...");

    const userA = await User.create({
      name: "Alice Engineer",
      email: "alice@provision.test",
      username: "alice_eng",
      password: "Password123!",
    });

    const res1 = await provisionPersonalWorkspace(userA);

    expect(res1.workspace !== null, "1. provisionPersonalWorkspace creates Workspace document");
    expect(res1.workspace.ownerId.toString() === userA._id.toString(), "2. Workspace ownerId matches user._id");
    expect(res1.workspace.isPersonal === true, "3. Workspace isPersonal is true");
    expect(res1.workspace.name === "Alice Engineer's Workspace", "Name formatted as '<user.name>'s Workspace'");
    expect(res1.workspace.slug.startsWith("alice-eng"), "4. Generated slug derived from username");
    expect(res1.member !== null, "5. OWNER WorkspaceMember created");
    expect(res1.member.workspaceId.toString() === res1.workspace._id.toString(), "6. Member workspaceId matches workspace._id");
    expect(res1.member.userId.toString() === userA._id.toString(), "7. Member userId matches user._id");
    expect(res1.member.role === "OWNER", "8. Member role is OWNER");

    // =========================================================================
    // 2. Idempotency & Re-entrancy Tests
    // =========================================================================
    console.log("\n>> 2. Idempotency & Re-entrancy...");

    const res2 = await provisionPersonalWorkspace(userA);

    expect(res2.workspace._id.toString() === res1.workspace._id.toString(), "9/11. Calling provisioning twice reuses existing personal workspace");

    const userAWorkspaces = await Workspace.find({ ownerId: userA._id, isPersonal: true });
    expect(userAWorkspaces.length === 1, "9. No duplicate personal workspace created");

    const userAMemberships = await WorkspaceMember.find({ userId: userA._id });
    expect(userAMemberships.length === 1, "10. No duplicate WorkspaceMember created");

    // Membership repair test: simulate deleted membership
    await WorkspaceMember.deleteOne({ _id: res1.member._id });
    const res3 = await provisionPersonalWorkspace(userA);
    expect(res3.member !== null && res3.member.role === "OWNER", "12. Repaired missing OWNER membership for existing personal workspace");

    // =========================================================================
    // 3. User Registration Integration Tests
    // =========================================================================
    console.log("\n>> 3. User Registration Integration...");

    const registeredUser = await registerUser({
      name: "Bob Builder",
      email: "bob@provision.test",
      password: "Password123!",
    });

    expect(registeredUser.email === "bob@provision.test", "15. Registration response format remains backward compatible (user.toJSON())");

    const bobUserId = new Types.ObjectId((registeredUser as Record<string, any>).id as string);
    const bobWorkspace = await Workspace.findOne({ ownerId: bobUserId, isPersonal: true });
    expect(bobWorkspace !== null, "13. Newly registered user automatically receives a personal workspace");
    expect(bobWorkspace?.name === "Bob Builder's Workspace", "Personal workspace name derived from registered user name");

    const bobMember = bobWorkspace
      ? await WorkspaceMember.findOne({ workspaceId: bobWorkspace._id, userId: bobUserId })
      : null;
    expect(bobMember !== null && bobMember?.role === "OWNER", "14. Newly registered user automatically receives OWNER membership");

    // Duplicate registration failure test
    let dupRegErr = false;
    try {
      await registerUser({
        name: "Bob Duplicate",
        email: "bob@provision.test",
        password: "Password123!",
      });
    } catch {
      dupRegErr = true;
    }
    expect(dupRegErr, "16. Duplicate registration throws ConflictError as expected");

    // =========================================================================
    // 4. Slug Collision Handling
    // =========================================================================
    console.log("\n>> 4. Slug Collision Handling...");

    const regUser2 = await registerUser({
      name: "Bob Builder",
      email: "bob2@provision.test",
      password: "Password123!",
    });

    const bob2UserId = new Types.ObjectId((regUser2 as Record<string, any>).id as string);
    const bobWorkspace2 = await Workspace.findOne({ ownerId: bob2UserId, isPersonal: true });
    expect(bobWorkspace2 !== null, "Second user with same name registered successfully");
    expect(bobWorkspace2?.slug !== bobWorkspace?.slug, "18. Slug collision produces a valid alternate unique slug");

    console.log("\n==================================================");
    console.log("🎉 ALL WP-02 PROVISIONING TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================\n");

    await teardownTestDatabase();
    process.exit(0);
  } catch (err) {
    console.error("❌ Workspace Provisioning Test Failed:", err);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
