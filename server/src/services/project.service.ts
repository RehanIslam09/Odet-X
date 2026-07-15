import { SortOrder, Types } from "mongoose";

import Project, { IProjectDocument } from "@/models/project.model.js";

import type {
  CreateProjectDto,
  ProjectQueryDto,
  UpdateProjectDto,
} from "@/validators/project.validator.js";

import { ForbiddenError, NotFoundError } from "@/utils/app-error.js";

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
    isDeleted: false,
  });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  if (project.owner.toString() !== userId) {
    throw new ForbiddenError("You do not have access to this project.");
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
  if (data.name !== undefined) project.name = data.name;
  if (data.description !== undefined) project.description = data.description;
  if (data.emoji !== undefined) project.emoji = data.emoji;
  if (data.color !== undefined) project.color = data.color;

  await project.save();

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
}
