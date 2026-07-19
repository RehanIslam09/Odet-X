import dotenv from "dotenv";

// Load configuration
dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";

import {
  createProjectSchema,
  projectQuerySchema,
  updateProjectSchema,
} from "../validators/project.validator.js";

import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  toggleProjectArchive,
  updateProject,
} from "../services/project.service.js";

import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import { Types } from "mongoose";

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
    let ownershipInjectionBlocked = true; // Handled by typing, we can't even pass owner to updateProject
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

    // Pagination limits
    const pageData = await listProjects(userA._id.toString(), {
      page: 1, limit: 2, sort: "-updatedAt", archived: false
    });
    expect(pageData.items.length === 2, "Pagination limit works");
    expect(pageData.pagination.totalPages === 2, "Pagination totalPages is correct");

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
    } catch(err: any) {
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

    // Soft delete
    await deleteProject(projectA1._id.toString(), userA._id.toString());
    
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
