import { Types } from "mongoose";
import Project, { IProjectDocument } from "@/models/project.model.js";
import Task, { ITaskDocument } from "@/models/task.model.js";
import Milestone, { IMilestoneDocument } from "@/models/milestone.model.js";
import PlanDraft from "@/models/plan-draft.model.js";
import { NotFoundError, BadRequestError, ConflictError } from "@/utils/app-error.js";
import { validatePlan } from "@/domain/plan-validator.js";
import { recordActivity } from "./activity.service.js";
import { ACTIVITY_TYPES } from "@/constants/activity.js";

export interface CommitPlanResult {
  draftId: string;
  projectId: string;
  taskCount: number;
  milestoneCount: number;
  tasks: Array<Partial<ITaskDocument>>;
  milestones: Array<Partial<IMilestoneDocument>>;
}

/**
 * Asserts that the target project exists, is owned by the user, is not soft-deleted,
 * and is not archived.
 */
async function assertActiveProjectForCommit(
  projectId: string,
  userId: string
): Promise<IProjectDocument> {
  const project = await Project.findOne({
    _id: new Types.ObjectId(projectId),
    owner: new Types.ObjectId(userId),
    isDeleted: false,
  });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  if (project.archived) {
    throw new BadRequestError("Cannot commit a plan for an archived project.");
  }

  return project;
}

/**
 * Safely commits a validated PlanDraft into permanent Milestone and Task documents.
 *
 * Safety Invariants:
 * 1. Re-verifies project existence, non-archival, and ownership.
 * 2. Re-verifies draft ownership, status === "draft", and non-expiration.
 * 3. Re-runs validatePlan for 100% structural and DAG cycle validity.
 * 4. Allocates all permanent ObjectIds server-side before reference translation.
 * 5. Dry-runs schema validations prior to database writes.
 * 6. Executes controlled writes with precise compensating cleanup (targets only allocated ObjectIds)
 *    to preserve atomic all-or-cleaned-up safety on standalone MongoDB instances.
 * 7. Transitions draft status to 'committed' and logs AI_PLAN_COMMITTED activity.
 */
