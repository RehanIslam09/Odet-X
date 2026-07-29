import { Types } from "mongoose";
import Project, { IProjectDocument } from "@/models/project.model.js";
import PlanDraft, { IPlanDraftDocument, IPlanDraftTask, IPlanDraftMilestone } from "@/models/plan-draft.model.js";
import { NotFoundError, BadRequestError } from "@/utils/app-error.js";
import { validatePlan, PlanTaskInput, PlanMilestoneInput } from "@/domain/plan-validator.js";
import { recordActivity } from "./activity.service.js";
import { ACTIVITY_TYPES } from "@/constants/activity.js";

/**
 * Asserts that the project exists, belongs to the authenticated user, is not soft-deleted,
 * and is not archived.
 */
async function assertActiveProjectForDraft(
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
    throw new BadRequestError("Cannot perform planning operations on an archived project.");
  }

  return project;
}

/**
 * Retrieves the currently active uncommitted PlanDraft for a project, if one exists and has not expired.
 */
export async function getActiveProjectPlanDraft(
  userId: string,
  projectId: string
): Promise<IPlanDraftDocument | null> {
  await assertActiveProjectForDraft(projectId, userId);

  const draft = await PlanDraft.findOne({
    owner: new Types.ObjectId(userId),
    projectId: new Types.ObjectId(projectId),
    status: "draft",
    expiresAt: { $gt: new Date() },
  });

  return draft;
}

/**
 * Retrieves a single PlanDraft by ID, verifying ownership and project scoping.
 */
export async function getProjectPlanDraft(
  userId: string,
  projectId: string,
  draftId: string
): Promise<IPlanDraftDocument> {
  const draft = await PlanDraft.findOne({
    _id: new Types.ObjectId(draftId),
    owner: new Types.ObjectId(userId),
    projectId: new Types.ObjectId(projectId),
  });

  if (!draft) {
    throw new NotFoundError("Draft plan not found.");
  }

  return draft;
}

/**
 * Updates an uncommitted PlanDraft's tasks and/or milestones after re-running validatePlan.
 */
export async function updateProjectPlanDraft(
  userId: string,
  projectId: string,
  draftId: string,
  payload: {
    tasks?: PlanTaskInput[];
    milestones?: PlanMilestoneInput[];
  }
): Promise<IPlanDraftDocument> {
  const project = await assertActiveProjectForDraft(projectId, userId);

  const draft = await PlanDraft.findOne({
    _id: new Types.ObjectId(draftId),
    owner: new Types.ObjectId(userId),
    projectId: new Types.ObjectId(projectId),
  });

  if (!draft) {
    throw new NotFoundError("Draft plan not found.");
  }

  if (draft.status === "committed") {
    throw new BadRequestError("Cannot edit an already committed draft plan.");
  }

  if (draft.status === "discarded") {
    throw new BadRequestError("Cannot edit a discarded draft plan.");
  }

  if (draft.status !== "draft") {
    throw new BadRequestError("Draft plan is not in an editable state.");
  }

  if (draft.expiresAt < new Date()) {
    throw new BadRequestError("Draft plan has expired.");
  }

  const tasksToValidate = payload.tasks !== undefined ? payload.tasks : draft.tasks;
  const milestonesToValidate = payload.milestones !== undefined ? payload.milestones : draft.milestones;

  const validated = validatePlan({
    tasks: tasksToValidate,
    milestones: milestonesToValidate,
  });

  if (project.workspaceId) {
    draft.workspaceId = project.workspaceId;
  }

  draft.tasks = validated.tasks as unknown as IPlanDraftTask[];
  draft.milestones = validated.milestones as unknown as IPlanDraftMilestone[];

  await draft.save();
  return draft;
}

/**
 * Discards an active PlanDraft by setting its status to 'discarded' and logging AI_PLAN_DISCARDED activity.
 */
export async function discardProjectPlanDraft(
  userId: string,
  projectId: string,
  draftId: string
): Promise<IPlanDraftDocument> {
  const project = await assertActiveProjectForDraft(projectId, userId);

  const draft = await PlanDraft.findOne({
    _id: new Types.ObjectId(draftId),
    owner: new Types.ObjectId(userId),
    projectId: new Types.ObjectId(projectId),
  });

  if (!draft) {
    throw new NotFoundError("Draft plan not found.");
  }

  if (draft.status === "committed") {
    throw new BadRequestError("Cannot discard an already committed draft plan.");
  }

  if (draft.status === "discarded") {
    return draft;
  }

  draft.status = "discarded";
  await draft.save();

  await recordActivity({
    owner: userId,
    actorId: userId,
    ...(project.workspaceId && { workspaceId: project.workspaceId.toString() }),
    type: ACTIVITY_TYPES.AI_PLAN_DISCARDED,
    entityType: "project",
    entityId: projectId,
    projectId,
    contextProjectIds: [projectId],
    taskId: null,
    metadata: {
      draftId: draft._id.toString(),
      taskCount: draft.tasks.length,
      milestoneCount: draft.milestones.length,
    },
  });

  return draft;
}
