import dotenv from "dotenv";

dotenv.config();
process.env.NODE_ENV = "test";

import User from "../models/user.model.js";
import { provisionPersonalWorkspace, createCustomWorkspace, listWorkspacesForUser } from "../services/workspace.service.js";
import { listProjects, createProject } from "../services/project.service.js";
import { listTasks, createTask } from "../services/task.service.js";
import { getDashboardOverview } from "../services/dashboard.service.js";
import { listActivities } from "../services/activity.service.js";
import { listWorkspaceRecommendations } from "../services/project-recommendation-query.service.js";
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
    console.log("▶ Phase 32 Clean-Slate Workspace Isolation Tests");
    console.log("==================================================\n");

    // 1. Create test user
    const user = await User.create({
      name: "Clean Slate Dev",
      email: "clean.slate@test.com",
      username: "clean_slate",
      password: "Password123!",
    });
    const userId = user._id.toString();

    // Provision personal workspace P
    const provResult = await provisionPersonalWorkspace(user);
    const personalWs = provResult.workspace;

    // Create custom workspace C
    const customWs = await createCustomWorkspace(userId, {
      name: "Apache Superset Engineering",
      slug: "apache-engineering",
    });

    console.log(">> 1. Verifying user possesses two distinct workspaces...");
    const userWorkspaces = await listWorkspacesForUser(userId);
    expect(userWorkspaces.length === 2, "1. User owns two distinct workspaces (Personal + Custom)");

    console.log("\n>> 2. Creating entities inside Personal Workspace...");
    const personalProj = await createProject(userId, { name: "Personal Alpha Project" }, personalWs._id.toString());
    await createTask(userId, { title: "Personal Alpha Task", projectId: personalProj._id.toString() }, personalWs._id.toString());

    console.log("\n>> 3. Querying Personal Workspace...");
    const pProjects = await listProjects(userId, { page: 1, limit: 10 } as unknown as any, personalWs._id.toString());
    expect(pProjects.items.length === 1, "2. Personal workspace lists 1 project");
    expect(pProjects.items[0]?._id.toString() === personalProj._id.toString(), "3. Personal workspace project matches Personal Alpha");

    const pTasks = await listTasks(userId, { page: 1, limit: 10 } as unknown as any, personalWs._id.toString());
    expect(pTasks.items.length === 1, "4. Personal workspace lists 1 task");

    const pDashboard = await getDashboardOverview(userId, personalWs._id.toString());
    expect(pDashboard.summary.projects.active === 1, "5. Personal dashboard overview shows 1 active project");
    expect(pDashboard.recentProjects.length === 1, "6. Personal dashboard recent projects contains 1 project");
    expect(pDashboard.recentProjects[0]?.project.name === "Personal Alpha Project", "7. Personal dashboard recent project name is Personal Alpha Project");

    const pActivities = await listActivities(userId, { limit: 10 }, personalWs._id.toString());
    expect(pActivities.items.length >= 2, "8. Personal workspace has activities logged for project/task creation");

    const pRecs = await listWorkspaceRecommendations(userId, { page: 1, limit: 10, status: "ACTIVE" }, personalWs._id.toString());
    expect(pRecs.items.length === 0, "9. Personal workspace recommendations query runs scoped to personal workspace");

    console.log("\n>> 4. Querying Custom Workspace C (MUST BE CLEAN SLATE)...");
    const cProjects = await listProjects(userId, { page: 1, limit: 10 } as unknown as any, customWs.id);
    expect(cProjects.items.length === 0, "10. Custom workspace returns 0 projects (clean slate)");

    const cTasks = await listTasks(userId, { page: 1, limit: 10 } as unknown as any, customWs.id);
    expect(cTasks.items.length === 0, "11. Custom workspace returns 0 tasks (clean slate)");

    const cDashboard = await getDashboardOverview(userId, customWs.id);
    expect(cDashboard.summary.projects.active === 0, "12. Custom workspace dashboard shows 0 active projects");
    expect(cDashboard.summary.tasks.totalActive === 0, "13. Custom workspace dashboard shows 0 active tasks");
    expect(cDashboard.recentProjects.length === 0, "14. Custom workspace dashboard recent projects returns 0 items (no leakage)");

    const cActivities = await listActivities(userId, { limit: 10 }, customWs.id);
    expect(cActivities.items.length === 0, "15. Custom workspace returns 0 activity items (no leakage from Personal workspace)");

    const cRecs = await listWorkspaceRecommendations(userId, { page: 1, limit: 10, status: "ACTIVE" }, customWs.id);
    expect(cRecs.items.length === 0, "16. Custom workspace recommendations returns 0 items (clean slate)");

    console.log("\n>> 5. Creating entities inside Custom Workspace C...");
    const customProj = await createProject(userId, { name: "Custom Superset Project" }, customWs.id);
    await createTask(userId, { title: "Custom Superset Task", projectId: customProj._id.toString() }, customWs.id);

    console.log("\n>> 6. Verifying dataset isolation after custom entity creation...");
    const cProjectsUpdated = await listProjects(userId, { page: 1, limit: 10 } as unknown as any, customWs.id);
    expect(cProjectsUpdated.items.length === 1, "17. Custom workspace lists 1 project");
    expect(cProjectsUpdated.items[0]?._id.toString() === customProj._id.toString(), "18. Custom project matches Custom Superset Project");

    const cDashboardUpdated = await getDashboardOverview(userId, customWs.id);
    expect(cDashboardUpdated.recentProjects.length === 1, "19. Custom dashboard recent projects shows 1 custom project");
    expect(cDashboardUpdated.recentProjects[0]?.project.name === "Custom Superset Project", "20. Custom dashboard recent project is Custom Superset Project");

    const pProjectsUpdated = await listProjects(userId, { page: 1, limit: 10 } as unknown as any, personalWs._id.toString());
    expect(pProjectsUpdated.items.length === 1, "21. Personal workspace still lists 1 project");
    expect(pProjectsUpdated.items[0]?._id.toString() === personalProj._id.toString(), "22. Personal workspace does NOT contain Custom Superset Project");

    const pActivitiesUpdated = await listActivities(userId, { limit: 10 }, personalWs._id.toString());
    const cActivitiesUpdated = await listActivities(userId, { limit: 10 }, customWs.id);
    expect(cActivitiesUpdated.items.length >= 2, "23. Custom workspace has its own logged activities");
    expect(pActivitiesUpdated.items.every(a => a.workspaceId?.toString() === personalWs._id.toString()), "24. Personal activities belong strictly to personal workspace");
    expect(cActivitiesUpdated.items.every(a => a.workspaceId?.toString() === customWs.id), "25. Custom activities belong strictly to custom workspace");

    console.log("\n==================================================");
    console.log("🎉 ALL CLEAN-SLATE WORKSPACE ISOLATION TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================\n");

    await teardownTestDatabase();
    process.exit(0);
  } catch (err) {
    console.error("❌ Clean-Slate Workspace Isolation Test Failed:", err);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