export async function commitPlan(
  userId: string,
  projectId: string,
  draftId: string
): Promise<CommitPlanResult> {
  // 1. Project Re-verification
  await assertActiveProjectForCommit(projectId, userId);

  // 2. Draft Authorization & Expiration Verification
  const draft = await PlanDraft.findOne({
    _id: new Types.ObjectId(draftId),
    owner: new Types.ObjectId(userId),
    projectId: new Types.ObjectId(projectId),
  });

  if (!draft) {
    throw new NotFoundError("Draft plan not found.");
  }

  if (draft.status === "committed") {
    throw new BadRequestError("Draft plan has already been committed.");
  }

  if (draft.status === "discarded") {
    throw new BadRequestError("Cannot commit a discarded draft plan.");
  }

  if (draft.status !== "draft") {
    throw new BadRequestError("Draft plan is not in a committable state.");
  }

  if (draft.expiresAt < new Date()) {
    throw new BadRequestError("Draft plan has expired.");
  }

  // 3. Re-validate Plan (DAG & Reference Integrity)
  const validatedPlan = validatePlan({
    tasks: draft.tasks,
    milestones: draft.milestones,
  });

  // 4. Server-Side ObjectId Allocation & In-Memory Document Translation
  const milestoneMap = new Map<string, Types.ObjectId>();
  const taskMap = new Map<string, Types.ObjectId>();

  // Pass 1: Allocate milestone ObjectIds
  for (const ms of validatedPlan.milestones) {
    milestoneMap.set(ms.tempId, new Types.ObjectId());
  }

  // Pass 2: Allocate task ObjectIds
  for (const t of validatedPlan.tasks) {
    taskMap.set(t.tempId, new Types.ObjectId());
  }

  // Pass 3: Construct Milestones
  const userObjId = new Types.ObjectId(userId);
  const projectObjId = new Types.ObjectId(projectId);

  const milestonesToInsert = validatedPlan.milestones.map((ms) => ({
    _id: milestoneMap.get(ms.tempId)!,
    owner: userObjId,
    projectId: projectObjId,
    title: ms.title,
    description: ms.description || "",
    targetDate: ms.targetDate,
    position: ms.position,
    isDeleted: false,
  }));

  // Pass 4: Translate Task dependencies & milestone assignments
  const tasksToInsert = validatedPlan.tasks.map((t) => {
    const translatedDeps = t.dependencies.map((depTempId) => {
      const depObjectId = taskMap.get(depTempId);
      if (!depObjectId) {
        throw new BadRequestError(`Unresolved task dependency reference '${depTempId}'.`);
      }
      return depObjectId;
    });

    let translatedMilestoneId: Types.ObjectId | null = null;
    if (t.milestoneTempId) {
      const msObjectId = milestoneMap.get(t.milestoneTempId);
      if (!msObjectId) {
        throw new BadRequestError(`Unresolved milestone reference '${t.milestoneTempId}'.`);
      }
      translatedMilestoneId = msObjectId;
    }

    return {
      _id: taskMap.get(t.tempId)!,
      owner: userObjId,
      projectId: projectObjId,
      title: t.title,
      description: t.description || "",
      status: "todo" as const,
      priority: t.priority || "none",
      estimatedTime: t.estimatedTime || null,
      position: t.position,
      dependencies: translatedDeps,
      milestoneId: translatedMilestoneId,
      labels: [],
      completedAt: null,
      archived: false,
      isDeleted: false,
    };
  });

  // 5. In-Memory Pre-Commit Schema Dry-Run Validation
  for (const msData of milestonesToInsert) {
    const msDoc = new Milestone(msData);
    await msDoc.validate();
  }

  for (const taskData of tasksToInsert) {
    const taskDoc = new Task(taskData);
    await taskDoc.validate();
  }

  // 6. Controlled Writes & Compensating Cleanup Strategy
  const allocatedTaskIds = Array.from(taskMap.values());
  const allocatedMilestoneIds = Array.from(milestoneMap.values());

  let milestonesInserted = false;
  let tasksInserted = false;

  try {
    if (milestonesToInsert.length > 0) {
      await Milestone.insertMany(milestonesToInsert, { ordered: true });
      milestonesInserted = true;
    }

    if (tasksToInsert.length > 0) {
      await Task.insertMany(tasksToInsert, { ordered: true });
      tasksInserted = true;
    }

    // Transition draft status to 'committed' (atomic conditional update)
    const updatedDraft = await PlanDraft.findOneAndUpdate(
      { _id: draft._id, status: "draft" },
      { $set: { status: "committed" } },
      { returnDocument: "after" }
    );

    if (!updatedDraft) {
      throw new ConflictError("Draft plan status changed or was committed concurrently.");
    }

    // 7. Record AI_PLAN_COMMITTED Activity
    await recordActivity({
      owner: userId,
      actorId: userId,
      type: ACTIVITY_TYPES.AI_PLAN_COMMITTED,
      entityType: "project",
      entityId: projectId,
      projectId,
      contextProjectIds: [projectId],
      taskId: null,
      metadata: {
        draftId: draft._id.toString(),
        committedTaskCount: tasksToInsert.length,
        committedMilestoneCount: milestonesToInsert.length,
      },
    });

    return {
      draftId: draft._id.toString(),
      projectId,
      taskCount: tasksToInsert.length,
      milestoneCount: milestonesToInsert.length,
      tasks: tasksToInsert,
      milestones: milestonesToInsert,
    };
  } catch (error) {
    // COMPENSATING CLEANUP: Precise cleanup targeting ONLY the pre-allocated IDs from this attempt
    if (tasksInserted && allocatedTaskIds.length > 0) {
      await Task.deleteMany({ _id: { $in: allocatedTaskIds }, owner: userObjId });
    }
    if (milestonesInserted && allocatedMilestoneIds.length > 0) {
      await Milestone.deleteMany({ _id: { $in: allocatedMilestoneIds }, owner: userObjId });
    }

    // Ensure draft status is NOT reverted if another process already committed it
    if (!(error instanceof ConflictError)) {
      await PlanDraft.updateOne({ _id: draft._id, status: { $ne: "committed" } }, { $set: { status: "draft" } });
    }

    throw error;
  }
}
