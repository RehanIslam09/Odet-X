import mongoose, { SortOrder, Types } from "mongoose";

import Project, { IProjectDocument } from "@/models/project.model.js";

import type {
  CreateProjectDto,
  ProjectQueryDto,
  UpdateProjectDto,
} from "@/validators/project.validator.js";

import { ForbiddenError, NotFoundError } from "@/utils/app-error.js";
import { recordActivity } from "@/services/activity.service.js";
import { ACTIVITY_TYPES } from "@/constants/activity.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Pagination envelope returned by list operations.
 * Typed generically so it can be reused by future domain services.
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Asserts that a project exists and belongs to the requesting user.
 *
 * Called before any mutating operation. Throws:
 * - `NotFoundError` if the project does not exist or is soft-deleted.
 * - `ForbiddenError` if the project exists but is owned by a different user.
 *
 * This two-step check is deliberate: returning 404 for an existing project
 * owned by another user prevents resource enumeration. An attacker cannot
 * distinguish "project does not exist" from "project exists but is not yours."
 */
async function assertProjectOwnership(
  projectId: string,
  userId: string,
): Promise<IProjectDocument> {
  const project = await Project.findOne({
    _id: projectId,
    owner: new Types.ObjectId(userId),
    isDeleted: false,
  });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  return project;
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/**
 * Returns a paginated, optionally filtered list of projects for a given user.
 *
 * All queries are scoped to `{ owner, isDeleted: false }`. A user can never
 * see another user's projects.
 *
 * Search:
 * - Case-insensitive regex on `name`. Simple and sufficient for low-to-medium
 *   project counts. When a workspace grows large enough to warrant it, this
 *   can be transparently replaced with a `$text` query or Atlas Search using
 *   the same API contract — the query param name and shape do not change.
 *
 * Sort:
 * - The `sort` param is pre-validated by Zod to be a whitelisted field.
 * - A leading `-` means descending; without it, ascending.
 *
 * Pagination:
 * - Uses `skip` + `limit`. Cursor-based pagination is more efficient at very
 *   large scale, but at project counts that justify a cursor approach, the
 *   workspace concept (not yet built) will have changed the query shape anyway.
 *   Revisit at that boundary.
 */
export async function listProjects(
  userId: string,
  query: ProjectQueryDto,
): Promise<PaginatedResult<IProjectDocument>> {
  const { page, limit, search, sort, archived } = query;

  // Base filter: always scoped to owner + not deleted
  const filter = {
    owner: new Types.ObjectId(userId),
    isDeleted: false,
    archived,
    ...(search
      ? { name: { $regex: escapeRegex(search), $options: "i" } }
      : {}),
  };

  // Parse sort string: "-updatedAt" → { updatedAt: -1 }, "name" → { name: 1 }
  const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
  const sortOrder: SortOrder = sort.startsWith("-") ? -1 : 1;
  const sortExpression: Record<string, SortOrder> = { [sortField]: sortOrder };

  const skip = (page - 1) * limit;

  // Execute count and find in parallel — both share the same filter.
  const [total, items] = await Promise.all([
    Project.countDocuments(filter),
    Project.find(filter).sort(sortExpression).skip(skip).limit(limit).exec(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

// ---------------------------------------------------------------------------
// Get One
// ---------------------------------------------------------------------------

/**
 * Retrieves a single project by ID, scoped to the requesting user.
 */
export async function getProjectById(
  projectId: string,
  userId: string,
): Promise<IProjectDocument> {
  return assertProjectOwnership(projectId, userId);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Creates a new project owned by the given user.
 *
 * The `owner` field is set server-side from the authenticated user —
 * it is never derived from the request body.
 */
export async function createProject(
  userId: string,
  data: CreateProjectDto,
): Promise<IProjectDocument> {
  const project = await Project.create({
    owner: new Types.ObjectId(userId),
    ...data,
  });

  await recordActivity({
    owner: userId,
    actorId: userId,
    type: ACTIVITY_TYPES.PROJECT_CREATED,
    entityType: "project",
    entityId: project._id.toString(),
    projectId: project._id.toString(),
    contextProjectIds: [project._id.toString()],
    metadata: {
      projectName: project.name,
    },
  });

  return project;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Applies a partial update to a project after verifying ownership.
 *
 * Immutable fields (`owner`, `isDeleted`, `archived`) are not exposed
 * through this operation. Archive is a separate, intentional action.
 */
export async function updateProject(
  projectId: string,
  userId: string,
  data: UpdateProjectDto,
): Promise<IProjectDocument> {
  const project = await assertProjectOwnership(projectId, userId);

  // Apply only the provided fields (partial update)
  let hasChanges = false;
  if (data.name !== undefined && data.name !== project.name) {
    project.name = data.name;
    hasChanges = true;
  }
  if (data.description !== undefined && data.description !== project.description) {
    project.description = data.description;
    hasChanges = true;
  }
  if (data.emoji !== undefined && data.emoji !== project.emoji) {
    project.emoji = data.emoji;
    hasChanges = true;
  }
  if (data.color !== undefined && data.color !== project.color) {
    project.color = data.color;
    hasChanges = true;
  }
  if (data.aiSummary !== undefined) {
    project.aiSummary = data.aiSummary;
    hasChanges = true;
  }

  await project.save();

  if (hasChanges) {
    await recordActivity({
      owner: userId,
      actorId: userId,
      type: ACTIVITY_TYPES.PROJECT_UPDATED,
      entityType: "project",
      entityId: project._id.toString(),
      projectId: project._id.toString(),
      contextProjectIds: [project._id.toString()],
      metadata: {
        projectName: project.name,
      },
    });
  }

  return project;
}

// ---------------------------------------------------------------------------
// Archive / Unarchive
// ---------------------------------------------------------------------------

/**
 * Toggles the `archived` flag on a project.
 *
 * Archive is a separate operation from update to make the UX intent clear:
 * archiving is a lifecycle transition, not a field edit. This also prevents
 * a partial update from accidentally archiving a project.
 *
 * Returns the updated project.
 */
export async function toggleProjectArchive(
  projectId: string,
  userId: string,
): Promise<IProjectDocument> {
  const project = await assertProjectOwnership(projectId, userId);

  project.archived = !project.archived;
  await project.save();

  await recordActivity({
    owner: userId,
    actorId: userId,
    type: project.archived ? ACTIVITY_TYPES.PROJECT_ARCHIVED : ACTIVITY_TYPES.PROJECT_RESTORED,
    entityType: "project",
    entityId: project._id.toString(),
    projectId: project._id.toString(),
    contextProjectIds: [project._id.toString()],
    metadata: {
      projectName: project.name,
    },
  });

  return project;
}

// ---------------------------------------------------------------------------
// Delete (soft)
// ---------------------------------------------------------------------------

/**
 * Soft-deletes a project by setting `isDeleted: true`.
 *
 * Hard deletion is never performed. The project record is retained so that:
 * 1. Historical activity and task context remains available for the AI Agent.
 * 2. Accidental deletion can be recovered by an admin if needed.
 *
 * A soft-deleted project disappears from all user-facing queries immediately.
 */
export async function deleteProject(
  projectId: string,
  userId: string,
): Promise<void> {
  const project = await assertProjectOwnership(projectId, userId);

  project.isDeleted = true;
  await project.save();

  // Phase 12.3: Lifecycle Policy - Unassign Tasks on Project Deletion
  // This operation is performed sequentially. Transactions are avoided 
  // to support standalone MongoDB deployments.
  const TaskModel = mongoose.model("Task");
  await TaskModel.updateMany(
    {
      projectId: project._id,
      owner: new Types.ObjectId(userId), // Strict security scope
      isDeleted: false,
    },
    {
      $set: { projectId: null },
    }
  );

  await recordActivity({
    owner: userId,
    actorId: userId,
    type: ACTIVITY_TYPES.PROJECT_DELETED,
    entityType: "project",
    entityId: project._id.toString(),
    projectId: project._id.toString(),
    contextProjectIds: [project._id.toString()],
    metadata: {
      projectName: project.name,
    },
  });
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Retrieves a lightweight, unpaginated list of active projects for dropdown selectors.
 * Excludes soft-deleted and archived projects.
 * Returns only id, name, emoji, and color.
 * Sorts alphabetically by name.
 */
export async function getProjectOptions(userId: string) {
  const ProjectModel = mongoose.model("Project");

  const projects = await ProjectModel.find(
    {
      owner: new Types.ObjectId(userId),
      isDeleted: false,
      archived: false,
    },
    // Projection: _id is included by default and mapped to id in the transform,
    // but we explicitly select the fields we need. owner and other fields are excluded.
    "name emoji color"
  )
    .sort({ name: 1 })
    .exec();

  // Mongoose documents need to be mapped to match the DTO expectations
  // We use the same toJSON transform to ensure consistent `id` mapping
  return projects.map((p) => {
    const doc = p.toJSON();
    return {
      id: doc.id,
      name: doc.name,
      emoji: doc.emoji,
      color: doc.color,
    };
  });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/**
 * Calculates real-time progress metrics for a project using MongoDB Aggregation.
 * Excludes soft-deleted and archived tasks from the LIVE workspace metrics.
 */
export async function getProjectSummary(
  projectId: string,
  userId: string,
) {
  // 1. Establish strict authorization boundary (404 on cross-tenant/non-existent)
  await assertProjectOwnership(projectId, userId);

  const TaskModel = mongoose.model("Task");
  
  // 2. Perform aggregation
  const summary = await TaskModel.aggregate([
    {
      // Efficiently uses existing index: { owner: 1, isDeleted: 1, archived: 1, projectId: 1, updatedAt: -1 }
      $match: {
        projectId: new Types.ObjectId(projectId),
        owner: new Types.ObjectId(userId),
        isDeleted: false,
        archived: false, // Live metrics exclude archived tasks
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$dueDate", null] },
                  { $lt: ["$dueDate", new Date()] },
                  { $ne: ["$status", "done"] },
                  { $ne: ["$status", "cancelled"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  // 3. Fallback for zero-task projects
  if (summary.length === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      remaining: 0,
      overdue: 0,
      completionPercentage: 0,
    };
  }

  // 4. Derived metrics (remaining and percentage)
  const s = summary[0];
  const remaining = s.total - s.completed - s.cancelled;
  const actionableTotal = s.total - s.cancelled;
  
  // Guard against divide-by-zero if all tasks are cancelled
  const completionPercentage = actionableTotal > 0 ? (s.completed / actionableTotal) * 100 : 0;

  return {
    total: s.total,
    completed: s.completed,
    inProgress: s.inProgress,
    remaining,
    overdue: s.overdue,
    completionPercentage: Math.round(completionPercentage),
  };
}
