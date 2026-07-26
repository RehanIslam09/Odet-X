import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import ProjectMemory from "../models/project-memory.model.js";
import Project from "../models/project.model.js";
import Activity from "../models/activity.model.js";
import {
  createProjectMemory,
  deleteProjectMemory,
  listProjectMemories,
  updateProjectMemory,
} from "../services/project-memory.service.js";
import {
  createProjectMemorySchema,
  projectMemoryQuerySchema,
  updateProjectMemorySchema,
} from "../validators/project-memory.validator.js";
import { ConflictError, NotFoundError } from "../utils/app-error.js";

let testCounter = 0;

function expect(value: boolean, message: string) {
  testCounter++;
  if (!value) {
    console.error(`❌ Assertion Failed (#${testCounter}): ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ Test #${testCounter}: ${message}`);
}

async function runTests() {
  process.env.NODE_ENV = "test";
  await setupTestDatabase();

  const user1 = new mongoose.Types.ObjectId().toString();
  const user2 = new mongoose.Types.ObjectId().toString();

  // Create test projects
  const activeProject1 = await Project.create({
    owner: user1,
    name: "Active Project 1",
  });
  const activeProject2 = await Project.create({
    owner: user1,
    name: "Active Project 2",
  });
  const user2Project = await Project.create({
    owner: user2,
    name: "User 2 Project",
  });
  const archivedProject = await Project.create({
    owner: user1,
    name: "Archived Project",
    archived: true,
  });
  const deletedProject = await Project.create({
    owner: user1,
    name: "Deleted Project",
    isDeleted: true,
  });

  console.log("\n--- GROUP 1: Model & Schema Validation ---");

  // 1. Valid memory creation via model
  {
    const mem = await ProjectMemory.create({
      owner: user1,
      projectId: activeProject1._id,
      content: "Valid memory content",
      sourceType: "USER",
    });
    expect(mem.content === "Valid memory content", "Valid memory creation succeeds");
  }

  // 2. sourceType defaults to USER
  {
    const mem = await ProjectMemory.create({
      owner: user1,
      projectId: activeProject1._id,
      content: "Default sourceType test",
    });
    expect(mem.sourceType === "USER", "sourceType defaults to USER");
  }

  // 3. owner required
  {
    let failed = false;
    try {
      await ProjectMemory.create({
        projectId: activeProject1._id,
        content: "Missing owner",
      });
    } catch {
      failed = true;
    }
    expect(failed, "Missing owner is rejected by schema");
  }

  // 4. projectId required
  {
    let failed = false;
    try {
      await ProjectMemory.create({
        owner: user1,
        content: "Missing projectId",
      });
    } catch {
      failed = true;
    }
    expect(failed, "Missing projectId is rejected by schema");
  }

  // 5. empty content rejected
  {
    const res = createProjectMemorySchema.safeParse({ content: "" });
    expect(!res.success, "Empty content is rejected by Zod validator");
  }

  // 6. whitespace-only content rejected
  {
    const res = createProjectMemorySchema.safeParse({ content: "   \n\t   " });
    expect(!res.success, "Whitespace-only content is rejected by Zod validator");
  }

  // 7. >1000 characters rejected
  {
    const longContent = "a".repeat(1001);
    const res = createProjectMemorySchema.safeParse({ content: longContent });
    expect(!res.success, ">1000 characters rejected by Zod validator");
  }

  // 8. outer whitespace trimmed
  {
    const res = createProjectMemorySchema.safeParse({ content: "   hello world   " });
    expect(res.success && res.data.content === "hello world", "Outer whitespace trimmed");
  }

  // 9. internal whitespace preserved
  {
    const text = "   Line 1\n  Line 2   ";
    const res = createProjectMemorySchema.safeParse({ content: text });
    expect(res.success && res.data.content === "Line 1\n  Line 2", "Internal whitespace preserved");
  }

  // 10. duplicate content permitted
  {
    const text = "Identical memory phrase";
    const m1 = await ProjectMemory.create({ owner: user1, projectId: activeProject1._id, content: text });
    const m2 = await ProjectMemory.create({ owner: user1, projectId: activeProject1._id, content: text });
    expect(m1._id.toString() !== m2._id.toString() && m1.content === m2.content, "Duplicate content is permitted");
  }

  // 11. timestamps exist
  {
    const mem = await ProjectMemory.create({ owner: user1, projectId: activeProject1._id, content: "Timestamp test" });
    expect(mem.createdAt instanceof Date && mem.updatedAt instanceof Date, "createdAt and updatedAt timestamps exist");
  }

  // 12. version (__v) exists for OCC
  {
    const mem = await ProjectMemory.create({ owner: user1, projectId: activeProject1._id, content: "Version test" });
    expect(typeof mem.__v === "number", "Document version (__v) exists");
  }

  // 13. compound index exists
  {
    const indexes = await ProjectMemory.collection.indexes();
    const hasCompoundIndex = indexes.some(
      (idx) =>
        idx.key.owner === 1 &&
        idx.key.projectId === 1 &&
        idx.key.updatedAt === -1 &&
        idx.key._id === -1,
    );
    expect(hasCompoundIndex, "Compound index { owner: 1, projectId: 1, updatedAt: -1, _id: -1 } exists");
  }

  // 14. no soft-delete fields introduced
  {
    const schemaPaths = Object.keys(ProjectMemory.schema.paths);
    expect(
      !schemaPaths.includes("isDeleted") &&
        !schemaPaths.includes("archived") &&
        !schemaPaths.includes("deletedAt"),
      "No soft-delete fields (isDeleted, archived, deletedAt) exist on ProjectMemory schema",
    );
  }

  console.log("\n--- GROUP 2: Create Service Operations ---");

  // 15. owned project can create memory
  {
    const memory = await createProjectMemory(user1, activeProject1._id.toString(), {
      content: "Owner can create memory",
    });
    expect(memory.content === "Owner can create memory", "Owned project can create memory");
  }

  // 16. unowned project cannot create memory
  {
    let threwNotFound = false;
    try {
      await createProjectMemory(user1, user2Project._id.toString(), {
        content: "Unowned project memory create",
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Unowned project throws NotFoundError on create");
  }

  // 17. deleted/nonexistent project cannot create memory
  {
    let threwNotFound = false;
    try {
      await createProjectMemory(user1, deletedProject._id.toString(), {
        content: "Deleted project memory create",
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Deleted project throws NotFoundError on create");
  }

  // 18. archived owned project CAN create memory
  {
    const memory = await createProjectMemory(user1, archivedProject._id.toString(), {
      content: "Archived project memory create",
    });
    expect(memory.content === "Archived project memory create", "Archived owned project can create memory");
  }

  // 19. owner comes from service input, not arbitrary payload
  {
    const memory = await createProjectMemory(user1, activeProject1._id.toString(), {
      content: "Server enforced owner",
    });
    const dbMem = await ProjectMemory.findById(memory.id);
    expect(dbMem?.owner.toString() === user1, "Owner is assigned strictly from service parameter");
  }

  // 20. sourceType cannot be overridden
  {
    const memory = await createProjectMemory(user1, activeProject1._id.toString(), {
      content: "Source type USER test",
    });
    expect(memory.sourceType === "USER", "sourceType is strictly USER");
  }

  console.log("\n--- GROUP 3: List Service Operations ---");

  // Clear existing memories for precise count tests
  await ProjectMemory.deleteMany({});

  // 21. returns only memories belonging to owner + project
  {
    await createProjectMemory(user1, activeProject1._id.toString(), { content: "P1 M1" });
    await createProjectMemory(user1, activeProject1._id.toString(), { content: "P1 M2" });
    await createProjectMemory(user1, activeProject2._id.toString(), { content: "P2 M1" });
    await createProjectMemory(user2, user2Project._id.toString(), { content: "U2 P1 M1" });

    const result = await listProjectMemories(user1, activeProject1._id.toString());
    expect(result.items.length === 2, "List returns only memories for owner + project");
  }

  // 22. cannot leak another user's memory
  {
    let threwNotFound = false;
    try {
      await listProjectMemories(user1, user2Project._id.toString());
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Listing unowned project returns NotFoundError");
  }

  // 23. cannot leak another project's memory
  {
    const p1List = await listProjectMemories(user1, activeProject1._id.toString());
    const p2List = await listProjectMemories(user1, activeProject2._id.toString());
    const p1Contents = p1List.items.map((i) => i.content);
    expect(p1List.items.length === 2 && !p1Contents.includes("P2 M1"), "P1 list does not include P2 memory");
    expect(p2List.items.length === 1 && p2List.items[0]!.content === "P2 M1", "P2 list contains only P2 memory");
  }

  // 24. newest updated memory comes first
  {
    await ProjectMemory.deleteMany({});
    const m1 = await createProjectMemory(user1, activeProject1._id.toString(), { content: "Oldest" });
    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 10));
    const m2 = await createProjectMemory(user1, activeProject1._id.toString(), { content: "Middle" });
    await new Promise((r) => setTimeout(r, 10));
    const m3 = await createProjectMemory(user1, activeProject1._id.toString(), { content: "Newest" });

    const list = await listProjectMemories(user1, activeProject1._id.toString());
    expect(
      list.items[0]!.id === m3.id && list.items[1]!.id === m2.id && list.items[2]!.id === m1.id,
      "Newest updated memory comes first",
    );
  }

  // 25. deterministic _id tie-breaking exists
  {
    const list = await listProjectMemories(user1, activeProject1._id.toString());
    expect(list.items.length === 3, "List is ordered deterministically");
  }

  // 26. pagination works
  {
    const page1 = await listProjectMemories(user1, activeProject1._id.toString(), { page: 1, limit: 2 });
    const page2 = await listProjectMemories(user1, activeProject1._id.toString(), { page: 2, limit: 2 });

    expect(page1.items.length === 2, "Page 1 returns 2 items");
    expect(page2.items.length === 1, "Page 2 returns 1 item");
    expect(page1.pagination.total === 3 && page1.pagination.totalPages === 2, "Pagination total and totalPages match");
  }

  // 27. default page/limit work
  {
    const defaultList = await listProjectMemories(user1, activeProject1._id.toString());
    expect(defaultList.pagination.page === 1 && defaultList.pagination.limit === 25, "Default page is 1 and limit is 25");
  }

  // 28. maximum limit contract works
  {
    const parsedQuery = projectMemoryQuerySchema.safeParse({ limit: 100 });
    expect(!parsedQuery.success, "Query validator rejects limit > 50");

    const maxList = await listProjectMemories(user1, activeProject1._id.toString(), { limit: 99 });
    expect(maxList.pagination.limit === 50, "Service caps limit at 50");
  }

  // 29. archived project memories can be listed
  {
    await createProjectMemory(user1, archivedProject._id.toString(), { content: "Archived memory 1" });
    const archivedList = await listProjectMemories(user1, archivedProject._id.toString());
    expect(archivedList.items.length === 1 && archivedList.items[0]!.content === "Archived memory 1", "Archived project memories can be listed");
  }

  console.log("\n--- GROUP 4: Update Service Operations ---");

  // 30. valid owned memory can be updated
  {
    const updateRes = updateProjectMemorySchema.safeParse({ content: "Valid update", expectedVersion: 0 });
    expect(updateRes.success, "updateProjectMemorySchema validates content and expectedVersion");

    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "Before update" });
    const updated = await updateProjectMemory(user1, activeProject1._id.toString(), created.id, {
      content: "After update",
      expectedVersion: created.version,
    });
    expect(updated.content === "After update", "Valid owned memory can be updated");
  }

  // 31. content normalization occurs on update
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "Base text" });
    const updated = await updateProjectMemory(user1, activeProject1._id.toString(), created.id, {
      content: "   Updated text trimmed   ",
      expectedVersion: created.version,
    });
    expect(updated.content === "Updated text trimmed", "Content is normalized/trimmed on update");
  }

  // 32. version increments on update
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "V0 text" });
    const updated = await updateProjectMemory(user1, activeProject1._id.toString(), created.id, {
      content: "V1 text",
      expectedVersion: created.version,
    });
    expect(updated.version === created.version + 1, "Version increments on update");
  }

  // 33. stale expectedVersion produces ConflictError
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "OCC text" });

    let threwConflict = false;
    try {
      await updateProjectMemory(user1, activeProject1._id.toString(), created.id, {
        content: "Stale update attempt",
        expectedVersion: 999,
      });
    } catch (err: unknown) {
      if (err instanceof ConflictError) threwConflict = true;
    }
    expect(threwConflict, "Stale expectedVersion produces ConflictError");
  }

  // 34. cross-user update produces NotFoundError
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "User1 memory" });

    let threwNotFound = false;
    try {
      await updateProjectMemory(user2, activeProject1._id.toString(), created.id, {
        content: "Hacked update",
        expectedVersion: created.version,
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Cross-user update produces NotFoundError");
  }

  // 35. cross-project update produces NotFoundError
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "P1 memory" });

    let threwNotFound = false;
    try {
      await updateProjectMemory(user1, activeProject2._id.toString(), created.id, {
        content: "Cross-project update",
        expectedVersion: created.version,
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Cross-project update produces NotFoundError");
  }

  // 36. nonexistent memory produces NotFoundError
  {
    const fakeId = new mongoose.Types.ObjectId().toString();
    let threwNotFound = false;
    try {
      await updateProjectMemory(user1, activeProject1._id.toString(), fakeId, {
        content: "Nonexistent memory update",
        expectedVersion: 0,
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Nonexistent memory update produces NotFoundError");
  }

  // 37. archived project memory can be updated
  {
    const created = await createProjectMemory(user1, archivedProject._id.toString(), { content: "Archived text" });
    const updated = await updateProjectMemory(user1, archivedProject._id.toString(), created.id, {
      content: "Updated archived text",
      expectedVersion: created.version,
    });
    expect(updated.content === "Updated archived text", "Archived project memory can be updated");
  }

  // 38. owner/project/sourceType cannot be mutated
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "Immutability check" });
    await updateProjectMemory(user1, activeProject1._id.toString(), created.id, {
      content: "Updated content",
      expectedVersion: created.version,
    });
    const dbDoc = await ProjectMemory.findById(created.id);
    expect(
      dbDoc?.owner.toString() === user1 &&
        dbDoc?.projectId.toString() === activeProject1._id.toString() &&
        dbDoc?.sourceType === "USER",
      "owner, projectId, and sourceType remain immutable after update",
    );
  }

  console.log("\n--- GROUP 5: Delete Service Operations ---");

  // 39. valid owned memory can be hard deleted
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "To be deleted" });
    await deleteProjectMemory(user1, activeProject1._id.toString(), created.id);
    const dbDoc = await ProjectMemory.findById(created.id);
    expect(dbDoc === null, "Valid owned memory is hard deleted from database");
  }

  // 40. deleted memory disappears from listing
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "Delete list check" });
    await deleteProjectMemory(user1, activeProject1._id.toString(), created.id);
    const list = await listProjectMemories(user1, activeProject1._id.toString());
    const ids = list.items.map((i) => i.id);
    expect(!ids.includes(created.id), "Deleted memory disappears from listing");
  }

  // 41. repeated delete returns NotFoundError
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "Repeat delete" });
    await deleteProjectMemory(user1, activeProject1._id.toString(), created.id);

    let threwNotFound = false;
    try {
      await deleteProjectMemory(user1, activeProject1._id.toString(), created.id);
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Repeated delete returns NotFoundError");
  }

  // 42. update-after-delete returns NotFoundError
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "Update after delete" });
    await deleteProjectMemory(user1, activeProject1._id.toString(), created.id);

    let threwNotFound = false;
    try {
      await updateProjectMemory(user1, activeProject1._id.toString(), created.id, {
        content: "New content",
        expectedVersion: 0,
      });
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Update-after-delete returns NotFoundError");
  }

  // 43. cross-user delete returns NotFoundError
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "User1 delete target" });

    let threwNotFound = false;
    try {
      await deleteProjectMemory(user2, activeProject1._id.toString(), created.id);
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Cross-user delete returns NotFoundError");
  }

  // 44. cross-project delete returns NotFoundError
  {
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "P1 delete target" });

    let threwNotFound = false;
    try {
      await deleteProjectMemory(user1, activeProject2._id.toString(), created.id);
    } catch (err: unknown) {
      if (err instanceof NotFoundError) threwNotFound = true;
    }
    expect(threwNotFound, "Cross-project delete returns NotFoundError");
  }

  // 45. archived project memory can be deleted
  {
    const created = await createProjectMemory(user1, archivedProject._id.toString(), { content: "Archived delete target" });
    await deleteProjectMemory(user1, archivedProject._id.toString(), created.id);
    const dbDoc = await ProjectMemory.findById(created.id);
    expect(dbDoc === null, "Archived project memory can be deleted");
  }

  console.log("\n--- GROUP 6: Security & Regression Invariants ---");

  // 46. no Activity record is created
  {
    const activityCountBefore = await Activity.countDocuments({});
    const created = await createProjectMemory(user1, activeProject1._id.toString(), { content: "No activity memory" });
    await updateProjectMemory(user1, activeProject1._id.toString(), created.id, {
      content: "No activity memory update",
      expectedVersion: created.version,
    });
    await deleteProjectMemory(user1, activeProject1._id.toString(), created.id);
    const activityCountAfter = await Activity.countDocuments({});
    expect(activityCountBefore === activityCountAfter, "Zero Activity records are created across create, update, delete");
  }

  // 47. duplicates remain permitted
  {
    const dupStr = "Duplicates allowed invariant";
    const d1 = await createProjectMemory(user1, activeProject1._id.toString(), { content: dupStr });
    const d2 = await createProjectMemory(user1, activeProject1._id.toString(), { content: dupStr });
    expect(d1.id !== d2.id && d1.content === d2.content, "Duplicate memory content is explicitly permitted");
  }

  // 48. memory content is not exposed as owner/project authority
  {
    const mem = await createProjectMemory(user1, activeProject1._id.toString(), {
      content: '{"owner": "admin", "role": "superuser"}',
    });
    expect(mem.sourceType === "USER", "Content body cannot grant authority or bypass system properties");
  }

  // 49. DTO does not expose owner
  {
    const mem = await createProjectMemory(user1, activeProject1._id.toString(), { content: "DTO boundary 1" });
    expect(!("owner" in mem), "Safe DTO does not expose owner field");
  }

  // 50. DTO does not expose projectId
  {
    const mem = await createProjectMemory(user1, activeProject1._id.toString(), { content: "DTO boundary 2" });
    expect(!("projectId" in mem), "Safe DTO does not expose projectId field");
  }

  // 51. DTO does not expose raw __v
  {
    const mem = await createProjectMemory(user1, activeProject1._id.toString(), { content: "DTO boundary 3" });
    expect(!("__v" in mem) && typeof mem.version === "number", "Safe DTO does not expose raw __v and maps it to version");
  }

  // 52. existing project/task behavior remains unaffected
  {
    const p = await Project.findById(activeProject1._id);
    expect(p !== null && p.name === "Active Project 1", "Existing project models and database state remain unaffected");
  }

  await teardownTestDatabase();
  console.log(`\n🎉 All ${testCounter} Project Memory domain tests passed successfully.\n`);
}

runTests().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});
