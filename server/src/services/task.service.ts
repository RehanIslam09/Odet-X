import { SortOrder, Types } from "mongoose";

import Task, { ITaskDocument } from "@/models/task.model.js";
import Project from "@/models/project.model.js";

import type {
  CreateTaskDto,
  TaskQueryDto,
  UpdateTaskDto,
} from "@/validators/task.validator.js";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/utils/app-error.js";

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
): Promise<void> {
  const project = await Project.findOne({
    _id: projectId,
    isDeleted: false,
  });

  if (!project) {
    throw new NotFoundError("Referenced project not found.");
  }

  if (project.owner.toString() !== userId) {
    throw new ForbiddenError("You do not have access to this project.");
  }
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
    isDeleted: false,
  });

  if (!task) {
    throw new NotFoundError("Task not found.");
  }

  if (task.owner.toString() !== userId) {
    throw new ForbiddenError("You do not have access to this task.");
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

  // If project is changing, validate access to the new project
  if (data.projectId !== undefined) {
    if (data.projectId === null) {
      task.projectId = null;
    } else {
      const projectObjId = new Types.ObjectId(data.projectId);
      await validateProjectOwnership(projectObjId, userId);
      task.projectId = projectObjId;
    }
  }

  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description;
  if (data.status !== undefined) task.status = data.status;
  if (data.priority !== undefined) task.priority = data.priority;
  if (data.dueDate !== undefined) task.dueDate = data.dueDate;
  if (data.estimatedTime !== undefined) task.estimatedTime = data.estimatedTime;
  if (data.labels !== undefined) task.labels = data.labels;

  await task.save();
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
}
