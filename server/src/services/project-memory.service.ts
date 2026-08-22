import { Types } from "mongoose";

import ProjectMemory, { IProjectMemoryDocument } from "@/models/project-memory.model.js";
import { getProjectById } from "@/services/project.service.js";

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

import type { PaginatedResult } from "@/services/project.service.js";
import { ConflictError, NotFoundError } from "@/utils/app-error.js";

// ---------------------------------------------------------------------------
// Constants & Budget Limits
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

export async function createProjectMemory(
  ownerId: string,
  projectId: string,
  data: CreateProjectMemoryDto,
  workspaceId?: string,
): Promise<ProjectMemoryDto> {
  const project = await getProjectById(projectId, ownerId, workspaceId);

  const normalizedContent = data.content.trim();

  const memoryPayload: Record<string, unknown> = {
    owner: new Types.ObjectId(ownerId),
    projectId: new Types.ObjectId(projectId),
    content: normalizedContent,
    sourceType: "USER",
  };

  if (project.workspaceId) {
    memoryPayload.workspaceId = project.workspaceId;
  } else if (workspaceId && Types.ObjectId.isValid(workspaceId)) {
    memoryPayload.workspaceId = new Types.ObjectId(workspaceId);
  }

  const memory = await ProjectMemory.create(memoryPayload);

  return toProjectMemoryDto(memory);
}

export async function listProjectMemories(
  ownerId: string,
  projectId: string,
  query?: Partial<ProjectMemoryQueryDto>,
  workspaceId?: string,
): Promise<PaginatedResult<ProjectMemoryDto>> {
  const project = await getProjectById(projectId, ownerId, workspaceId);

  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.min(MAX_MEMORY_PAGE_SIZE, Math.max(1, query?.limit ?? DEFAULT_MEMORY_PAGE_SIZE));
  const skip = (page - 1) * limit;

  const targetWsId = workspaceId || (project.workspaceId ? project.workspaceId.toString() : undefined);
  const filter: Record<string, any> = {
    projectId: new Types.ObjectId(projectId),
  };

  if (targetWsId && Types.ObjectId.isValid(targetWsId)) {
    filter.$or = [
      { workspaceId: new Types.ObjectId(targetWsId) },
      { owner: new Types.ObjectId(ownerId) },
    ];
  } else {
    filter.owner = new Types.ObjectId(ownerId);
  }

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

export async function getProjectMemoriesForCopilot(
  ownerId: string,
  projectId: string,
  workspaceId?: string,
): Promise<CopilotMemoryRetrievalResult> {
  let project;
  try {
    project = await getProjectById(projectId, ownerId, workspaceId);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return {
        memories: [],
        totalCount: 0,
        includedCount: 0,
      };
    }
    throw err;
  }

  const targetWsId = workspaceId || (project.workspaceId ? project.workspaceId.toString() : undefined);

  const filter: Record<string, any> = {
    projectId: new Types.ObjectId(projectId),
  };

  if (targetWsId && Types.ObjectId.isValid(targetWsId)) {
    filter.$or = [
      { workspaceId: new Types.ObjectId(targetWsId) },
      { owner: new Types.ObjectId(ownerId) },
    ];
  } else {
    filter.owner = new Types.ObjectId(ownerId);
  }

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

export async function updateProjectMemory(
  ownerId: string,
  projectId: string,
  memoryId: string,
  data: UpdateProjectMemoryDto,
  workspaceId?: string,
): Promise<ProjectMemoryDto> {
  const project = await getProjectById(projectId, ownerId, workspaceId);

  if (!Types.ObjectId.isValid(memoryId)) {
    throw new NotFoundError("Project memory not found.");
  }

  const normalizedContent = data.content.trim();
  const ownerObjectId = new Types.ObjectId(ownerId);
  const projectObjectId = new Types.ObjectId(projectId);
  const memoryObjectId = new Types.ObjectId(memoryId);

  const targetWsId = workspaceId || (project.workspaceId ? project.workspaceId.toString() : undefined);

  const filter: Record<string, any> = {
    _id: memoryObjectId,
    projectId: projectObjectId,
    __v: data.expectedVersion,
  };

  if (targetWsId && Types.ObjectId.isValid(targetWsId)) {
    filter.$or = [
      { workspaceId: new Types.ObjectId(targetWsId) },
      { owner: ownerObjectId },
    ];
  } else {
    filter.owner = ownerObjectId;
  }

  const updatedMemory = await ProjectMemory.findOneAndUpdate(
    filter,
    {
      $set: {
        content: normalizedContent,
        ...(project.workspaceId ? { workspaceId: project.workspaceId } : {}),
      },
      $inc: { __v: 1 },
    },
    { returnDocument: "after", runValidators: true },
  );

  if (!updatedMemory) {
    const existsFilter: Record<string, any> = {
      _id: memoryObjectId,
      projectId: projectObjectId,
    };
    if (targetWsId && Types.ObjectId.isValid(targetWsId)) {
      existsFilter.$or = [
        { workspaceId: new Types.ObjectId(targetWsId) },
        { owner: ownerObjectId },
      ];
    } else {
      existsFilter.owner = ownerObjectId;
    }

    const existsInScope = await ProjectMemory.exists(existsFilter);

    if (!existsInScope) {
      throw new NotFoundError("Project memory not found.");
    } else {
      throw new ConflictError("Project memory was updated in another session.");
    }
  }

  return toProjectMemoryDto(updatedMemory);
}

export async function deleteProjectMemory(
  ownerId: string,
  projectId: string,
  memoryId: string,
  workspaceId?: string,
): Promise<void> {
  const project = await getProjectById(projectId, ownerId, workspaceId);

  if (!Types.ObjectId.isValid(memoryId)) {
    throw new NotFoundError("Project memory not found.");
  }

  const targetWsId = workspaceId || (project.workspaceId ? project.workspaceId.toString() : undefined);

  const filter: Record<string, any> = {
    _id: new Types.ObjectId(memoryId),
    projectId: new Types.ObjectId(projectId),
  };

  if (targetWsId && Types.ObjectId.isValid(targetWsId)) {
    filter.$or = [
      { workspaceId: new Types.ObjectId(targetWsId) },
      { owner: new Types.ObjectId(ownerId) },
    ];
  } else {
    filter.owner = new Types.ObjectId(ownerId);
  }

  const result = await ProjectMemory.deleteOne(filter);

  if (result.deletedCount === 0) {
    throw new NotFoundError("Project memory not found.");
  }
}
