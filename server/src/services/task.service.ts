import { SortOrder, Types } from "mongoose";

import Project, { IProjectDocument } from "@/models/project.model.js";
import Task, { ITaskDocument } from "@/models/task.model.js";
import User from "@/models/user.model.js";
import { provisionPersonalWorkspace } from "@/services/workspace.service.js";

import type {
  CreateTaskDto,
  TaskQueryDto,
  UpdateTaskDto,
  UpdateTaskNotesDto,
} from "@/validators/task.validator.js";

import { ConflictError, NotFoundError } from "@/utils/app-error.js";
import { BaseActivityPayload, recordActivities, recordActivity } from "@/services/activity.service.js";
import { ACTIVITY_TYPES } from "@/constants/activity.js";

import type { PaginatedResult } from "./project.service.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function validateProjectOwnership(
  projectId: Types.ObjectId,
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

async function assertTaskOwnership(
  taskId: string,
  userId: string,
): Promise<ITaskDocument> {
  const task = await Task.findOne({
    _id: taskId,
    owner: new Types.ObjectId(userId),
    isDeleted: false,
  });

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
  data: CreateTaskDto & { dependencies?: string[]; position?: number; milestoneId?: string | null; notes?: string },
  explicitWorkspaceId?: string,
): Promise<ITaskDocument> {
    let targetWorkspaceId: Types.ObjectId;

  if (data.projectId) {
    const projectObjId = new Types.ObjectId(data.projectId);
    const project = await validateProjectOwnership(projectObjId, userId);

    if (project.workspaceId) {
      targetWorkspaceId = project.workspaceId;
    } else {
      const userDoc = await User.findById(userId);
      const personal = await provisionPersonalWorkspace({
        _id: userId,
        name: userDoc?.name || "User",
        username: userDoc?.username || "user",
      });
      targetWorkspaceId = personal.workspace._id as Types.ObjectId;
    }
  } else if (explicitWorkspaceId) {
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

  const position = typeof data.position === "number" ? data.position : 1;

  if (data.dependencies && data.dependencies.length > 0) {
    const depObjectIds = data.dependencies.map((id) => new Types.ObjectId(id));
    const validCount = await Task.countDocuments({
      _id: { $in: depObjectIds },
      owner: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (validCount !== data.dependencies.length) {
      throw new NotFoundError("One or more prerequisite tasks do not exist or belong to another user.");
    }
  }

  const task = await Task.create({
    owner: new Types.ObjectId(userId),
    workspaceId: targetWorkspaceId,
    projectId: data.projectId ? new Types.ObjectId(data.projectId) : null,
    milestoneId: data.milestoneId ? new Types.ObjectId(data.milestoneId) : null,
    title: data.title,
    description: data.description ?? "",
    notes: data.notes ?? "",
    status: data.status ?? "todo",
    priority: data.priority ?? "none",
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    labels: data.labels ?? [],
    position,
    dependencies: data.dependencies ? data.dependencies.map((id) => new Types.ObjectId(id)) : [],
  });

  await recordActivity({
    owner: userId,
    actorId: userId,
    ...(task.workspaceId && { workspaceId: task.workspaceId.toString() }),
    type: ACTIVITY_TYPES.TASK_CREATED,
    entityType: "task",
    entityId: task._id.toString(),
    projectId: task.projectId ? task.projectId.toString() : null,
    contextProjectIds: task.projectId ? [task.projectId.toString()] : [],
    metadata: {
      taskTitle: task.title,
    },
  });

  return task;
}

// ---------------------------------------------------------------------------
// Read (Single Task)
// ---------------------------------------------------------------------------

export async function getTaskById(
  taskId: string,
  userId: string,
): Promise<ITaskDocument> {
  return assertTaskOwnership(taskId, userId);
}

// ---------------------------------------------------------------------------
// Read (List with Filtering, Pagination, Sorting)
// ---------------------------------------------------------------------------

export async function listTasks(
  userId: string,
  query: TaskQueryDto & Record<string, any>,
  explicitWorkspaceId?: string,
): Promise<PaginatedResult<ITaskDocument>> {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    priority,
    projectId,
    milestoneId,
    label,
    archived,
    dueDate,
    sort,
    sortBy,
    sortOrder,
  } = query;

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

  if (projectId !== undefined && projectId !== "all") {
    if (projectId === null) {
      filter.projectId = null;
    } else {
      filter.projectId = new Types.ObjectId(projectId);
    }
  }

  if (milestoneId !== undefined && milestoneId !== "all") {
    if (milestoneId === null) {
      filter.milestoneId = null;
    } else {
      filter.milestoneId = new Types.ObjectId(milestoneId);
    }
  }

  if (status !== undefined && status !== "all") {
    filter.status = status;
  }

  if (priority !== undefined && priority !== "all") {
    filter.priority = priority;
  }

  if (label !== undefined && typeof label === "string" && label.trim().length > 0) {
    filter.labels = label.trim();
  }

  if (search && typeof search === "string" && search.trim().length > 0) {
    const safeRegex = escapeRegex(search.trim());
    filter.$or = [
      { title: { $regex: safeRegex, $options: "i" } },
      { description: { $regex: safeRegex, $options: "i" } },
      { labels: { $regex: safeRegex, $options: "i" } },
    ];
  }

  if (dueDate !== undefined) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (dueDate === "overdue") {
      filter.dueDate = { $lt: startOfDay };
      filter.status = { $ne: "done" };
    } else if (dueDate === "today") {
      filter.dueDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (dueDate === "upcoming") {
      filter.dueDate = { $gt: endOfDay };
    } else if (dueDate === "no_date") {
      filter.dueDate = null;
    }
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

  if (sortField !== "updatedAt") {
    sortExpression.updatedAt = -1;
  }

  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    Task.countDocuments(filter),
    Task.find(filter).select("-notes").sort(sortExpression).skip(skip).limit(limit).exec(),
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
// Update
// ---------------------------------------------------------------------------

export async function updateTask(
  taskId: string,
  userId: string,
  data: UpdateTaskDto & { dependencies?: string[]; position?: number; milestoneId?: string | null; notes?: string },
): Promise<ITaskDocument> {
  const task = await assertTaskOwnership(taskId, userId);
  const events: BaseActivityPayload[] = [];
  let genericUpdate = false;

  const baseEvent = {
    owner: userId,
    actorId: userId,
    ...(task.workspaceId && { workspaceId: task.workspaceId.toString() }),
    entityType: "task" as const,
    entityId: task._id.toString(),
    taskId: task._id.toString(),
    metadata: { taskTitle: data.title !== undefined ? data.title : task.title },
    contextProjectIds: task.projectId ? [task.projectId.toString()] : [],
  };

  if (data.projectId !== undefined) {
    if (data.projectId === null && task.projectId !== null) {
      const fromProject = await Project.findById(task.projectId);
      events.push({
        ...baseEvent,
        type: ACTIVITY_TYPES.TASK_PROJECT_CHANGED,
        projectId: null,
        contextProjectIds: [task.projectId.toString()],
        metadata: {
          ...baseEvent.metadata,
          fromProjectId: task.projectId.toString(),
          toProjectId: null,
          fromProjectName: fromProject?.name || "Unknown Project",
          toProjectName: null
        },
      });
      task.projectId = null;
    } else if (data.projectId !== null && (!task.projectId || task.projectId.toString() !== data.projectId)) {
      const projectObjId = new Types.ObjectId(data.projectId);
      const toProject = await validateProjectOwnership(projectObjId, userId);
      const fromProject = task.projectId ? await Project.findById(task.projectId) : null;
      events.push({
        ...baseEvent,
        type: ACTIVITY_TYPES.TASK_PROJECT_CHANGED,
        projectId: data.projectId,
        contextProjectIds: task.projectId ? [task.projectId.toString(), data.projectId] : [data.projectId],
        metadata: {
          ...baseEvent.metadata,
          fromProjectId: task.projectId?.toString() || null,
          toProjectId: data.projectId,
          fromProjectName: fromProject?.name || null,
          toProjectName: toProject.name
        },
      });
      task.projectId = projectObjId;
      if (toProject.workspaceId) {
        task.workspaceId = toProject.workspaceId;
      }
    }
  }

  if (data.dependencies !== undefined) {
    task.dependencies = data.dependencies.map((id) => new Types.ObjectId(id));
    genericUpdate = true;
  }
  if (data.position !== undefined) {
    task.position = data.position;
    genericUpdate = true;
  }
  if (data.milestoneId !== undefined) {
    task.milestoneId = data.milestoneId ? new Types.ObjectId(data.milestoneId) : null;
    genericUpdate = true;
  }

  if (data.title !== undefined && data.title !== task.title) {
    task.title = data.title;
    genericUpdate = true;
  }
  if (data.description !== undefined && data.description !== task.description) {
    task.description = data.description;
    genericUpdate = true;
  }
  if (data.status !== undefined && data.status !== task.status) {
    events.push({
      ...baseEvent,
      type: ACTIVITY_TYPES.TASK_STATUS_CHANGED,
      projectId: task.projectId?.toString() || null,
      metadata: { ...baseEvent.metadata, fromStatus: task.status, toStatus: data.status },
    });
    task.status = data.status;
  }
  if (data.priority !== undefined && data.priority !== task.priority) {
    events.push({
      ...baseEvent,
      type: ACTIVITY_TYPES.TASK_PRIORITY_CHANGED,
      projectId: task.projectId?.toString() || null,
      metadata: { ...baseEvent.metadata, fromPriority: task.priority, toPriority: data.priority },
    });
    task.priority = data.priority;
  }
  if (data.dueDate !== undefined) {
    const oldDate = task.dueDate?.getTime();
    const newDate = data.dueDate?.getTime();
    if (oldDate !== newDate) {
      task.dueDate = data.dueDate;
      genericUpdate = true;
    }
  }
  if (data.estimatedTime !== undefined && data.estimatedTime !== task.estimatedTime) {
    task.estimatedTime = data.estimatedTime;
    genericUpdate = true;
  }
  if (data.labels !== undefined) {
    const oldLabels = task.labels.join(",");
    const newLabels = [...new Set(data.labels.map(l => l.trim()).filter(l => l.length > 0))].join(",");
    if (oldLabels !== newLabels) {
      task.labels = data.labels;
      genericUpdate = true;
    }
  }

  if (genericUpdate) {
    events.push({
      ...baseEvent,
      type: ACTIVITY_TYPES.TASK_UPDATED,
      projectId: task.projectId?.toString() || null,
    });
  }

  await task.save();

  if (events.length > 0) {
    await recordActivities(events);
  }

  return task;
}

export async function updateTaskNotes(
  taskId: string,
  userId: string,
  data: UpdateTaskNotesDto,
): Promise<ITaskDocument> {
  const query: any = {
    _id: taskId,
    owner: new Types.ObjectId(userId),
    isDeleted: false,
  };

  if (data.expectedVersion !== undefined) {
    query.__v = data.expectedVersion;
  }

  const task = await Task.findOneAndUpdate(
    query,
    {
      $set: { notes: data.notes },
      $inc: { __v: 1 },
    },
    { new: true, runValidators: true }
  );

  if (!task) {
    const exists = await Task.exists({
      _id: taskId,
      owner: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!exists) {
      throw new NotFoundError("Task not found.");
    } else {
      throw new ConflictError("Notes were updated in another session.");
    }
  }

  return task;
}

export async function toggleTaskArchive(
  taskId: string,
  userId: string,
): Promise<ITaskDocument> {
  const task = await assertTaskOwnership(taskId, userId);
  task.archived = !task.archived;
  await task.save();

  await recordActivity({
    owner: userId,
    actorId: userId,
    ...(task.workspaceId && { workspaceId: task.workspaceId.toString() }),
    type: task.archived ? ACTIVITY_TYPES.TASK_ARCHIVED : ACTIVITY_TYPES.TASK_RESTORED,
    entityType: "task",
    entityId: task._id.toString(),
    projectId: task.projectId?.toString() || null,
    contextProjectIds: task.projectId ? [task.projectId.toString()] : [],
    taskId: task._id.toString(),
    metadata: {
      taskTitle: task.title,
    },
  });

  return task;
}

export async function deleteTask(
  taskId: string,
  userId: string,
): Promise<void> {
  const task = await assertTaskOwnership(taskId, userId);

  const dependentTaskCount = await Task.countDocuments({
    owner: new Types.ObjectId(userId),
    isDeleted: false,
    dependencies: task._id,
  });

  if (dependentTaskCount > 0) {
    throw new ConflictError(
      `Cannot delete task because it is a prerequisite for ${dependentTaskCount} active task(s).`
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
    projectId: task.projectId?.toString() || null,
    contextProjectIds: task.projectId ? [task.projectId.toString()] : [],
    taskId: task._id.toString(),
    metadata: {
      taskTitle: task.title,
    },
  });
}
