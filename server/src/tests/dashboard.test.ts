import dotenv from "dotenv";


dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { getDashboardOverview } from "../services/dashboard.service.js";
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";

// Helper for assertion logging
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
    console.log("\n--- Starting Phase 14.1 Dashboard Backend Tests ---\n");

    const userA = await User.create({
      name: "User A",
      username: "usera",
      email: "usera@example.com",
      password: "password123",
    });

    const userB = await User.create({
      name: "User B",
      username: "userb",
      email: "userb@example.com",
      password: "password123",
    });

    console.log("\n>> Preparing Database State...");

    // Create User B's noise data (to verify tenant isolation)
    await Project.create({ owner: userB._id, name: "User B Project", archived: false, isDeleted: false });
    await Task.create({ owner: userB._id, title: "User B Task", status: "todo", archived: false, isDeleted: false });

    // User A: Active Projects
    const p1 = await Project.create({ owner: userA._id, name: "Active P1", archived: false, isDeleted: false });
    const p2 = await Project.create({ owner: userA._id, name: "Active P2", archived: false, isDeleted: false });
    const p3 = await Project.create({ owner: userA._id, name: "Active P3", archived: false, isDeleted: false });
    const p4 = await Project.create({ owner: userA._id, name: "Active P4", archived: false, isDeleted: false });
    const p5 = await Project.create({ owner: userA._id, name: "Active P5", archived: false, isDeleted: false });
    
    // Adjust updatedAt to control recent projects ordering
    await Project.findByIdAndUpdate(p1._id, { updatedAt: new Date(Date.now() - 10000) }, { timestamps: false });
    await Project.findByIdAndUpdate(p2._id, { updatedAt: new Date(Date.now() - 8000) }, { timestamps: false });
    await Project.findByIdAndUpdate(p3._id, { updatedAt: new Date(Date.now() - 6000) }, { timestamps: false });
    await Project.findByIdAndUpdate(p4._id, { updatedAt: new Date(Date.now() - 4000) }, { timestamps: false });
    await Project.findByIdAndUpdate(p5._id, { updatedAt: new Date(Date.now() - 2000) }, { timestamps: false }); // Most recent

    // User A: Archived and Soft-Deleted Projects
    await Project.create({ owner: userA._id, name: "Archived Project", archived: true, isDeleted: false });
    await Project.create({ owner: userA._id, name: "Deleted Project", archived: false, isDeleted: true });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const tenDaysLater = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    // User A: Tasks for P5 (To test project progress: 1 done, 1 in_progress, 1 cancelled, 1 todo)
    // actionableTotal = 3 (done, in_progress, todo), completed = 1 -> 33%
    await Task.create({ owner: userA._id, projectId: p5._id, title: "P5 Done", status: "done" });
    await Task.create({ owner: userA._id, projectId: p5._id, title: "P5 In Progress", status: "in_progress" });
    await Task.create({ owner: userA._id, projectId: p5._id, title: "P5 Cancelled", status: "cancelled" });
    await Task.create({ owner: userA._id, projectId: p5._id, title: "P5 Todo", status: "todo" });

    // User A: Tasks for P4 (To test 100% completion: 1 done, 1 cancelled)
    // actionableTotal = 1 (done), completed = 1 -> 100%
    await Task.create({ owner: userA._id, projectId: p4._id, title: "P4 Done", status: "done" });
    await Task.create({ owner: userA._id, projectId: p4._id, title: "P4 Cancelled", status: "cancelled" });

    // User A: Tasks for P3 (To test 0% completion with zero eligible tasks: only cancelled)
    // actionableTotal = 0 -> 0%
    await Task.create({ owner: userA._id, projectId: p3._id, title: "P3 Cancelled", status: "cancelled" });

    // User A: Attention Tasks
    // Overdue 1 (Yesterday, todo)
    await Task.create({ owner: userA._id, title: "Overdue 1", status: "todo", dueDate: yesterday });
    
    // Overdue 2 (Yesterday, in_progress)
    await Task.create({ owner: userA._id, title: "Overdue 2", status: "in_progress", dueDate: yesterday });
    
    // Past due but NOT overdue (Done)
    await Task.create({ owner: userA._id, title: "Past but Done", status: "done", dueDate: yesterday });
    
    // Past due but NOT overdue (Cancelled)
    await Task.create({ owner: userA._id, title: "Past but Cancelled", status: "cancelled", dueDate: yesterday });

    // Due Soon 1 (Tomorrow, todo)
    await Task.create({ owner: userA._id, title: "Due Soon 1", status: "todo", dueDate: tomorrow });

    // Due Soon 2 (3 days later, in_progress)
    await Task.create({ owner: userA._id, title: "Due Soon 2", status: "in_progress", dueDate: threeDaysLater });

    // Due Later (10 days later - should not be due soon)
    await Task.create({ owner: userA._id, title: "Due Later", status: "todo", dueDate: tenDaysLater });

    // Archived and Soft-Deleted Tasks
    await Task.create({ owner: userA._id, title: "Archived Task", status: "todo", archived: true, isDeleted: false });
    await Task.create({ owner: userA._id, title: "Deleted Task", status: "todo", archived: false, isDeleted: true });
    // Overdue but archived
    await Task.create({ owner: userA._id, title: "Overdue Archived", status: "todo", dueDate: yesterday, archived: true, isDeleted: false });

    // Overdue 3, 4, 5, 6 (To test attention tasks limits)
    await Task.create({ owner: userA._id, title: "Overdue 3", status: "todo", dueDate: new Date(yesterday.getTime() - 1000) });
    await Task.create({ owner: userA._id, title: "Overdue 4", status: "todo", dueDate: new Date(yesterday.getTime() - 2000) });
    await Task.create({ owner: userA._id, title: "Overdue 5", status: "todo", dueDate: new Date(yesterday.getTime() - 3000) });
    await Task.create({ owner: userA._id, title: "Overdue 6", status: "todo", dueDate: new Date(yesterday.getTime() - 4000) });

    console.log(">> State initialized. Fetching User A Dashboard...");

    const overview = await getDashboardOverview(userA._id.toString());

    console.log("\n>> Running Dashboard Metric Tests...");

    // Tenant Isolation
    const userBDashboard = await getDashboardOverview(userB._id.toString());
    expect(userBDashboard.summary.projects.active === 1, "User A cannot receive User B's data (Projects)");
    expect(userBDashboard.summary.tasks.totalActive === 1, "User A cannot receive User B's data (Tasks)");

    // Project Metrics
    expect(overview.summary.projects.active === 5, "Active Project counts are correct (excludes archived, deleted, and other tenants)");
    expect(overview.summary.projects.archived === 1, "Archived Project counts are correct");
    // Deleted project is tested implicitly as it's not in active or archived

    // Task Summary Metrics
    // Total Active Tasks for User A:
    // P5(4) + P4(2) + P3(1) + Overdue(6) + PastDone(1) + PastCancelled(1) + DueSoon(2) + DueLater(1) = 18
    expect(overview.summary.tasks.totalActive === 18, "Active Task counts are correct (excludes archived, deleted, and other tenants)");
    
    // Completed: P5(1) + P4(1) + PastDone(1) = 3
    expect(overview.summary.tasks.completed === 3, "Completed counts are correct");
    
    // In Progress: P5(1) + Overdue2(1) + DueSoon2(1) = 3
    expect(overview.summary.tasks.inProgress === 3, "In-progress counts are correct");

    // Cancelled: P5(1) + P4(1) + P3(1) + PastCancelled(1) = 4
    expect(overview.summary.tasks.cancelled === 4, "Cancelled counts are correct");

    // Overdue: Overdue1, Overdue2, Overdue3, Overdue4, Overdue5, Overdue6 = 6
    expect(overview.summary.tasks.overdue === 6, "Overdue calculations are correct");
    expect(overview.summary.tasks.overdue === 6, "Completed Tasks with past due dates are not overdue");
    expect(overview.summary.tasks.overdue === 6, "Cancelled Tasks with past due dates are not overdue");

    // Due Soon: DueSoon1, DueSoon2 = 2
    expect(overview.summary.tasks.dueSoon === 2, "Due-soon calculations are correct");
    expect(overview.summary.tasks.dueSoon === 2, "Due-soon boundary behavior is correct (10-days later excluded)");

    // Completion Percentage:
    // completed(3) / (totalActive(18) - cancelled(4)) = 3 / 14 = ~21.4% -> 21%
    expect(overview.summary.tasks.completionPercentage === 21, "Completion percentage with normal tasks and cancelled tasks is correctly rounded");

    // Attention Tasks
    expect(overview.attentionTasks.length === 5, "Attention Tasks are limited to 5");
    
    // All 5 should be the earliest overdue tasks
    const attentionIsAllOverdue = overview.attentionTasks.every(t => t.dueDate && new Date(t.dueDate) < now);
    expect(attentionIsAllOverdue, "Attention Tasks prioritize overdue Tasks first");
    
    // Check sorting: should be ascending (earliest due dates first)
    const isAscending = overview.attentionTasks.every((t, i, arr) => {
      const prev = arr[i-1];
      if (!prev) return true;
      return new Date(t.dueDate!).getTime() >= new Date(prev.dueDate!).getTime();
    });
    expect(isAscending, "Attention Tasks are correctly ordered by dueDate ascending");

    const containsSoftDeletedOrArchived = overview.attentionTasks.some(t => t.title === "Overdue Archived" || t.title === "Deleted Task");
    expect(!containsSoftDeletedOrArchived, "Attention Tasks exclude soft-deleted and archived tasks");
    
    expect(!overview.attentionTasks.some(t => t.title === "User B Task"), "Attention Tasks are tenant-isolated");

    // Recent Projects
    expect(overview.recentProjects.length === 4, "Recent Projects are limited to 4");
    
    const recentOrder = overview.recentProjects.map(rp => rp.project.name);
    // Remember: p5 is most recent, then p4, p3, p2, p1
    expect(recentOrder[0] === "Active P5" && recentOrder[1] === "Active P4" && recentOrder[2] === "Active P3" && recentOrder[3] === "Active P2", "Recent Projects are correctly ordered by updatedAt desc");

    // Project Progress
    const p5Progress = overview.recentProjects.find(rp => rp.project.name === "Active P5")!.progress;
    expect(p5Progress.total === 4, "Project progress calculates total active tasks correctly");
    expect(p5Progress.completed === 1, "Project progress calculates completed tasks correctly");
    expect(p5Progress.completionPercentage === 33, "Project progress calculates completion percentage correctly (cancelled excluded from denom)");

    const p4Progress = overview.recentProjects.find(rp => rp.project.name === "Active P4")!.progress;
    expect(p4Progress.completionPercentage === 100, "100% completion handled correctly (1 done, 1 cancelled)");

    const p3Progress = overview.recentProjects.find(rp => rp.project.name === "Active P3")!.progress;
    expect(p3Progress.completionPercentage === 0, "Zero eligible Tasks returns 0% (only 1 cancelled task)");

    const p2Progress = overview.recentProjects.find(rp => rp.project.name === "Active P2")!.progress;
    expect(p2Progress.completionPercentage === 0, "Zero eligible Tasks returns 0% (0 tasks total)");

    // Test cross-tenant tasks in project progress
    // Manually push a User B task with P5's ID to see if it corrupts the calculation
    await Task.create({ owner: userB._id, projectId: p5._id, title: "Malicious Injection", status: "done" });
    const overviewAfterInjection = await getDashboardOverview(userA._id.toString());
    const p5ProgressAfter = overviewAfterInjection.recentProjects.find(rp => rp.project.name === "Active P5")!.progress;
    expect(p5ProgressAfter.total === 4 && p5ProgressAfter.completed === 1, "Cross-tenant tasks never affect Project progress");


    console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉");
    await teardownTestDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Test execution failed with error:", error);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
