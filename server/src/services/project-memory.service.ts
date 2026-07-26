import { Types } from "mongoose";

import ProjectMemory, { IProjectMemoryDocument } from "@/models/project-memory.model.js";
import { getProjectById, PaginatedResult } from "@/services/project.service.js";
import { ConflictError, NotFoundError } from "@/utils/app-error.js";
import {
  DEFAULT_MEMORY_PAGE_SIZE,
  MAX_MEMORY_PAGE_SIZE,
} from "@/constants/project-memory.js";
import type {
  CreateProjectMemoryDto,
  ProjectMemoryDto,
  ProjectMemoryQueryDto,
  UpdateProjectMemoryDto,
} from "@/validators/project-memory.validator.js";

// ---------------------------------------------------------------------------
// Constants for Copilot AI Retrieval
// ---------------------------------------------------------------------------

export const COPILOT_MAX_RETRIEVED_MEMORIES = 20;
export const COPILOT_MAX_MEMORY_CONTENT_LENGTH = 500;
export const COPILOT_MAX_AGGREGATE_MEMORY_LENGTH = 10000;

export interface CopilotRetrievedMemoryItem {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CopilotMemoryRetrievalResult {
  memories: CopilotRetrievedMemoryItem[];
  totalCount: number;
  includedCount: number;
}

// ---------------------------------------------------------------------------
// Safe DTO Transformation
// ---------------------------------------------------------------------------

/**
 * Maps an internal Mongoose ProjectMemory document to the canonical safe ProjectMemoryDto.
 * Excludes `owner`, `projectId`, and raw `__v` from client visibility.
 */
export function toProjectMemoryDto(doc: IProjectMemoryDocument): ProjectMemoryDto {
  return {
    id: doc._id.toString(),
    content: doc.content,
    sourceType: doc.sourceType,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    version: typeof doc.__v === "number" ? doc.__v : 0,
  };
}

// ---------------------------------------------------------------------------
// Service Operations
// ---------------------------------------------------------------------------

/**
 * Creates a new project memory document.
 *
 * Scoped to an authenticated user and an owned, non-deleted project.
 * Archived projects are valid memory targets.
 */
export async function createProjectMemory(
  ownerId: string,
  projectId: string,
  data: CreateProjectMemoryDto,
): Promise<ProjectMemoryDto> {
  // 1. Validate project ownership & existence (throws NotFoundError if inaccessible or soft-deleted)
  await getProjectById(projectId, ownerId);

  // 2. Normalize content (trim outer whitespace)
  const normalizedContent = data.content.trim();

  // 3. Create document with server-controlled fields
  const memory = await ProjectMemory.create({
    owner: new Types.ObjectId(ownerId),
    projectId: new Types.ObjectId(projectId),
    content: normalizedContent,
    sourceType: "USER",
  });

  return toProjectMemoryDto(memory);
}

/**
 * Lists project memories for an owned project with page-based pagination.
 *
 * Scoped strictly to { owner, projectId } and ordered by updatedAt DESC, _id DESC.
 */
export async function listProjectMemories(
  ownerId: string,
  projectId: string,
  query?: Partial<ProjectMemoryQueryDto>,
): Promise<PaginatedResult<ProjectMemoryDto>> {
  // 1. Validate project ownership
  await getProjectById(projectId, ownerId);

  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.min(MAX_MEMORY_PAGE_SIZE, Math.max(1, query?.limit ?? DEFAULT_MEMORY_PAGE_SIZE));
  const skip = (page - 1) * limit;

  // 2. Compound filter: owner + projectId
  const filter = {
    owner: new Types.ObjectId(ownerId),
    projectId: new Types.ObjectId(projectId),
  };

  // 3. Execute count and find in parallel with frozen ordering (updatedAt DESC, _id DESC)
  const [total, items] = await Promise.all([
    ProjectMemory.countDocuments(filter),
    ProjectMemory.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items: items.map(toProjectMemoryDto),
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
 * Deterministically retrieves explicit project memories for Copilot AI context integration.
 *
 * Rules & Guarantees:
 * 1. Owner + Project Scoped strictly: { owner: ownerId, projectId: projectId }
 * 2. Deterministic ordering: updatedAt DESC, _id DESC
 * 3. Database limit: capped at 20 documents directly at MongoDB level
 * 4. Per-memory content limit: max 500 chars (truncated in-memory, persisted DB record untouched)
 * 5. Aggregate content limit: max 10,000 chars total across all included memories
 * 6. ZERO database mutations.
 */
export async function getProjectMemoriesForCopilot(
  ownerId: string,
  projectId: string,
): Promise<CopilotMemoryRetrievalResult> {
  const filter = {
    owner: new Types.ObjectId(ownerId),
    projectId: new Types.ObjectId(projectId),
  };

  const [totalCount, rawMemories] = await Promise.all([
    ProjectMemory.countDocuments(filter),
    ProjectMemory.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(COPILOT_MAX_RETRIEVED_MEMORIES)
      .exec(),
  ]);

  const memories: CopilotRetrievedMemoryItem[] = [];
  let accumulatedChars = 0;

  for (const doc of rawMemories) {
    const rawContent = doc.content || "";

    // Apply per-memory max 500 character limit
    let truncatedContent =
      rawContent.length > COPILOT_MAX_MEMORY_CONTENT_LENGTH
        ? rawContent.slice(0, COPILOT_MAX_MEMORY_CONTENT_LENGTH).trimEnd()
        : rawContent;

    const availableBudget = COPILOT_MAX_AGGREGATE_MEMORY_LENGTH - accumulatedChars;
    if (availableBudget <= 0) {
      break;
    }

    if (truncatedContent.length > availableBudget) {
      truncatedContent = truncatedContent.slice(0, availableBudget).trimEnd();
    }

    if (truncatedContent.length > 0) {
      memories.push({
        id: doc._id.toString(),
        content: truncatedContent,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
      accumulatedChars += truncatedContent.length;
    }
  }

  return {
    memories,
    totalCount,
    includedCount: memories.length,
  };
}

/**
 * Applies a content update to an existing memory document using Optimistic Concurrency Control (OCC).
 *
 * Inaccessible or nonexistent memories return NotFoundError (anti-enumeration).
 * Stale expectedVersion returns ConflictError.
 */
export async function updateProjectMemory(
  ownerId: string,
  projectId: string,
  memoryId: string,
  data: UpdateProjectMemoryDto,
): Promise<ProjectMemoryDto> {
  // 1. Validate project ownership
  await getProjectById(projectId, ownerId);

  // 2. Anti-enumeration ObjectId format validation
  if (!Types.ObjectId.isValid(memoryId)) {
    throw new NotFoundError("Project memory not found.");
  }

  const normalizedContent = data.content.trim();
  const ownerObjectId = new Types.ObjectId(ownerId);
  const projectObjectId = new Types.ObjectId(projectId);
  const memoryObjectId = new Types.ObjectId(memoryId);

  // 3. Compound atomic update enforcing OCC via __v matching and increment
  const updatedMemory = await ProjectMemory.findOneAndUpdate(
    {
      _id: memoryObjectId,
      owner: ownerObjectId,
      projectId: projectObjectId,
      __v: data.expectedVersion,
    },
    {
      $set: { content: normalizedContent },
      $inc: { __v: 1 },
    },
    { returnDocument: "after", runValidators: true },
  );

  if (!updatedMemory) {
    // 4. Disambiguate between nonexistent/inaccessible memory (404) and OCC stale version (409)
    const existsInScope = await ProjectMemory.exists({
      _id: memoryObjectId,
      owner: ownerObjectId,
      projectId: projectObjectId,
    });

    if (!existsInScope) {
      throw new NotFoundError("Project memory not found.");
    } else {
      throw new ConflictError("Project memory was updated in another session.");
    }
  }

  return toProjectMemoryDto(updatedMemory);
}

/**
 * Permanently hard-deletes a project memory document.
 *
 * Soft deletion is not used for ProjectMemory.
 * Repeated deletion or deletion of an inaccessible/nonexistent memory returns NotFoundError.
 */
export async function deleteProjectMemory(
  ownerId: string,
  projectId: string,
  memoryId: string,
): Promise<void> {
  // 1. Validate project ownership
  await getProjectById(projectId, ownerId);

  // 2. Anti-enumeration ObjectId format validation
  if (!Types.ObjectId.isValid(memoryId)) {
    throw new NotFoundError("Project memory not found.");
  }

  // 3. Hard delete using compound scope filter
  const result = await ProjectMemory.deleteOne({
    _id: new Types.ObjectId(memoryId),
    owner: new Types.ObjectId(ownerId),
    projectId: new Types.ObjectId(projectId),
  });

  if (result.deletedCount === 0) {
    throw new NotFoundError("Project memory not found.");
  }
}
