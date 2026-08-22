import mongoose from "mongoose";
import Workspace from "@/models/workspace.model.js";

export interface MigrationOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export interface MigrationResult {
  success: boolean;
  totalExamined: number;
  totalMigrated: number;
  indexesDropped: string[];
  indexesCreated: string[];
  dryRun: boolean;
  errors: string[];
}

/**
 * Migration Script: Upgrades legacy Workspace documents to Workspace Platform V2.
 *
 * Operations:
 * 1. Sets `type = "PERSONAL"`, `isDefault = true` for legacy `isPersonal = true` workspaces.
 * 2. Sets `type = "TEAM"`, `isDefault = false` for legacy `isPersonal = false` workspaces.
 * 3. Ensures `status = "ACTIVE"` and `deletedAt = null` for active documents.
 * 4. Drops legacy index `ownerId_1_isPersonal_1`.
 * 5. Syncs V2 index `ownerId_1_isDefault_1`.
 */
export async function migrateWorkspacesV2(
  options: MigrationOptions = {},
): Promise<MigrationResult> {
  const dryRun = options.dryRun ?? false;
  const verbose = options.verbose ?? true;

  const result: MigrationResult = {
    success: true,
    totalExamined: 0,
    totalMigrated: 0,
    indexesDropped: [],
    indexesCreated: [],
    dryRun,
    errors: [],
  };

  if (verbose) {
    console.log("\n==================================================");
    console.log(`🚀 Starting Workspace V2 Database Migration ${dryRun ? "[DRY RUN MODE]" : ""}`);
    console.log("==================================================\n");
  }

  try {
    const workspaces = await Workspace.find({});
    result.totalExamined = workspaces.length;

    for (const ws of workspaces) {
      const docAny = ws.toObject() as unknown as Record<string, unknown>;
      const rawIsPersonal = docAny.isPersonal ?? false;
      const currentType = docAny.type;
      const currentIsDefault = docAny.isDefault;

      let needsUpdate = false;
      const updates: Record<string, unknown> = {};

      // 1. Determine & assign `type`
      if (!currentType) {
        updates.type = rawIsPersonal ? "PERSONAL" : "TEAM";
        needsUpdate = true;
      }

      // 2. Determine & assign `isDefault`
      if (currentIsDefault === undefined || currentIsDefault === null) {
        updates.isDefault = Boolean(rawIsPersonal);
        needsUpdate = true;
      }

      // 3. Ensure `status` field exists
      if (!docAny.status) {
        updates.status = "ACTIVE";
        needsUpdate = true;
      }

      if (needsUpdate) {
        if (verbose) {
          console.log(
            `  • Workspace [${ws._id}] "${ws.name}" (${ws.slug}): -> Setting ${JSON.stringify(updates)}`,
          );
        }

        if (!dryRun) {
          await Workspace.updateOne({ _id: ws._id }, { $set: updates });
        }
        result.totalMigrated++;
      }
    }

    // 4. Index Migration
    if (!dryRun && mongoose.connection.db) {
      const collection = mongoose.connection.db.collection("workspaces");
      const indexes = await collection.indexes();

      // Drop legacy index if it exists
      const legacyIndex = indexes.find((idx) => idx.name === "ownerId_1_isPersonal_1");
      if (legacyIndex) {
        if (verbose) console.log("  • Dropping legacy index 'ownerId_1_isPersonal_1'...");
        await collection.dropIndex("ownerId_1_isPersonal_1");
        result.indexesDropped.push("ownerId_1_isPersonal_1");
      }

      // Sync new V2 indexes
      if (verbose) console.log("  • Syncing V2 indexes (ownerId_1_isDefault_1)...");
      await Workspace.syncIndexes();
      result.indexesCreated.push("ownerId_1_isDefault_1");
    }

    if (verbose) {
      console.log("\n==================================================");
      console.log(`✅ Migration Finished: Examined ${result.totalExamined}, Migrated ${result.totalMigrated}`);
      console.log("==================================================\n");
    }
  } catch (err: unknown) {
    result.success = false;
    const errMsg = (err as Error).message || String(err);
    result.errors.push(errMsg);
    if (verbose) {
      console.error("❌ Migration Failed Error:", errMsg);
    }
  }

  return result;
}

// Runnable script CLI entry point
if (process.argv[1]?.includes("migrate-v2-workspaces")) {
  const isDryRun = process.argv.includes("--dry-run");
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-project-manager";

  mongoose
    .connect(mongoUri)
    .then(async () => {
      await migrateWorkspacesV2({ dryRun: isDryRun, verbose: true });
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration CLI connection error:", err);
      process.exit(1);
    });
}
