import dotenv from "dotenv";
import { Types } from "mongoose";

dotenv.config();

import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspace-member.model.js";
import User from "../models/user.model.js";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  slugify,
} from "../validators/workspace.validator.js";
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
    // Ensure MongoDB indexes are built in memory server environment
    await Workspace.syncIndexes();
    await WorkspaceMember.syncIndexes();

    console.log("\n==================================================");
    console.log("▶ Phase 32 WP-01 — Workspace & WorkspaceMember Model Tests");
    console.log("==================================================\n");

    // Helper test user
    const testUser = await User.create({
      name: "Workspace Owner",
      email: "owner@workspace.test",
      username: "wsowner",
      password: "password123!",
    });

    const secondUser = await User.create({
      name: "Workspace Member",
      email: "member@workspace.test",
      username: "wsmember",
      password: "password123!",
    });

    // =========================================================================
    // 1. Workspace Model Core Functionality
    // =========================================================================
    console.log(">> 1. Workspace Model Creation & Defaults...");

    const ws1 = await Workspace.create({
      name: "Engineering Team",
      slug: "engineering-team",
      ownerId: testUser._id,
    });

    expect(ws1.name === "Engineering Team", "1. Valid workspace document can be created");
    expect(ws1.slug === "engineering-team", "Workspace slug persists correctly");
    expect(ws1.ownerId.toString() === testUser._id.toString(), "ownerId references owner user");
    expect(ws1.isPersonal === false, "isPersonal defaults to false");
    expect(ws1.createdAt instanceof Date, "createdAt timestamp exists");
    expect(ws1.updatedAt instanceof Date, "updatedAt timestamp exists");

    // =========================================================================
    // 2. Workspace Field Validations
    // =========================================================================
    console.log("\n>> 2. Workspace Field Constraints...");

    // Name required
    let nameMissingErr = false;
    try {
      await Workspace.create({
        slug: "no-name",
        ownerId: testUser._id,
      } as any);
    } catch {
      nameMissingErr = true;
    }
    expect(nameMissingErr, "2. Name field is required");

    // Name max length
    let nameLengthErr = false;
    try {
      await Workspace.create({
        name: "A".repeat(81),
        slug: "long-name",
        ownerId: testUser._id,
      });
    } catch {
      nameLengthErr = true;
    }
    expect(nameLengthErr, "3. Name maximum length (80) enforced");

    // Slug required
    let slugMissingErr = false;
    try {
      await Workspace.create({
        name: "No Slug",
        ownerId: testUser._id,
      } as any);
    } catch {
      slugMissingErr = true;
    }
    expect(slugMissingErr, "4. Slug field is required");

    // Slug lowercase normalization & character validation
    const uppercaseWs = await Workspace.create({
      name: "Uppercase Slug",
      slug: "UPPERCASE-SLUG",
      ownerId: testUser._id,
    });
    expect(uppercaseWs.slug === "uppercase-slug", "5. Slug is automatically normalized to lowercase");

    // Invalid slug character rejection
    let invalidSlugErr = false;
    try {
      await Workspace.create({
        name: "Invalid Slug",
        slug: "invalid_slug!",
        ownerId: testUser._id,
      });
    } catch {
      invalidSlugErr = true;
    }
    expect(invalidSlugErr, "6. Invalid slug characters rejected");

    // OwnerId required
    let ownerMissingErr = false;
    try {
      await Workspace.create({
        name: "No Owner",
        slug: "no-owner",
      } as any);
    } catch {
      ownerMissingErr = true;
    }
    expect(ownerMissingErr, "7. ownerId field is required");

    // =========================================================================
    // 3. Workspace Uniqueness Indexes
    // =========================================================================
    console.log("\n>> 3. Workspace Unique Indexes...");

    // Duplicate slug rejection
    let dupSlugErr = false;
    try {
      await Workspace.create({
        name: "Duplicate Slug Test",
        slug: "engineering-team",
        ownerId: testUser._id,
      });
    } catch {
      dupSlugErr = true;
    }
    expect(dupSlugErr, "11. Duplicate slug is rejected by unique index");

    // Multiple custom non-personal workspaces for same owner allowed
    const customWs2 = await Workspace.create({
      name: "Design Team",
      slug: "design-team",
      ownerId: testUser._id,
      isPersonal: false,
    });
    expect(customWs2 !== null, "12. One owner can create multiple non-personal workspaces");

    // First personal workspace for owner allowed
    const personalWs1 = await Workspace.create({
      name: "Owner's Personal Workspace",
      slug: "owner-personal",
      ownerId: testUser._id,
      isPersonal: true,
    });
    expect(personalWs1.isPersonal === true, "First personal workspace created for owner");

    // Second personal workspace for SAME owner rejected by partial unique index
    let dupPersonalErr = false;
    try {
      await Workspace.create({
        name: "Second Personal Workspace",
        slug: "owner-personal-2",
        ownerId: testUser._id,
        isPersonal: true,
      });
    } catch {
      dupPersonalErr = true;
    }
    expect(dupPersonalErr, "13. Same owner CANNOT create two personal workspaces (partial unique index)");

    // =========================================================================
    // 4. WorkspaceMember Model Core & Validations
    // =========================================================================
    console.log("\n>> 4. WorkspaceMember Model & Indexes...");

    const member1 = await WorkspaceMember.create({
      workspaceId: ws1._id,
      userId: secondUser._id,
      role: "MEMBER",
    });

    expect(member1.workspaceId.toString() === ws1._id.toString(), "14. Valid membership document created");
    expect(member1.userId.toString() === secondUser._id.toString(), "userId assigned correctly");
    expect(member1.role === "MEMBER", "17/19. MEMBER role accepted and assigned");
    expect(member1.joinedAt instanceof Date, "21. joinedAt defaults to Date");
    expect(member1.createdAt instanceof Date, "23. Timestamps exist on WorkspaceMember");

    // Default role test
    const ownerMember = await WorkspaceMember.create({
      workspaceId: ws1._id,
      userId: testUser._id,
      role: "OWNER",
    });
    expect(ownerMember.role === "OWNER", "18. OWNER role accepted");

    // Unsupported role rejection
    let invalidRoleErr = false;
    try {
      await WorkspaceMember.create({
        workspaceId: customWs2._id,
        userId: secondUser._id,
        role: "ADMIN" as any,
      });
    } catch {
      invalidRoleErr = true;
    }
    expect(invalidRoleErr, "20. Unsupported role ('ADMIN') rejected");

    // Duplicate membership rejection
    let dupMemberErr = false;
    try {
      await WorkspaceMember.create({
        workspaceId: ws1._id,
        userId: secondUser._id,
        role: "MEMBER",
      });
    } catch {
      dupMemberErr = true;
    }
    expect(dupMemberErr, "22. Duplicate { workspaceId, userId } membership rejected by unique index");

    // =========================================================================
    // 5. Workspace Zod Validators (Zod)
    // =========================================================================
    console.log("\n>> 5. Workspace Zod Validators...");

    // Create workspace validator pass
    const validCreate = createWorkspaceSchema.safeParse({
      name: "Product Team",
      slug: "product-team",
    });
    expect(validCreate.success === true, "24. Valid create workspace input accepted");

    // Helper slugify test
    expect(slugify("Product Team 2026!") === "product-team-2026", "slugify helper normalizes display string");

    // Invalid create workspace (empty name)
    const invalidName = createWorkspaceSchema.safeParse({
      name: "  ",
    });
    expect(invalidName.success === false, "25. Invalid name (empty) rejected by createWorkspaceSchema");

    // Invalid create workspace (bad slug chars)
    const invalidSlug = createWorkspaceSchema.safeParse({
      name: "Test Workspace",
      slug: "invalid_slug!",
    });
    expect(invalidSlug.success === false, "26. Invalid slug rejected by createWorkspaceSchema");

    // Mass assignment prevention (server-controlled fields stripped/ignored)
    const massAssignInput = createWorkspaceSchema.parse({
      name: "Security Test",
      slug: "security-test",
      ownerId: new Types.ObjectId().toString(),
      isPersonal: true,
      role: "OWNER",
    } as any);
    expect((massAssignInput as any).ownerId === undefined, "27. Client cannot inject ownerId");
    expect((massAssignInput as any).isPersonal === undefined, "27. Client cannot inject isPersonal");

    // Update workspace validator
    const validUpdate = updateWorkspaceSchema.safeParse({
      name: "Updated Product Team",
    });
    expect(validUpdate.success === true, "28. Valid update workspace input accepted");

    const emptyUpdate = updateWorkspaceSchema.safeParse({});
    expect(emptyUpdate.success === false, "29. Empty update payload rejected by updateWorkspaceSchema");

    console.log("\n==================================================");
    console.log("🎉 ALL WP-01 WORKSPACE TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================\n");

    await teardownTestDatabase();
    process.exit(0);
  } catch (err) {
    console.error("❌ Workspace Test Failed:", err);
    await teardownTestDatabase();
    process.exit(1);
  }
}

runTests();
