import { SortOrder, Types } from "mongoose";

import Project, { IProjectDocument } from "@/models/project.model.js";
import Task from "@/models/task.model.js";
import User from "@/models/user.model.js";
import { provisionPersonalWorkspace } from "@/services/workspace.service.js";

import type {
  CreateProjectDto,
  ProjectQueryDto,
  UpdateProjectDto,
} from "@/validators/project.validator.js";

import { NotFoundError } from "@/utils/app-error.js";
import { recordActivity } from "@/services/activity.service.js";
import { ACTIVITY_TYPES } from "@/constants/activity.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
// Create
// ---------------------------------------------------------------------------

/**
 * Creates a new project document anchored to the creator user and their target workspace.
 */
export async function createProject(
  userId: string,
  data: Partial<CreateProjectDto> & { name: string },
  explicitWorkspaceId?: string,
): Promise<IProjectDocument> {
  let targetWorkspaceId: Types.ObjectId;

  if (explicitWorkspaceId) {
    targetWorkspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else {
    const userDoc = await User.findById(userId);
    const personal = await provisionPersonalWorkspace({
      _id: userId,
      name: userDoc?.name || "User",
      username: userDoc?.username || "user",
    });
    targetWorkspaceId = personal.workspace._id as Types.ObjectId;
  }

  const project = await Project.create({
    owner: new Types.ObjectId(userId),
    workspaceId: targetWorkspaceId,
    name: data.name,
    description: data.description ?? "",
    emoji: data.emoji ?? "📁",
    color: data.color ?? "#6366f1",
  });

  await recordActivity({
    owner: userId,
    actorId: userId,
    ...(project.workspaceId && { workspaceId: project.workspaceId.toString() }),
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
// Read (List)
// ---------------------------------------------------------------------------

export async function listProjects(
  userId: string,
  query: ProjectQueryDto,
  explicitWorkspaceId?: string,
): Promise<PaginatedResult<IProjectDocument>> {
  const { page, limit, search, archived, sort, sortBy, sortOrder } = query as any;

  let targetWorkspaceId: Types.ObjectId;
  if (explicitWorkspaceId) {
    targetWorkspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else {
    const userDoc = await User.findById(userId);
    const personal = await provisionPersonalWorkspace({
      _id: userId,
      name: userDoc?.name || "User",
      username: userDoc?.username || "user",
    });
    targetWorkspaceId = personal.workspace._id as Types.ObjectId;
  }

  const filter: Record<string, unknown> = {
    owner: new Types.ObjectId(userId),
    workspaceId: targetWorkspaceId,
    isDeleted: false,
  };

  if (archived !== undefined) {
    filter.archived = archived;
  } else {
    filter.archived = false;
  }

  if (search && search.trim().length > 0) {
    filter.name = {
      $regex: escapeRegex(search.trim()),
      $options: "i",
    };
  }

  let sortField = sortBy;
  let sortDirection: SortOrder = sortOrder === "asc" ? 1 : -1;

  if (sort && typeof sort === "string") {
    if (sort.startsWith("-")) {
      sortField = sort.slice(1);
      sortDirection = -1;
    } else {
      sortField = sort;
      sortDirection = 1;
    }
  }

  sortField = sortField || "updatedAt";
  const sortExpression: Record<string, SortOrder> = { [sortField]: sortDirection };

  const skip = (page - 1) * limit;

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
// Read (Single)
// ---------------------------------------------------------------------------

export async function getProjectById(
  projectId: string,
  userId: string,
): Promise<IProjectDocument> {
  return assertProjectOwnership(projectId, userId);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateProject(
  projectId: string,
  userId: string,
  data: UpdateProjectDto,
): Promise<IProjectDocument> {
  const project = await assertProjectOwnership(projectId, userId);

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
      ...(project.workspaceId && { workspaceId: project.workspaceId.toString() }),
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
    ...(project.workspaceId && { workspaceId: project.workspaceId.toString() }),
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
// Delete
// ---------------------------------------------------------------------------

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const project = await assertProjectOwnership(projectId, userId);

  project.isDeleted = true;
  await project.save();

  // Unlink associated tasks so they become standalone tasks
  await Task.updateMany(
    { projectId: project._id, owner: new Types.ObjectId(userId) },
    { $set: { projectId: null } },
  );

  await recordActivity({
    owner: userId,
    actorId: userId,
    ...(project.workspaceId && { workspaceId: project.workspaceId.toString() }),
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

export async function getProjectOptions(
  userId: string,
  explicitWorkspaceId?: string,
): Promise<{ id: string; name: string; emoji: string; color: string }[]> {
  let targetWorkspaceId: Types.ObjectId;
  if (explicitWorkspaceId) {
    targetWorkspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else {
    const userDoc = await User.findById(userId);
    const personal = await provisionPersonalWorkspace({
      _id: userId,
      name: userDoc?.name || "User",
      username: userDoc?.username || "user",
    });
    targetWorkspaceId = personal.workspace._id as Types.ObjectId;
  }

  const projects = await Project.find({
    owner: new Types.ObjectId(userId),
    workspaceId: targetWorkspaceId,
    isDeleted: false,
    archived: false,
  })
    .select("_id name emoji color")
    .sort({ name: 1 })
    .exec();

  return projects.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    emoji: p.emoji,
    color: p.color,
  }));
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export async function getProjectSummary(
  projectId: string,
  userId: string,
): Promise<string> {
  const project = await assertProjectOwnership(projectId, userId);
  if (!project.aiSummary) {
    return "No AI summary generated for this project yet.";
  }
  if (typeof project.aiSummary === "string") {
    return project.aiSummary;
  }
  return (project.aiSummary as any).summary || "No AI summary generated for this project yet.";
}
