import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import User from "../models/user.model.js";
import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspace-member.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import PlanDraft from "../models/plan-draft.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import ProjectRecommendation from "../models/project-recommendation.model.js";
import { provisionPersonalWorkspace } from "../services/workspace.service.js";

export interface MigrationSummary {
  usersProcessed: number;
  workspacesCreated: number;
  membersCreated: number;
  projectsMigrated: number;
  tasksMigrated: number;
  milestonesMigrated: number;
  planDraftsMigrated: number;
  projectMemoriesMigrated: number;
  projectRecommendationsMigrated: number;
}

export async function migrateWorkspacesAndTenants(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    usersProcessed: 0,
    workspacesCreated: 0,
    membersCreated: 0,
    projectsMigrated: 0,
    tasksMigrated: 0,
    milestonesMigrated: 0,
    planDraftsMigrated: 0,
    projectMemoriesMigrated: 0,
    projectRecommendationsMigrated: 0,
  };

  const users = await User.find({});
  summary.usersProcessed = users.length;

  for (const user of users) {
    const existingWsCount = await Workspace.countDocuments({ ownerId: user._id, isPersonal: true });
    const existingMemberCount = await WorkspaceMember.countDocuments({ userId: user._id });

    const provResult = await provisionPersonalWorkspace(user);
    const personalWorkspace = provResult.workspace;

    const newWsCount = await Workspace.countDocuments({ ownerId: user._id, isPersonal: true });
    const newMemberCount = await WorkspaceMember.countDocuments({ userId: user._id });

    if (existingWsCount === 0 && newWsCount > 0) {
      summary.workspacesCreated++;
    }
    if (existingMemberCount === 0 && newMemberCount > 0) {
      summary.membersCreated++;
    }

    const wsId = personalWorkspace._id;

    // Migrate Projects lacking workspaceId
    const projRes = await Project.updateMany(
      { owner: user._id, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
      { $set: { workspaceId: wsId } },
    );
    summary.projectsMigrated += projRes.modifiedCount;

    // Migrate Tasks lacking workspaceId
    const taskRes = await Task.updateMany(
      { owner: user._id, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
      { $set: { workspaceId: wsId } },
    );
    summary.tasksMigrated += taskRes.modifiedCount;

    // Migrate Milestones lacking workspaceId
    const msRes = await Milestone.updateMany(
      { owner: user._id, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
      { $set: { workspaceId: wsId } },
    );
    summary.milestonesMigrated += msRes.modifiedCount;

    // Migrate PlanDrafts lacking workspaceId
    const draftRes = await PlanDraft.updateMany(
      { owner: user._id, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
      { $set: { workspaceId: wsId } },
    );
    summary.planDraftsMigrated += draftRes.modifiedCount;

    // Migrate ProjectMemories lacking workspaceId
    const memRes = await ProjectMemory.updateMany(
      { owner: user._id, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
      { $set: { workspaceId: wsId } },
    );
    summary.projectMemoriesMigrated += memRes.modifiedCount;

    // Migrate ProjectRecommendations lacking workspaceId
    const recRes = await ProjectRecommendation.updateMany(
      { owner: user._id, $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }] },
      { $set: { workspaceId: wsId } },
    );
    summary.projectRecommendationsMigrated += recRes.modifiedCount;
  }

  return summary;
}

async function runStandaloneMigration() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai-project-manager";
  console.log(`🔌 Connecting to MongoDB for Phase 32 Workspace Migration: ${mongoUri}`);

  await mongoose.connect(mongoUri);
  console.log("🚀 Starting Phase 32 Idempotent Workspace & Member Migration...");

  const summary = await migrateWorkspacesAndTenants();

  console.log("\n==================================================");
  console.log("🎉 Phase 32 Migration Complete Summary:");
  console.log(`   - Users Processed: ${summary.usersProcessed}`);
  console.log(`   - Workspaces Created: ${summary.workspacesCreated}`);
  console.log(`   - Memberships Created: ${summary.membersCreated}`);
  console.log(`   - Projects Migrated: ${summary.projectsMigrated}`);
  console.log(`   - Tasks Migrated: ${summary.tasksMigrated}`);
  console.log(`   - Milestones Migrated: ${summary.milestonesMigrated}`);
  console.log(`   - Plan Drafts Migrated: ${summary.planDraftsMigrated}`);
  console.log(`   - Project Memories Migrated: ${summary.projectMemoriesMigrated}`);
  console.log(`   - Project Recommendations Migrated: ${summary.projectRecommendationsMigrated}`);
  console.log("==================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

// Execute if run directly via node/tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  runStandaloneMigration().catch((err) => {
    console.error("❌ Phase 32 Migration Failed:", err);
    process.exit(1);
  });
}
