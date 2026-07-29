import dotenv from "dotenv";

dotenv.config();

import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import PlanDraft from "../models/plan-draft.model.js";
import { provisionPersonalWorkspace } from "../services/workspace.service.js";
import { createProject } from "../services/project.service.js";
import { createTask, updateTask } from "../services/task.service.js";
import { commitPlan } from "../services/plan-commit.service.js";
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
    await Project.syncIndexes();
    await Task.syncIndexes();
    await Milestone.syncIndexes();
    await PlanDraft.syncIndexes();

    console.log("\n==================================================");
    console.log("▶ Phase 32 WP-03 — Domain Service Workspace Scoping Tests");
    console.log("==================================================\n");

    // =========================================================================
    // Setup Test Fixtures: User A & User B with Workspaces
    // =========================================================================
    const userA = await User.create({
      name: "Alice Tenant",
      email: "alice.tenant@test.com",
      username: "alice_tenant",
      password: "Password123!",
    });

    const userB = await User.create({
      name: "Bob Tenant",
      email: "bob.tenant@test.com",
      username: "bob_tenant",
      password: "Password123!",
    });

    const provA = await provisionPersonalWorkspace(userA);
    const provB = await provisionPersonalWorkspace(userB);

    const wsAId = provA.workspace._id;
    const wsBId = provB.workspace._id;

    // =========================================================================
    // 1. Project Tenant Scoping & Derivation
    // =========================================================================
    console.log(">> 1. Project Workspace Tenancy Derivation...");

    const projA = await createProject(userA._id.toString(), { name: "Project Alpha", description: "", emoji: "📁", color: "#6366f1" });
    expect(projA.workspaceId !== undefined, "Project Alpha receives workspaceId");
    expect(projA.workspaceId?.toString() === wsAId.toString(), "1. Project Alpha workspaceId matches User A personal workspace");

    const projB = await createProject(userB._id.toString(), { name: "Project Beta", description: "", emoji: "📁", color: "#6366f1" });
    expect(projB.workspaceId?.toString() === wsBId.toString(), "2. Project Beta workspaceId matches User B personal workspace");

    // =========================================================================
    // 2. Child Entity Workspace Inheritance (Tasks & Milestones)
    // =========================================================================
    console.log("\n>> 2. Child Entity Workspace Inheritance...");

    const taskA1 = await createTask(userA._id.toString(), {
      title: "Task in Alpha",
      projectId: projA._id.toString(),
    });
    expect(taskA1.workspaceId !== undefined, "Task A1 receives workspaceId");
    expect(taskA1.workspaceId?.toString() === wsAId.toString(), "3. Task A1 inherits parent Project Alpha workspaceId");

    const standaloneTask = await createTask(userA._id.toString(), {
      title: "Standalone Task A",
      projectId: null,
    });
    expect(standaloneTask.workspaceId?.toString() === wsAId.toString(), "4. Standalone task receives user personal workspaceId");

    // =========================================================================
    // 3. Plan Commit Workspace Propagation
    // =========================================================================
    console.log("\n>> 3. Plan Commit Workspace Propagation...");

    const draftA = await PlanDraft.create({
      owner: userA._id,
      workspaceId: wsAId,
      projectId: projA._id,
      status: "draft",
      promptDescription: "Build MVP feature set",
      expiresAt: new Date(Date.now() + 3600000),
      tasks: [
        {
          tempId: "t1",
          title: "Feature Task 1",
          description: "Task desc",
          priority: "high",
          estimatedTime: "2h",
          position: 1,
          dependencies: [],
          milestoneTempId: "m1",
        },
      ],
      milestones: [
        {
          tempId: "m1",
          title: "MVP Milestone",
          description: "Milestone desc",
          targetDate: null,
          position: 1,
        },
      ],
    });

    const commitRes = await commitPlan(userA._id.toString(), projA._id.toString(), draftA._id.toString());
    expect(commitRes.taskCount === 1 && commitRes.milestoneCount === 1, "Plan committed successfully");

    const createdMilestones = await Milestone.find({ projectId: projA._id });
    expect(createdMilestones.length === 1, "Generated milestone created");
    expect(createdMilestones[0]?.workspaceId !== undefined && createdMilestones[0]?.workspaceId?.toString() === wsAId.toString(), "5. Generated milestone inherited project workspaceId");

    const createdTasks = await Task.find({ projectId: projA._id, title: "Feature Task 1" });
    expect(createdTasks.length === 1, "Generated task created");
    expect(createdTasks[0]?.workspaceId !== undefined && createdTasks[0]?.workspaceId?.toString() === wsAId.toString(), "6. Generated task inherited project workspaceId");

    // =========================================================================
    // 4. Adversarial Multi-Tenant Cross-Workspace Attack Prevention
    // =========================================================================
    console.log("\n>> 4. Adversarial Multi-Tenant Cross-Workspace Attack Prevention...");

    let attack1Blocked = false;
    try {
      await createTask(userA._id.toString(), {
        title: "Malicious Task In Project B",
        projectId: projB._id.toString(),
      });
    } catch (err: any) {
      if (err.message.includes("Project not found")) {
        attack1Blocked = true;
      }
    }
    expect(attack1Blocked, "7. User A prevented from creating a task in User B's project (404 enumeration resistance)");

    let attack2Blocked = false;
    try {
      await updateTask(taskA1._id.toString(), userA._id.toString(), {
        projectId: projB._id.toString(),
      });
    } catch (err: any) {
      if (err.message.includes("Project not found")) {
        attack2Blocked = true;
      }
    }
    expect(attack2Blocked, "8. User A prevented from moving task to User B's project");

    console.log("\n==================================================");
    console.log("🎉 ALL WP-03 TENANT SCOPING TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================\n");

    await teardownTestDatabase();
    process.exit(0);
  } catch (err) {
    console.error("❌ WP-03 Workspace Tenant Scoping Test Failed:", err);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
