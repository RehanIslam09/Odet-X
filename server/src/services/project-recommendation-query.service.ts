import { Types } from "mongoose";
import ProjectRecommendation from "@/models/project-recommendation.model.js";
import { NotFoundError } from "@/utils/app-error.js";
import { ProjectRecommendationDto } from "@/validators/project-recommendation.validator.js";
import { RecommendationQueryDto } from "@/validators/project-recommendation-api.validator.js";
import { dismissRecommendation } from "./project-recommendation.service.js";
import { getProjectById } from "./project.service.js";

export interface PaginatedRecommendationsResult {
  items: ProjectRecommendationDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Lists workspace-wide recommendations owned by `userId`.
 * Excludes internal statuses like PENDING_ENRICHMENT.
 */
export async function listWorkspaceRecommendations(
  userId: string,
  query: RecommendationQueryDto,
  explicitWorkspaceId?: string,
): Promise<PaginatedRecommendationsResult> {
  const ownerObjId = new Types.ObjectId(userId);
  const { page, limit, status, severity } = query;

  const filter: any = {
    status: status || "ACTIVE",
  };

  if (explicitWorkspaceId) {
    filter.$or = [
      { workspaceId: new Types.ObjectId(explicitWorkspaceId) },
      { owner: ownerObjId },
    ];
  } else {
    filter.owner = ownerObjId;
  }

  if (severity) {
    filter.severity = severity;
  }

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    ProjectRecommendation.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip(skip)
      .limit(limit),
    ProjectRecommendation.countDocuments(filter),
  ]);

  const items = docs.map((doc) => doc.toJSON() as unknown as ProjectRecommendationDto);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Lists project-scoped recommendations for `projectId` in `workspaceId`.
 * Verifies project existence and workspace membership (throwing NotFoundError for foreign/deleted projects).
 */
export async function listProjectRecommendations(
  userId: string,
  projectId: string,
  query: RecommendationQueryDto,
  explicitWorkspaceId?: string,
): Promise<PaginatedRecommendationsResult> {
  const ownerObjId = new Types.ObjectId(userId);
  const projectObjId = new Types.ObjectId(projectId);

  // Verify project workspace access and existence
  const project = await getProjectById(projectId, userId, explicitWorkspaceId);

  const { page, limit, status, severity } = query;

  const filter: any = {
    projectId: projectObjId,
    status: status || "ACTIVE",
  };

  const targetWsId = explicitWorkspaceId || (project.workspaceId ? project.workspaceId.toString() : undefined);
  if (targetWsId && Types.ObjectId.isValid(targetWsId)) {
    filter.$or = [
      { workspaceId: new Types.ObjectId(targetWsId) },
      { owner: ownerObjId },
    ];
  } else {
    filter.owner = ownerObjId;
  }

  if (severity) {
    filter.severity = severity;
  }

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    ProjectRecommendation.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip(skip)
      .limit(limit),
    ProjectRecommendation.countDocuments(filter),
  ]);

  const items = docs.map((doc) => doc.toJSON() as unknown as ProjectRecommendationDto);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

/**
 * Gets a single recommendation by ID with compound tenant and project scoping.
 * Excludes internal PENDING_ENRICHMENT recommendations.
 */
export async function getRecommendationById(
  userId: string,
  recommendationId: string,
  projectId?: string,
  explicitWorkspaceId?: string,
): Promise<ProjectRecommendationDto> {
  const ownerObjId = new Types.ObjectId(userId);
  let targetWsId = explicitWorkspaceId;

  if (projectId) {
    // Verify project workspace access first
    const project = await getProjectById(projectId, userId, explicitWorkspaceId);
    if (!targetWsId && project.workspaceId) {
      targetWsId = project.workspaceId.toString();
    }
  }

  const filter: any = {
    _id: new Types.ObjectId(recommendationId),
    status: { $ne: "PENDING_ENRICHMENT" },
  };

  if (targetWsId && Types.ObjectId.isValid(targetWsId)) {
    filter.$or = [
      { workspaceId: new Types.ObjectId(targetWsId) },
      { owner: ownerObjId },
    ];
  } else {
    filter.owner = ownerObjId;
  }

  if (projectId) {
    filter.projectId = new Types.ObjectId(projectId);
  }

  const doc = await ProjectRecommendation.findOne(filter);

  if (!doc) {
    throw new NotFoundError("Recommendation not found.");
  }

  return doc.toJSON() as unknown as ProjectRecommendationDto;
}

/**
 * Dismisses an ACTIVE recommendation owned by `userId` or workspace member.
 * Validates project ownership if `projectId` is provided.
 */
export async function dismissRecommendationApi(
  userId: string,
  recommendationId: string,
  projectId?: string,
  explicitWorkspaceId?: string,
): Promise<ProjectRecommendationDto> {
  const ownerObjId = new Types.ObjectId(userId);
  let targetWsId = explicitWorkspaceId;

  if (projectId) {
    const project = await getProjectById(projectId, userId, explicitWorkspaceId);
    if (!targetWsId && project.workspaceId) {
      targetWsId = project.workspaceId.toString();
    }
  }

  const filter: any = {
    _id: new Types.ObjectId(recommendationId),
    status: "ACTIVE",
  };

  if (targetWsId && Types.ObjectId.isValid(targetWsId)) {
    filter.$or = [
      { workspaceId: new Types.ObjectId(targetWsId) },
      { owner: ownerObjId },
    ];
  } else {
    filter.owner = ownerObjId;
  }

  if (projectId) {
    filter.projectId = new Types.ObjectId(projectId);
  }

  const existing = await ProjectRecommendation.findOne(filter);

  if (!existing) {
    throw new NotFoundError("Recommendation not found.");
  }

  // Delegate lifecycle mutation to WP-04 service
  const dismissed = await dismissRecommendation(recommendationId, userId);

  if (!dismissed) {
    throw new NotFoundError("Recommendation not found.");
  }

  return dismissed;
}
