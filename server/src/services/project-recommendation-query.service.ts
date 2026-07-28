import { Types } from "mongoose";
import Project from "@/models/project.model.js";
import ProjectRecommendation from "@/models/project-recommendation.model.js";
import { NotFoundError } from "@/utils/app-error.js";
import { ProjectRecommendationDto } from "@/validators/project-recommendation.validator.js";
import { RecommendationQueryDto } from "@/validators/project-recommendation-api.validator.js";
import { dismissRecommendation } from "./project-recommendation.service.js";

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
): Promise<PaginatedRecommendationsResult> {
  const ownerObjId = new Types.ObjectId(userId);
  const { page, limit, status, severity } = query;

  const filter: any = {
    owner: ownerObjId,
    status: status || "ACTIVE",
  };

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
 * Lists project-scoped recommendations owned by `userId` for `projectId`.
 * Verifies project existence and ownership (throwing NotFoundError for foreign/deleted projects).
 */
export async function listProjectRecommendations(
  userId: string,
  projectId: string,
  query: RecommendationQueryDto,
): Promise<PaginatedRecommendationsResult> {
  const ownerObjId = new Types.ObjectId(userId);
  const projectObjId = new Types.ObjectId(projectId);

  // Verify project ownership and existence
  const project = await Project.findOne({
    _id: projectObjId,
    owner: ownerObjId,
    isDeleted: false,
  });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  const { page, limit, status, severity } = query;

  const filter: any = {
    owner: ownerObjId,
    projectId: projectObjId,
    status: status || "ACTIVE",
  };

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
): Promise<ProjectRecommendationDto> {
  const filter: any = {
    _id: new Types.ObjectId(recommendationId),
    owner: new Types.ObjectId(userId),
    status: { $ne: "PENDING_ENRICHMENT" },
  };

  if (projectId) {
    // Verify project ownership first
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      owner: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!project) {
      throw new NotFoundError("Project not found.");
    }

    filter.projectId = new Types.ObjectId(projectId);
  }

  const doc = await ProjectRecommendation.findOne(filter);

  if (!doc) {
    throw new NotFoundError("Recommendation not found.");
  }

  return doc.toJSON() as unknown as ProjectRecommendationDto;
}

/**
 * Dismisses an ACTIVE recommendation owned by `userId`.
 * Validates project ownership if `projectId` is provided.
 */
export async function dismissRecommendationApi(
  userId: string,
  recommendationId: string,
  projectId?: string,
): Promise<ProjectRecommendationDto> {
  if (projectId) {
    const project = await Project.findOne({
      _id: new Types.ObjectId(projectId),
      owner: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!project) {
      throw new NotFoundError("Project not found.");
    }
  }

  // Check recommendation exists, is owned by user, belongs to projectId if specified, and is ACTIVE
  const filter: any = {
    _id: new Types.ObjectId(recommendationId),
    owner: new Types.ObjectId(userId),
    status: "ACTIVE",
  };

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
