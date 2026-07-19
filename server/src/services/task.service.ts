import { SortOrder, Types } from "mongoose";

import Task, { ITaskDocument } from "@/models/task.model.js";
import Project, { IProjectDocument } from "@/models/project.model.js";

import type {
  CreateTaskDto,
  TaskQueryDto,
  UpdateTaskDto,
} from "@/validators/task.validator.js";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/utils/app-error.js";
import { recordActivity, recordActivities, BaseActivityPayload } from "@/services/activity.service.js";
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
 * Asserts that a project exists, is not deleted, and belongs to the user.
 *
 * Prevents linking tasks to projects the user does not own or that do not exist.
 */
async function validateProjectOwnership(
  projectId: string | Types.ObjectId,
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

/**
 * Asserts that a task exists and belongs to the requesting user.
 *
 * Scopes updates and retrievals. Returns 404 NotFound if the task doesn't exist
 * or has been soft-deleted, preventing database enumeration of IDs.
 */
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

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Creates a new task. Scopes ownership to the authenticated user.
 *
 * If a `projectId` is referenced, verifies project existence and ownership.
 */
export async function createTask(
  userId: string,
  data: CreateTaskDto,
): Promise<ITaskDocument> {
  const ownerId = new Types.ObjectId(userId);
  let projectObjId: Types.ObjectId | null = null;

  if (data.projectId) {
    projectObjId = new Types.ObjectId(data.projectId);
    await validateProjectOwnership(projectObjId, userId);
  }

  const task = await Task.create({
    owner: ownerId,
    projectId: projectObjId,
    title: data.title,
    description: data.description ?? "",
    status: data.status ?? "todo",
    priority: data.priority ?? "none",
    dueDate: data.dueDate ?? null,
    estimatedTime: data.estimatedTime ?? null,
    labels: data.labels ?? [],
  });

  await recordActivity({
    owner: userId,
    actorId: userId,
    type: ACTIVITY_TYPES.TASK_CREATED,
    entityType: "task",
    entityId: task._id.toString(),
    projectId: task.projectId?.toString() ?? null,
    contextProjectIds: task.projectId ? [task.projectId.toString()] : [],
    taskId: task._id.toString(),
    metadata: {
      taskTitle: task.title,
    },
  });

  return task;
}

/**
 * Retrieves a single task, verifying ownership boundaries.
 */
export async function getTaskById(
  taskId: string,
  userId: string,
): Promise<ITaskDocument> {
  return assertTaskOwnership(taskId, userId);
}

/**
 * Lists, filters, and paginates tasks.
 *
 * Filters: Status, Priority, Project, Search (Regex over title, description, and labels).
 * Sorts by whitelisted fields. Scopes only to owner and non-deleted.
 */
export async function listTasks(
  userId: string,
  query: TaskQueryDto,
): Promise<PaginatedResult<ITaskDocument>> {
  const { page, limit, search, status, priority, projectId, sort, archived, quickFilter } = query;

  // 1. Build Filter Context
  const filter: Record<string, any> = {
    owner: new Types.ObjectId(userId),
    isDeleted: false,
    archived,
  };

  if (status !== "all") {
    filter.status = status;
  }

  if (priority !== "all") {
    filter.priority = priority;
  }

  if (projectId !== "all") {
    filter.projectId = new Types.ObjectId(projectId);
  }

  // Handle Quick Filters
  if (quickFilter === "completed") {
    filter.status = "done";
  } else if (quickFilter === "due-today") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    filter.dueDate = { $gte: todayStart, $lte: todayEnd };
  } else if (quickFilter === "overdue") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    filter.dueDate = { $lt: todayStart };
    filter.status = { $nin: ["done", "cancelled"] };
  }

  if (search) {
    const searchRegex = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { labels: searchRegex },
    ];
  }

  // 2. Build Sorting Options
  const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
  const sortOrder: SortOrder = sort.startsWith("-") ? -1 : 1;
  const sortExpression: Record<string, SortOrder> = { [sortField]: sortOrder };

  // 3. Paginate
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    Task.countDocuments(filter),
    Task.find(filter).sort(sortExpression).skip(skip).limit(limit).exec(),
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

/**
 * Updates an existing task.
 *
 * Verifies task ownership.
 * If modifying `projectId`, verifies the new project's existence and ownership.
 * Triggers pre-save Mongoose hooks for completedAt sync and labels normalization.
 */
export async function updateTask(
  taskId: string,
  userId: string,
  data: UpdateTaskDto,
): Promise<ITaskDocument> {
  const task = await assertTaskOwnership(taskId, userId);
  const events: BaseActivityPayload[] = [];
  let genericUpdate = false;

  const baseEvent = {
    owner: userId,
    actorId: userId,
    entityType: "task" as const,
    entityId: task._id.toString(),
    taskId: task._id.toString(),
    metadata: { taskTitle: data.title !== undefined ? data.title : task.title },
    contextProjectIds: task.projectId ? [task.projectId.toString()] : [],
  };

  // If project is changing, validate access to the new project
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
    }
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

/**
 * Toggles the archived state of a task.
 */
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

/**
 * Soft deletes a task. Sets `isDeleted: true` to prevent visibility in user queries.
 */
export async function deleteTask(
  taskId: string,
  userId: string,
): Promise<void> {
  const task = await assertTaskOwnership(taskId, userId);
  task.isDeleted = true;
  await task.save();

  await recordActivity({
    owner: userId,
    actorId: userId,
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
