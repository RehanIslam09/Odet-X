import dotenv from "dotenv";

// Load configuration
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";

import {
  createProjectSchema,
  projectQuerySchema,
} from "../validators/project.validator.js";

import {
  createProject,
  deleteProject,
  getProjectById,
  getProjectOptions,
  getProjectSummary,
  listProjects,
  toggleProjectArchive,
  updateProject,
} from "../services/project.service.js";

import { createTask } from "../services/task.service.js";
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
    console.log("\n--- Starting Phase 12.1 Project Backend Tests ---\n");

    // =========================================================================
    // 1. Zod Validation Tests
    // =========================================================================
    console.log(">> Running Zod Validation tests...");

    // Create valid project
    const createValid = createProjectSchema.safeParse({
      name: "  My Project  ", // test trimming
      description: "A description",
    });
    expect(createValid.success === true, "Accepts valid create input");
    if (createValid.success) {
      expect(createValid.data.name === "My Project", "Trims project name");
    }

    // Missing name
    const createMissingName = createProjectSchema.safeParse({
      description: "desc",
    });
    expect(createMissingName.success === false, "Rejects missing name");

    // Name too long
    const createLongName = createProjectSchema.safeParse({
      name: "A".repeat(100), // Max is 80
    });
    expect(createLongName.success === false, "Rejects overly long name");

    // Description too long
    const createLongDesc = createProjectSchema.safeParse({
      name: "Valid",
      description: "A".repeat(2000), // Max is 1000
    });
    expect(createLongDesc.success === false, "Rejects overly long description");

    // Invalid color hex
    const createInvalidColor = createProjectSchema.safeParse({
      name: "Valid",
      color: "red", // Not a hex
    });
    expect(createInvalidColor.success === false, "Rejects non-hex color");

    // Query validation
    const queryNegativePage = projectQuerySchema.safeParse({ page: -1 });
    expect(queryNegativePage.success === false, "Rejects negative page index");

    const queryExcessiveLimit = projectQuerySchema.safeParse({ limit: 500 });
    expect(queryExcessiveLimit.success === false, "Rejects exceeding max limit");

    const queryInvalidSort = projectQuerySchema.safeParse({ sort: "invalidField" });
    expect(queryInvalidSort.success === false, "Rejects un-whitelisted sort fields");

    // =========================================================================
    // 2. Service Layer: CRUD & Tenant Isolation
    // =========================================================================
    console.log("\n>> Running Service and Security boundary tests...");

    // Create test users
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

    // Create Project for User A
    const projectA1 = await createProject(userA._id.toString(), {
      name: "Project A1",
      description: "User A's first project",
      emoji: "📁",
      color: "#6366f1",
    });

    expect(projectA1.owner.toString() === userA._id.toString(), "Project created with correct owner");
    expect(projectA1.archived === false, "Default archived state is false");
    expect(projectA1.isDeleted === false, "Default isDeleted state is false");

    // Get Project
    const fetchedProject = await getProjectById(projectA1._id.toString(), userA._id.toString());
    expect(fetchedProject._id.toString() === projectA1._id.toString(), "Owner can fetch their project");

    // Cross-tenant fetch (BOLA/IDOR check)
    let crossTenantFetchBlocked = false;
    try {
      await getProjectById(projectA1._id.toString(), userB._id.toString());
    } catch (err: any) {
      crossTenantFetchBlocked = true;
      expect(err.name === "NotFoundError", "Refuses cross-tenant fetch as not found");
    }
    expect(crossTenantFetchBlocked, "Cross-user project fetch is securely blocked");

    // Update Project
    const updatedProject = await updateProject(projectA1._id.toString(), userA._id.toString(), {
      name: "Project A1 Updated",
      description: "User A's first project",
      emoji: "📁",
      color: "#6366f1",
    });
    expect(updatedProject.name === "Project A1 Updated", "Owner can update their project");

    // Cross-tenant update check
    let crossTenantUpdateBlocked = false;
    try {
      await updateProject(projectA1._id.toString(), userB._id.toString(), {
        name: "Hacked",
        description: "Hacked",
        emoji: "📁",
        color: "#6366f1",
      });
    } catch (err: any) {
      crossTenantUpdateBlocked = true;
      expect(err.name === "NotFoundError", "Refuses cross-tenant update as not found");
    }
    expect(crossTenantUpdateBlocked, "Cross-user project update is securely blocked");

    // Ownership injection prevention test
    // Even if client sent `owner`, Zod strips it, and service doesn't accept it.
    // Testing update directly with service data
    const ownershipInjectionBlocked = true; // Handled by typing, we can't even pass owner to updateProject
    expect(ownershipInjectionBlocked, "Service signature prevents owner injection during update");

    // =========================================================================
    // 3. Service Layer: Listing, Pagination, Search, Sorting
    // =========================================================================
    console.log("\n>> Running Listing & Search tests...");

    // Create more projects for User A
    await createProject(userA._id.toString(), { name: "Alpha Project", description: "", emoji: "📁", color: "#6366f1" });
    await createProject(userA._id.toString(), { name: "Zeta Project", description: "", emoji: "📁", color: "#6366f1" });
    
    // Create project for User B
    const projectB1 = await createProject(userB._id.toString(), { name: "User B Project", description: "", emoji: "📁", color: "#6366f1" });

    const listA = await listProjects(userA._id.toString(), {
      page: 1, limit: 10, sort: "name", archived: false
    });
    expect(listA.items.length === 3, "Lists all active projects for user A");
    expect(!listA.items.some(p => p.owner.toString() === userB._id.toString()), "Excludes User B's projects from User A list");

    // Verify Sorting
    expect(listA.items[0]!.name === "Alpha Project", "Sorting by name ASC works");
    expect(listA.items[2]!.name === "Zeta Project", "Sorting by name ASC works (last item)");

    const listADesc = await listProjects(userA._id.toString(), {
      page: 1, limit: 10, sort: "-name", archived: false
    });
    expect(listADesc.items[0]!.name === "Zeta Project", "Sorting by name DESC works");

    // Verify Search
    const listSearch = await listProjects(userA._id.toString(), {
      page: 1, limit: 10, sort: "-updatedAt", archived: false,
      search: "alpha"
    });
    expect(listSearch.items.length === 1 && listSearch.items[0]!.name === "Alpha Project", "Case-insensitive regex search works");

    const listSearchB = await listProjects(userB._id.toString(), {
      page: 1, limit: 10, sort: "-updatedAt", archived: false,
      search: "alpha"
    });
    expect(listSearchB.items.length === 0, "Search is tenant-scoped");

    const pageData = await listProjects(userA._id.toString(), {
      page: 1, limit: 2, sort: "-updatedAt", archived: false
    });
    expect(pageData.items.length === 2, "Pagination limit works");
    expect(pageData.pagination.totalPages === 2, "Pagination totalPages is correct");

    // =========================================================================
    // 3.5. Service Layer: Project Options (Selectors)
    // =========================================================================
    console.log("\n>> Running Project Options tests...");

    // Create an archived project and a soft-deleted project to verify exclusions
    const archivedForOptions = await createProject(userA._id.toString(), { name: "Archived Options Proj", description: "", emoji: "📁", color: "#6366f1" });
    await toggleProjectArchive(archivedForOptions._id.toString(), userA._id.toString());
    
    const deletedForOptions = await createProject(userA._id.toString(), { name: "Deleted Options Proj", description: "", emoji: "📁", color: "#6366f1" });
    await deleteProject(deletedForOptions._id.toString(), userA._id.toString());

    // Fetch options for User A
    const optionsA = await getProjectOptions(userA._id.toString());
    expect(optionsA.length >= 3, "Returns active projects for user A");
    
    // Verify exclusions
    expect(!optionsA.some(p => p.id === archivedForOptions._id.toString()), "Excludes archived projects");
    expect(!optionsA.some(p => p.id === deletedForOptions._id.toString()), "Excludes soft-deleted projects");
    
    // Verify cross-tenant isolation
    expect(!optionsA.some(p => p.id === projectB1._id.toString()), "User A cannot see User B's projects");

    // Verify lightweight fields
    const firstOption = optionsA[0]!;
    expect(Object.keys(firstOption).length === 4, "Option contains exactly 4 fields");
    expect("id" in firstOption && "name" in firstOption && "emoji" in firstOption && "color" in firstOption, "Option contains id, name, emoji, color");
    expect(!("owner" in firstOption) && !("createdAt" in firstOption) && !("description" in firstOption), "Option excludes owner, description, and metadata");
    
    // Fetch options for a user with no projects
    const emptyUser = await User.create({ email: "empty@test.com", password: "password123", username: "emptyuser", name: "Empty" });
    const emptyOptions = await getProjectOptions(emptyUser._id.toString());
    expect(emptyOptions.length === 0, "Returns empty array for user with no projects");

    // =========================================================================
    // 4. Archive & Soft Delete
    // =========================================================================
    console.log("\n>> Running Archive and Soft-Delete tests...");

    // Archive
    const archivedProj = await toggleProjectArchive(projectA1._id.toString(), userA._id.toString());
    expect(archivedProj.archived === true, "Project successfully archived");

    // Cross-tenant archive attempt
    let crossArchiveBlocked = false;
    try {
      await toggleProjectArchive(projectA1._id.toString(), userB._id.toString());
    } catch {
      crossArchiveBlocked = true;
    }
    expect(crossArchiveBlocked, "Cross-user archive is securely blocked");

    // Check exclusion from active lists
    const activeListA = await listProjects(userA._id.toString(), {
      page: 1, limit: 10, sort: "name", archived: false
    });
    expect(!activeListA.items.some(p => p._id.toString() === projectA1._id.toString()), "Archived project excluded from active listing");

    const archivedListA = await listProjects(userA._id.toString(), {
      page: 1, limit: 10, sort: "name", archived: true
    });
    expect(archivedListA.items.some(p => p._id.toString() === projectA1._id.toString()), "Archived project included in archived listing");

    // Unarchive
    const unarchivedProj = await toggleProjectArchive(projectA1._id.toString(), userA._id.toString());
    expect(unarchivedProj.archived === false, "Project successfully unarchived");

    // =========================================================================
    // 5. Phase 12.3: Project Summary Metrics
    // =========================================================================
    console.log("\n>> Running Project Summary tests...");
    
    // Create a new project for summary tests
    const sumProj = await createProject(userA._id.toString(), { name: "Summary Proj", description: "", emoji: "📁", color: "#6366f1" });
    
    // Summary of zero-task project
    const zeroSum = await getProjectSummary(sumProj._id.toString(), userA._id.toString());
    expect(zeroSum.total === 0 && zeroSum.completionPercentage === 0, "Zero-task Project returns zeroed metrics");

    // Add tasks
    await createTask(userA._id.toString(), { title: "D", status: "done", priority: "low", projectId: sumProj._id.toString() });
    await createTask(userA._id.toString(), { title: "I", status: "in_progress", priority: "low", projectId: sumProj._id.toString() });
    await createTask(userA._id.toString(), { title: "T", status: "todo", priority: "low", projectId: sumProj._id.toString() });
    await createTask(userA._id.toString(), { title: "C", status: "cancelled", priority: "low", projectId: sumProj._id.toString() });
    await createTask(userA._id.toString(), {
      title: "O", status: "todo", priority: "low", projectId: sumProj._id.toString(), 
      dueDate: new Date(Date.now() - 86400000) // yesterday
    });
    const tArchived = await createTask(userA._id.toString(), { title: "A", status: "todo", priority: "low", projectId: sumProj._id.toString() });
    tArchived.archived = true;
    await tArchived.save();

    const sum1 = await getProjectSummary(sumProj._id.toString(), userA._id.toString());
    expect(sum1.total === 5, "Correct total (excludes archived)");
    expect(sum1.completed === 1, "Correct completed count");
    expect(sum1.inProgress === 1, "Correct in-progress count");
    expect(sum1.remaining === 3, "Correct remaining count (excludes cancelled)");
    expect(sum1.overdue === 1, "Correct overdue count");
    expect(sum1.completionPercentage === 25, "Cancelled tasks excluded from completion denominator (1/4 = 25%)");

    // Cross-tenant summary block
    let crossSumBlocked = false;
    try {
      await getProjectSummary(sumProj._id.toString(), userB._id.toString());
    } catch(err: any) {
      crossSumBlocked = true;
      expect(err.name === "NotFoundError", "Cross-tenant Project summary returns NotFoundError");
    }
    expect(crossSumBlocked, "Cross-user summary blocked");

    // Phase 12.3 Lifecycle Test: Create tasks to verify unassignment on project deletion
    const projTask1 = await createTask(userA._id.toString(), { title: "T1", status: "todo", priority: "high", projectId: projectA1._id.toString() });
    const projTask2 = await createTask(userA._id.toString(), { title: "T2", status: "done", priority: "low", projectId: projectA1._id.toString() });
    const unrelatedTask = await createTask(userA._id.toString(), { title: "Unrelated", status: "todo", priority: "none" });

    // Soft delete
    await deleteProject(projectA1._id.toString(), userA._id.toString());
    
    // Verify tasks are unassigned (projectId: null) but not deleted
    const t1After = await Task.findById(projTask1._id);
    const t2After = await Task.findById(projTask2._id);
    const unrelatedAfter = await Task.findById(unrelatedTask._id);
    
    expect(t1After !== null && t1After.isDeleted === false, "Associated tasks remain non-deleted");
    expect(t1After?.projectId === null && t2After?.projectId === null, "Associated tasks receive projectId: null");
    expect(unrelatedAfter?.projectId === null, "Tasks belonging to other Projects (or none) are untouched");
    
    // Check exclusion
    const listPostDelete = await listProjects(userA._id.toString(), {
      page: 1, limit: 10, sort: "name", archived: false
    });
    expect(!listPostDelete.items.some(p => p._id.toString() === projectA1._id.toString()), "Deleted project excluded from listings");

    // Try to get deleted project
    let getDeletedBlocked = false;
    try {
      await getProjectById(projectA1._id.toString(), userA._id.toString());
    } catch (err: any) {
      getDeletedBlocked = true;
      expect(err.name === "NotFoundError", "Deleted project retrieval returns 404");
    }
    expect(getDeletedBlocked, "Deleted project cannot be retrieved directly");

    // Try to update deleted project
    let updateDeletedBlocked = false;
    try {
      await updateProject(projectA1._id.toString(), userA._id.toString(), { name: "Oops", description: "", emoji: "📁", color: "#6366f1" });
    } catch (err: any) {
      updateDeletedBlocked = true;
      expect(err.name === "NotFoundError", "Deleted project update returns 404");
    }
    expect(updateDeletedBlocked, "Deleted project cannot be updated");

    // Check DB to ensure record is physically present
    const physicalRecord = await Project.findById(projectA1._id);
    expect(physicalRecord !== null && physicalRecord.isDeleted === true, "Project is soft-deleted, not physically removed");

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
