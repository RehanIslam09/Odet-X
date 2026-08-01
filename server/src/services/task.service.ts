import { SortOrder, Types } from "mongoose";

import Project, { IProjectDocument } from "@/models/project.model.js";
import Task, { ITaskDocument } from "@/models/task.model.js";
import User from "@/models/user.model.js";
import WorkspaceMember from "@/models/workspace-member.model.js";
import { provisionPersonalWorkspace } from "@/services/workspace.service.js";
import { Permission } from "@/constants/permissions.js";
import { PermissionEngine, AuthContext } from "@/domain/permission-evaluator.js";

import type {
  CreateTaskDto,
  TaskQueryDto,
  UpdateTaskDto,
} from "@/validators/task.validator.js";

import { ConflictError, NotFoundError } from "@/utils/app-error.js";
import { BaseActivityPayload, recordActivities, recordActivity } from "@/services/activity.service.js";
import { ACTIVITY_TYPES } from "@/constants/activity.js";
import { createDomainEvent, domainEventBus } from "@/realtime/index.js";

import type { PaginatedResult } from "./project.service.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function validateProjectOwnership(
  projectId: Types.ObjectId,
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

async function assertTaskOwnership(
  taskId: string,
  userId: string,
  workspaceId?: string,
): Promise<ITaskDocument> {
  const filter: Record<string, unknown> = {
    _id: taskId,
    isDeleted: false,
  };

  if (workspaceId && Types.ObjectId.isValid(workspaceId)) {
    filter.workspaceId = new Types.ObjectId(workspaceId);
  } else {
    filter.owner = new Types.ObjectId(userId);
  }

  const task = await Task.findOne(filter);

  if (!task) {
    throw new NotFoundError("Task not found.");
  }

  return task;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createTask(
  userId: string,
  data: CreateTaskDto & { dependencies?: string[]; position?: number; milestoneId?: string | null; notes?: string; assigneeId?: string | null },
  explicitWorkspaceId?: string,
): Promise<ITaskDocument> {
  let targetWorkspaceId: Types.ObjectId;

  if (explicitWorkspaceId) {
    targetWorkspaceId = new Types.ObjectId(explicitWorkspaceId);
  } else if (data.projectId) {
    const projDoc = await Project.findById(data.projectId);
    if (projDoc && projDoc.workspaceId) {
      const member = await WorkspaceMember.findOne({
        workspaceId: projDoc.workspaceId,
        userId: new Types.ObjectId(userId),
      });
      if (member || projDoc.owner.toString() === userId) {
        targetWorkspaceId = projDoc.workspaceId;
      } else {
        const userDoc = await User.findById(userId);
        const personal = await provisionPersonalWorkspace({
          _id: new Types.ObjectId(userId),
          name: userDoc?.name || "User",
          username: userDoc?.username || "user",
        });
        targetWorkspaceId = personal.workspace._id;
      }
    } else {
      const userDoc = await User.findById(userId);
      const personal = await provisionPersonalWorkspace({
        _id: new Types.ObjectId(userId),
        name: userDoc?.name || "User",
        username: userDoc?.username || "user",
      });
      targetWorkspaceId = personal.workspace._id;
    }
  } else {
    const userDoc = await User.findById(userId);
    const personal = await provisionPersonalWorkspace({
      _id: new Types.ObjectId(userId),
      name: userDoc?.name || "User",
      username: userDoc?.username || "user",
    });
    targetWorkspaceId = personal.workspace._id;
  }

  let validatedProjectId: Types.ObjectId | null = null;
  if (data.projectId) {
    const project = await validateProjectOwnership(
      new Types.ObjectId(data.projectId),
      userId,
      targetWorkspaceId.toString(),
    );
    validatedProjectId = project._id;
  }

  const dependencyIds: Types.ObjectId[] = [];
  if (data.dependencies && data.dependencies.length > 0) {
    const uniqueDepStrings = Array.from(new Set(data.dependencies));
    for (const depIdStr of uniqueDepStrings) {
      if (!Types.ObjectId.isValid(depIdStr)) {
        throw new NotFoundError("One or more dependency tasks were not found.");
      }
      const depTask = await Task.findOne({
        _id: depIdStr,
        workspaceId: targetWorkspaceId,
        isDeleted: false,
      });

      if (!depTask) {
        throw new NotFoundError("One or more dependency tasks were not found.");
      }
      dependencyIds.push(depTask._id);
    }
  }

  const task = await Task.create({
    owner: new Types.ObjectId(userId),
    workspaceId: targetWorkspaceId,
    projectId: validatedProjectId,
    assigneeId: data.assigneeId ? new Types.ObjectId(data.assigneeId) : null,
    watcherIds: [new Types.ObjectId(userId)],
    title: data.title.trim(),
    description: data.description?.trim() ?? "",
    notes: data.notes ?? "",
    status: data.status ?? "todo",
    priority: data.priority ?? "none",
    dueDate: data.dueDate ?? null,
    estimatedTime: data.estimatedTime?.trim() ?? null,
    labels: data.labels ?? [],
    dependencies: dependencyIds,
    position: data.position ?? 1,
    milestoneId: data.milestoneId ? new Types.ObjectId(data.milestoneId) : null,
  });

  await recordActivity({
    owner: userId,
    actorId: userId,
    workspaceId: targetWorkspaceId.toString(),
    type: ACTIVITY_TYPES.TASK_CREATED,
    entityType: "task",
    entityId: task._id.toString(),
    taskId: task._id.toString(),
    ...(task.projectId && { projectId: task.projectId.toString(), contextProjectIds: [task.projectId.toString()] }),
    metadata: {
      taskTitle: task.title,
    },
  });

  try {
    await domainEventBus.publish(
      createDomainEvent({
        type: "task.created",
        workspaceId: targetWorkspaceId.toString(),
        actorId: userId,
        resource: {
          type: "task",
          id: task._id.toString(),
          version: (task as any).__v ?? 0,
        },
        payload: {
          projectId: task.projectId ? task.projectId.toString() : null,
          title: task.title,
        },
      }),
    );
  } catch (err) {
    console.error("[Task Service] Failed to publish task.created event:", err);
  }

  return task;
}

// ---------------------------------------------------------------------------
// Read (Single Task)
// ---------------------------------------------------------------------------

export async function getTaskById(
  taskId: string,
  userId: string,
  workspaceId?: string,
): Promise<ITaskDocument> {
  return assertTaskOwnership(taskId, userId, workspaceId);
}

// ---------------------------------------------------------------------------
// Read (List with Filtering, Pagination, Sorting)
// ---------------------------------------------------------------------------

export async function listTasks(
  userId: string,
  query: TaskQueryDto & Record<string, any>,
  explicitWorkspaceId?: string,
): Promise<PaginatedResult<ITaskDocument>> {
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
  const limit = query.limit ?? 10;

  const filter: Record<string, unknown> = {
    workspaceId: targetWorkspaceId,
    isDeleted: false,
    archived: query.archived ?? false,
  };

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  if (query.priority && query.priority !== "all") {
    filter.priority = query.priority;
  }

  if (query.projectId && query.projectId !== "all") {
    filter.projectId = new Types.ObjectId(query.projectId);
  }

  if (query.search && query.search.trim().length > 0) {
    const searchRegex = new RegExp(escapeRegex(query.search.trim()), "i");
    filter.$or = [{ title: searchRegex }, { description: searchRegex }, { labels: searchRegex }];
  }

  if (query.quickFilter) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (query.quickFilter) {
      case "my-tasks":
        filter.$or = [
          { owner: new Types.ObjectId(userId) },
          { assigneeId: new Types.ObjectId(userId) },
        ];
        break;

      case "due-today":
        filter.dueDate = { $gte: startOfToday, $lte: endOfToday };
        filter.status = { $ne: "done" };
        break;

      case "overdue":
        filter.dueDate = { $lt: startOfToday };
        filter.status = { $ne: "done" };
        break;

      case "completed":
        filter.status = "done";
        break;
    }
  }

  let sortOption: Record<string, SortOrder> = { updatedAt: -1 };
  if (query.sort) {
    const rawSort = query.sort;
    const isDescending = rawSort.startsWith("-");
    const fieldName = isDescending ? rawSort.slice(1) : rawSort;
    sortOption = { [fieldName]: isDescending ? -1 : 1 };
  }

  const total = await Task.countDocuments(filter);
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;

  const items = await Task.find(filter)
    .select("-notes")
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
// Update
// ---------------------------------------------------------------------------

export async function updateTask(
  taskId: string,
  userId: string,
  data: UpdateTaskDto & { dependencies?: string[]; position?: number; milestoneId?: string | null; notes?: string; assigneeId?: string | null },
  workspaceId?: string,
): Promise<ITaskDocument> {
  const task = await assertTaskOwnership(taskId, userId, workspaceId);
  const events: BaseActivityPayload[] = [];
  let genericUpdate = false;

  const baseEvent = {
    owner: userId,
    actorId: userId,
    ...(task.workspaceId && { workspaceId: task.workspaceId.toString() }),
    entityType: "task" as const,
    entityId: task._id.toString(),
    taskId: task._id.toString(),
    ...(task.projectId && { projectId: task.projectId.toString(), contextProjectIds: [task.projectId.toString()] }),
  };

  if (data.title !== undefined && data.title !== task.title) {
    task.title = data.title;
    genericUpdate = true;
  }
  if (data.description !== undefined && data.description !== task.description) {
    task.description = data.description;
    genericUpdate = true;
  }
  if (data.notes !== undefined && data.notes !== task.notes) {
    task.notes = data.notes;
    genericUpdate = true;
  }

  if (data.assigneeId !== undefined) {
    const newAssignee = data.assigneeId ? new Types.ObjectId(data.assigneeId) : null;
    if (String(newAssignee) !== String(task.assigneeId)) {
      task.assigneeId = newAssignee;
      if (newAssignee) {
        if (!task.watcherIds) task.watcherIds = [];
        if (!task.watcherIds.some((w) => w.toString() === newAssignee.toString())) {
          task.watcherIds.push(newAssignee);
        }
      }
      events.push({
        ...baseEvent,
        type: ACTIVITY_TYPES.TASK_UPDATED,
        metadata: { assigneeId: data.assigneeId },
      });
    }
  }

  if (data.status !== undefined && data.status !== task.status) {
    const oldStatus = task.status;
    task.status = data.status;

    events.push({
      ...baseEvent,
      type: ACTIVITY_TYPES.TASK_STATUS_CHANGED,
      metadata: { fromStatus: oldStatus, toStatus: data.status },
    });
  }

  if (data.priority !== undefined && data.priority !== task.priority) {
    const oldPriority = task.priority;
    task.priority = data.priority;
    events.push({
      ...baseEvent,
      type: ACTIVITY_TYPES.TASK_PRIORITY_CHANGED,
      metadata: { fromPriority: oldPriority, toPriority: data.priority },
    });
  }

  if (data.dueDate !== undefined) {
    const newTime = data.dueDate ? data.dueDate.getTime() : null;
    const oldTime = task.dueDate ? task.dueDate.getTime() : null;
    if (newTime !== oldTime) {
      task.dueDate = data.dueDate;
      events.push({
        ...baseEvent,
        type: ACTIVITY_TYPES.TASK_UPDATED,
        metadata: { dueDate: data.dueDate ? data.dueDate.toISOString() : null },
      });
    }
  }

  if (data.projectId !== undefined) {
    const newProjId = data.projectId ? new Types.ObjectId(data.projectId) : null;
    const oldProjId = task.projectId ? task.projectId.toString() : null;
    const targetProjStr = newProjId ? newProjId.toString() : null;

    if (targetProjStr !== oldProjId) {
      let fromProjectName: string | null = null;
      let toProjectName: string | null = null;

      if (task.projectId) {
        const oldProj = await Project.findById(task.projectId).select("name").lean();
        fromProjectName = oldProj ? oldProj.name : null;
      }

      if (newProjId) {
        const proj = await validateProjectOwnership(newProjId, userId, workspaceId);
        task.projectId = proj._id;
        toProjectName = proj.name;
      } else {
        task.projectId = null;
      }

      const contextProjectIds = Array.from(
        new Set([oldProjId, targetProjStr].filter((id): id is string => Boolean(id)))
      );

      events.push({
        ...baseEvent,
        type: ACTIVITY_TYPES.TASK_PROJECT_CHANGED,
        contextProjectIds,
        metadata: {
          fromProjectId: oldProjId,
          toProjectId: targetProjStr,
          fromProjectName,
          toProjectName,
        },
      });
    }
  }

  if (data.dependencies !== undefined) {
    const uniqueDepStrings = Array.from(new Set(data.dependencies));
    const targetWorkspace = task.workspaceId || (await Project.findById(task.projectId))?.workspaceId;

    const dependencyIds: Types.ObjectId[] = [];
    for (const depIdStr of uniqueDepStrings) {
      if (depIdStr === task._id.toString()) {
        throw new ConflictError("A task cannot depend on itself.");
      }
      if (!Types.ObjectId.isValid(depIdStr)) {
        throw new NotFoundError("One or more dependency tasks were not found.");
      }

      const depTask = await Task.findOne({
        _id: depIdStr,
        ...(targetWorkspace ? { workspaceId: targetWorkspace } : { owner: new Types.ObjectId(userId) }),
        isDeleted: false,
      });

      if (!depTask) {
        throw new NotFoundError("One or more dependency tasks were not found.");
      }
      dependencyIds.push(depTask._id);
    }

    task.dependencies = dependencyIds;
    genericUpdate = true;
  }

  if (data.estimatedTime !== undefined && data.estimatedTime !== task.estimatedTime) {
    task.estimatedTime = data.estimatedTime;
    genericUpdate = true;
  }

  if (data.labels !== undefined) {
    task.labels = data.labels;
    genericUpdate = true;
  }

  if (data.position !== undefined && data.position !== task.position) {
    task.position = data.position;
    genericUpdate = true;
  }

  if (data.milestoneId !== undefined) {
    task.milestoneId = data.milestoneId ? new Types.ObjectId(data.milestoneId) : null;
    genericUpdate = true;
  }

  await task.save();

  if (genericUpdate && events.length === 0) {
    events.push({
      ...baseEvent,
      type: ACTIVITY_TYPES.TASK_UPDATED,
      metadata: { taskTitle: task.title },
    });
  }

  if (events.length > 0) {
    await recordActivities(events);
  }

  try {
    const wsId = task.workspaceId ? task.workspaceId.toString() : workspaceId || "";
    if (wsId) {
      await domainEventBus.publish(
        createDomainEvent({
          type: "task.updated",
          workspaceId: wsId,
          actorId: userId,
          resource: {
            type: "task",
            id: task._id.toString(),
            version: (task as any).__v ?? 0,
          },
          payload: {
            projectId: task.projectId ? task.projectId.toString() : null,
            status: task.status,
            priority: task.priority,
          },
        }),
      );
    }
  } catch (err) {
    console.error("[Task Service] Failed to publish task.updated event:", err);
  }

  return task;
}

export async function updateTaskNotes(
  taskId: string,
  userId: string,
  notesOrDto: string | { notes: string; expectedVersion?: number },
  workspaceId?: string,
): Promise<ITaskDocument> {
  const task = await assertTaskOwnership(taskId, userId, workspaceId);

  const notesText = typeof notesOrDto === "string" ? notesOrDto : notesOrDto.notes;
  const expectedVersion = typeof notesOrDto === "string" ? undefined : notesOrDto.expectedVersion;

  if (expectedVersion !== undefined && (task as any).__v !== expectedVersion) {
    throw new ConflictError("Task has been modified by another request.");
  }

  task.notes = notesText;
  await task.save();

  try {
    const wsId = task.workspaceId ? task.workspaceId.toString() : workspaceId || "";
    if (wsId) {
      await domainEventBus.publish(
        createDomainEvent({
          type: "task.updated",
          workspaceId: wsId,
          actorId: userId,
          resource: {
            type: "task",
            id: task._id.toString(),
            version: (task as any).__v ?? 0,
          },
          payload: {
            changedFields: ["notes"],
          },
        }),
      );
    }
  } catch (err) {
    console.error("[Task Service] Failed to publish task.updated notes event:", err);
  }

  return task;
}

export async function toggleTaskArchive(
  taskId: string,
  userId: string,
  workspaceId?: string,
): Promise<ITaskDocument> {
  const task = await assertTaskOwnership(taskId, userId, workspaceId);
  task.archived = !task.archived;
  await task.save();

  await recordActivity({
    owner: userId,
    actorId: userId,
    ...(task.workspaceId && { workspaceId: task.workspaceId.toString() }),
    type: task.archived ? ACTIVITY_TYPES.TASK_ARCHIVED : ACTIVITY_TYPES.TASK_RESTORED,
    entityType: "task",
    entityId: task._id.toString(),
    taskId: task._id.toString(),
    ...(task.projectId && { projectId: task.projectId.toString(), contextProjectIds: [task.projectId.toString()] }),
    metadata: {
      taskTitle: task.title,
    },
  });

  try {
    const wsId = task.workspaceId ? task.workspaceId.toString() : workspaceId || "";
    if (wsId) {
      await domainEventBus.publish(
        createDomainEvent({
          type: task.archived ? "task.archived" : "task.updated",
          workspaceId: wsId,
          actorId: userId,
          resource: {
            type: "task",
            id: task._id.toString(),
            version: (task as any).__v ?? 0,
          },
          payload: {
            archived: task.archived,
          },
        }),
      );
    }
  } catch (err) {
    console.error("[Task Service] Failed to publish task archive event:", err);
  }

  return task;
}

export async function deleteTask(
  taskId: string,
  userId: string,
  workspaceId?: string,
  authContext?: AuthContext,
): Promise<void> {
  const task = await assertTaskOwnership(taskId, userId, workspaceId);

  if (authContext) {
    PermissionEngine.authorize(authContext, Permission.TASK_DELETE, {
      createdBy: task.owner,
      ...(task.assigneeId ? { assigneeId: task.assigneeId } : {}),
      ...(task.workspaceId ? { workspaceId: task.workspaceId } : {}),
    });
  }

  const dependentTaskCount = await Task.countDocuments({
    ...(task.workspaceId ? { workspaceId: task.workspaceId } : { owner: new Types.ObjectId(userId) }),
    isDeleted: false,
    dependencies: task._id,
  });

  if (dependentTaskCount > 0) {
    throw new ConflictError(
      `Cannot delete task because it is a prerequisite for ${dependentTaskCount} active task(s).`,
    );
  }

  task.isDeleted = true;
  await task.save();

  await recordActivity({
    owner: userId,
    actorId: userId,
    ...(task.workspaceId && { workspaceId: task.workspaceId.toString() }),
    type: ACTIVITY_TYPES.TASK_DELETED,
    entityType: "task",
    entityId: task._id.toString(),
    taskId: task._id.toString(),
    ...(task.projectId && { projectId: task.projectId.toString(), contextProjectIds: [task.projectId.toString()] }),
    metadata: {
      taskTitle: task.title,
    },
  });

  try {
    const wsId = task.workspaceId ? task.workspaceId.toString() : workspaceId || "";
    if (wsId) {
      await domainEventBus.publish(
        createDomainEvent({
          type: "task.deleted",
          workspaceId: wsId,
          actorId: userId,
          resource: {
            type: "task",
            id: task._id.toString(),
            version: (task as any).__v ?? 0,
          },
          payload: {
            taskId: task._id.toString(),
          },
        }),
      );
    }
  } catch (err) {
    console.error("[Task Service] Failed to publish task.deleted event:", err);
  }
}
