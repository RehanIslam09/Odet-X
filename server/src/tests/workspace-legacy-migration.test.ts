import dotenv from "dotenv";

dotenv.config();
process.env.NODE_ENV = "test";

import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";

import { listWorkspacesForUser } from "../services/workspace.service.js";
import { migrateWorkspacesAndTenants } from "../scripts/migrate-workspaces.js";
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
    console.log("\n==================================================");
    console.log("▶ Phase 32 Legacy Account Migration & Repair Tests");
    console.log("==================================================\n");

    // 1. Create a legacy pre-Phase-32 user without a personal workspace or WorkspaceMember records
    const legacyUser = await User.create({
      name: "Legacy Developer",
      email: "legacy.dev@test.com",
      username: "legacy_dev",
      password: "Password123!",
    });

    // Create a legacy project without workspaceId
    const legacyProj = new Project({
      name: "Legacy Pre-Phase-32 Project",
      owner: legacyUser._id,
    });
    await legacyProj.save();

    // Create legacy task without workspaceId
    const legacyTask = new Task({
      title: "Legacy Task",
      projectId: legacyProj._id,
      owner: legacyUser._id,
      priority: "medium",
    });
    await legacyTask.save();

    console.log(">> 1. Verifying on-the-fly personal workspace repair for listWorkspacesForUser...");

    const initialWorkspaces = await listWorkspacesForUser(legacyUser._id.toString());
    expect(initialWorkspaces.length === 1, "1. listWorkspacesForUser automatically provisions personal workspace for legacy user");
    expect(initialWorkspaces[0]?.isPersonal === true, "2. Provisioned workspace is marked isPersonal");
    expect(initialWorkspaces[0]?.role === "OWNER", "3. Legacy user assigned OWNER role");

    console.log("\n>> 2. Verifying migrateWorkspacesAndTenants script batch execution...");

    const summary = await migrateWorkspacesAndTenants();
    expect(summary.usersProcessed >= 1, "4. Batch migration processed legacy user");

    const updatedProj = await Project.findById(legacyProj._id);
    expect(Boolean(updatedProj?.workspaceId), "5. Legacy project populated with workspaceId");
    expect(updatedProj?.workspaceId?.toString() === initialWorkspaces[0]?.id, "6. Legacy project workspaceId matches user's personal workspace");

    const updatedTask = await Task.findById(legacyTask._id);
    expect(Boolean(updatedTask?.workspaceId), "7. Legacy task populated with workspaceId");
    expect(updatedTask?.workspaceId?.toString() === initialWorkspaces[0]?.id, "8. Legacy task workspaceId matches user's personal workspace");

    console.log("\n>> 3. Verifying Idempotency when running migration script twice...");
    const summary2 = await migrateWorkspacesAndTenants();
    expect(summary2.workspacesCreated === 0, "9. Rerunning migration script creates 0 duplicate workspaces");
    expect(summary2.membersCreated === 0, "10. Rerunning migration script creates 0 duplicate memberships");
    expect(summary2.projectsMigrated === 0, "11. Rerunning migration script mutates 0 projects");

    console.log("\n==================================================");
    console.log("🎉 ALL LEGACY WORKSPACE MIGRATION TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================\n");

    await teardownTestDatabase();
    process.exit(0);
  } catch (err) {
    console.error("❌ Legacy Workspace Migration Test Failed:", err);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
