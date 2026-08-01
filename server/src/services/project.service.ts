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
import { createDomainEvent, domainEventBus } from "@/realtime/index.js";

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
 * Asserts that a project exists and belongs to the requesting user or target workspace.
 */
async function assertProjectOwnership(
  projectId: string,
  userId: string,
  workspaceId?: string,
): Promise<IProjectDocument> {
  const filter: Record<string, unknown> = {
    _id: projectId,
    isDeleted: false,
  };

  if (workspaceId && Types.ObjectId.isValid(workspaceId)) {
    filter.workspaceId = new Types.ObjectId(workspaceId);
  } else {
    filter.owner = new Types.ObjectId(userId);
  }

  const project = await Project.findOne(filter);

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
  data: Partial<CreateProjectDto> & { name: string; aiSummary?: any },
  explicitWorkspaceId?: string,
): Promise<IProjectDocument> {
  let targetWorkspaceId: Types.ObjectId;

  if (explicitWorkspaceId) {
    targetWorkspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else {
    const userDoc = await User.findById(userId);
    const personal = await provisionPersonalWorkspace({
      _id: new Types.ObjectId(userId),
      name: userDoc?.name || "User",
      username: userDoc?.username || "user",
    });
    targetWorkspaceId = personal.workspace._id;
  }

  const project = await Project.create({
    owner: new Types.ObjectId(userId),
    workspaceId: targetWorkspaceId,
    name: data.name.trim(),
    description: data.description?.trim() ?? "",
    emoji: data.emoji?.trim() ?? "??",
    color: data.color?.trim() ?? "#4F46E5",
    aiSummary: data.aiSummary ?? null,
  });

  await recordActivity({
    owner: userId,
    actorId: userId,
    workspaceId: targetWorkspaceId.toString(),
    type: ACTIVITY_TYPES.PROJECT_CREATED,
    entityType: "project",
    entityId: project._id.toString(),
    projectId: project._id.toString(),
    contextProjectIds: [project._id.toString()],
    metadata: {
      projectName: project.name,
    },
  });

  try {
    await domainEventBus.publish(
      createDomainEvent({
        type: "project.created",
        workspaceId: targetWorkspaceId.toString(),
        actorId: userId,
        resource: {
          type: "project",
          id: project._id.toString(),
          version: (project as any).__v ?? 0,
        },
        payload: {
          name: project.name,
        },
      }),
    );
  } catch (err) {
    console.error("[Project Service] Failed to publish project.created event:", err);
  }

  return project;
}

// ---------------------------------------------------------------------------
// Read (List with Filtering, Pagination, Sorting)
// ---------------------------------------------------------------------------

export async function listProjects(
  userId: string,
  query: ProjectQueryDto & Record<string, any>,
  explicitWorkspaceId?: string,
): Promise<PaginatedResult<IProjectDocument>> {
  let targetWorkspaceId: Types.ObjectId;

  if (explicitWorkspaceId) {
    targetWorkspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else {
    const userDoc = await User.findById(userId);
    const personal = await provisionPersonalWorkspace({
      _id: new Types.ObjectId(userId),
      name: userDoc?.name || "User",
      username: userDoc?.username || "user",
    });
    targetWorkspaceId = personal.workspace._id;
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 12;

  const filter: Record<string, unknown> = {
    workspaceId: targetWorkspaceId,
    isDeleted: false,
  };

  if (query.archived !== undefined) {
    filter.archived = query.archived;
  }

  if (query.search && query.search.trim().length > 0) {
    const searchRegex = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ name: searchRegex }, { description: searchRegex }];
  }

  let sortOption: Record<string, SortOrder> = { updatedAt: -1 };
  if (query.sort) {
    const rawSort = query.sort;
    const isDescending = rawSort.startsWith("-");
    const fieldName = isDescending ? rawSort.slice(1) : rawSort;
    sortOption = { [fieldName]: isDescending ? -1 : 1 };
  }

  const total = await Project.countDocuments(filter);
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;

  const items = await Project.find(filter)
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .exec();

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
  workspaceId?: string,
): Promise<IProjectDocument> {
  return assertProjectOwnership(projectId, userId, workspaceId);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateProject(
  projectId: string,
  userId: string,
  data: UpdateProjectDto,
  workspaceId?: string,
): Promise<IProjectDocument> {
  const project = await assertProjectOwnership(projectId, userId, workspaceId);

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

    try {
      const wsId = project.workspaceId ? project.workspaceId.toString() : workspaceId || "";
      if (wsId) {
        await domainEventBus.publish(
          createDomainEvent({
            type: "project.updated",
            workspaceId: wsId,
            actorId: userId,
            resource: {
              type: "project",
              id: project._id.toString(),
              version: (project as any).__v ?? 0,
            },
            payload: {
              name: project.name,
            },
          }),
        );
      }
    } catch (err) {
      console.error("[Project Service] Failed to publish project.updated event:", err);
    }
  }

  return project;
}

// ---------------------------------------------------------------------------
// Archive / Unarchive
// ---------------------------------------------------------------------------

export async function toggleProjectArchive(
  projectId: string,
  userId: string,
  workspaceId?: string,
): Promise<IProjectDocument> {
  const project = await assertProjectOwnership(projectId, userId, workspaceId);

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

  try {
    const wsId = project.workspaceId ? project.workspaceId.toString() : workspaceId || "";
    if (wsId) {
      await domainEventBus.publish(
        createDomainEvent({
          type: project.archived ? "project.archived" : "project.updated",
          workspaceId: wsId,
          actorId: userId,
          resource: {
            type: "project",
            id: project._id.toString(),
            version: (project as any).__v ?? 0,
          },
          payload: {
            archived: project.archived,
          },
        }),
      );
    }
  } catch (err) {
    console.error("[Project Service] Failed to publish project archive event:", err);
  }

  return project;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteProject(
  projectId: string,
  userId: string,
  workspaceId?: string,
): Promise<void> {
  const project = await assertProjectOwnership(projectId, userId, workspaceId);

  project.isDeleted = true;
  await project.save();

  // Unlink associated tasks so they become standalone tasks
  await Task.updateMany(
    { projectId: project._id, isDeleted: false },
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

  try {
    const wsId = project.workspaceId ? project.workspaceId.toString() : workspaceId || "";
    if (wsId) {
      await domainEventBus.publish(
        createDomainEvent({
          type: "project.deleted",
          workspaceId: wsId,
          actorId: userId,
          resource: {
            type: "project",
            id: project._id.toString(),
            version: (project as any).__v ?? 0,
          },
          payload: {
            projectId: project._id.toString(),
          },
        }),
      );
    }
  } catch (err) {
    console.error("[Project Service] Failed to publish project.deleted event:", err);
  }
}

// ---------------------------------------------------------------------------
// Options (Active Projects Minimal Select)
// ---------------------------------------------------------------------------

export async function getProjectOptions(
  userId: string,
  explicitWorkspaceId?: string,
): Promise<Array<{ id: string; name: string; emoji: string; color: string }>> {
  let targetWorkspaceId: Types.ObjectId;

  if (explicitWorkspaceId) {
    targetWorkspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else {
    const userDoc = await User.findById(userId);
    const personal = await provisionPersonalWorkspace({
      _id: new Types.ObjectId(userId),
      name: userDoc?.name || "User",
      username: userDoc?.username || "user",
    });
    targetWorkspaceId = personal.workspace._id;
  }

  const projects = await Project.find(
    { workspaceId: targetWorkspaceId, isDeleted: false, archived: false },
    { _id: 1, name: 1, emoji: 1, color: 1 },
  )
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
// AI Summary Read
// ---------------------------------------------------------------------------

export async function getProjectSummary(
  projectId: string,
  userId: string,
  workspaceId?: string,
): Promise<string> {
  const project = await assertProjectOwnership(projectId, userId, workspaceId);
  if (!project.aiSummary) {
    return "No AI summary generated for this project yet.";
  }
  if (typeof project.aiSummary === "string") {
    return project.aiSummary;
  }
  return (project.aiSummary as any).summary ?? "No AI summary generated for this project yet.";
}
