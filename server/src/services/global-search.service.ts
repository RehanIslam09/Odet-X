/**
 * Deterministic Backend Search Engine Service
 * Phase 31 — Global Search & Command Palette
 */

import { Types } from "mongoose";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import Milestone from "../models/milestone.model.js";
import ProjectMemory from "../models/project-memory.model.js";
import {
  SearchTypeFilter,
  SearchResultDto,
  SEARCH_ALL_MAX_RESULTS,
  SEARCH_PER_TYPE_LIMIT,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
} from "../types/search.types.js";
import {
  normalizeSearchQuery,
  calculateRelevanceScore,
  compareSearchResults,
  generateMemorySnippet,
  generateNavigationUrl,
  SearchCandidateInput,
} from "../utils/search-domain.utils.js";

export interface GlobalSearchOptions {
  ownerId: Types.ObjectId | string;
  query: string;
  type?: SearchTypeFilter;
  limit?: number;
}

export interface GlobalSearchResponse {
  query: string;
  totalResults: number;
  items: SearchResultDto[];
}

interface RankedResultItem extends SearchResultDto {
  score: number;
}

const SEARCH_CANDIDATE_LIMIT_PER_ENTITY = 50;

/**
 * Searches global entities deterministically for an authenticated tenant.
 */
export async function searchGlobalEntities(
  options: GlobalSearchOptions
): Promise<GlobalSearchResponse> {
  const { ownerId, query, type = "all", limit = SEARCH_DEFAULT_LIMIT } = options;

  const ownerObjectId =
    typeof ownerId === "string" ? new Types.ObjectId(ownerId) : ownerId;

  const norm = normalizeSearchQuery(query);
  if (!norm.isSearchable) {
    return {
      query: query || "",
      totalResults: 0,
      items: [],
    };
  }

  const effectiveLimit = Math.min(Math.max(1, limit), SEARCH_MAX_LIMIT);
  const searchAll = type === "all";

  // -------------------------------------------------------------------------
  // 1. Concurrent Candidate Fetching
  // -------------------------------------------------------------------------

  const fetchProjects = searchAll || type === "project";
  const fetchTasks = searchAll || type === "task";
  const fetchMilestones = searchAll || type === "milestone";
  const fetchMemories = searchAll || type === "memory";

  const regexFilter = { $regex: norm.escaped, $options: "i" };

  const [rawProjects, rawTasks, rawMilestones, rawMemories] = await Promise.all([
    fetchProjects
      ? Project.find(
          {
            owner: ownerObjectId,
            isDeleted: false,
            archived: false,
            $or: [{ name: regexFilter }, { description: regexFilter }],
          },
          { name: 1, description: 1, updatedAt: 1 }
        )
          .sort({ updatedAt: -1 })
          .limit(SEARCH_CANDIDATE_LIMIT_PER_ENTITY)
          .lean()
      : Promise.resolve([]),

    fetchTasks
      ? Task.find(
          {
            owner: ownerObjectId,
            isDeleted: false,
            archived: false,
            $or: [
              { title: regexFilter },
              { description: regexFilter },
              { labels: regexFilter },
            ],
          },
          {
            title: 1,
            description: 1,
            labels: 1,
            projectId: 1,
            status: 1,
            updatedAt: 1,
          }
        )
          .sort({ updatedAt: -1 })
          .limit(SEARCH_CANDIDATE_LIMIT_PER_ENTITY)
          .lean()
      : Promise.resolve([]),

    fetchMilestones
      ? Milestone.find(
          {
            owner: ownerObjectId,
            isDeleted: false,
            $or: [{ title: regexFilter }, { description: regexFilter }],
          },
          { title: 1, description: 1, projectId: 1, updatedAt: 1 }
        )
          .sort({ updatedAt: -1 })
          .limit(SEARCH_CANDIDATE_LIMIT_PER_ENTITY)
          .lean()
      : Promise.resolve([]),

    fetchMemories
      ? ProjectMemory.find(
          {
            owner: ownerObjectId,
            content: regexFilter,
          },
          { content: 1, projectId: 1, updatedAt: 1 }
        )
          .sort({ updatedAt: -1 })
          .limit(SEARCH_CANDIDATE_LIMIT_PER_ENTITY)
          .lean()
      : Promise.resolve([]),
  ]);

  // -------------------------------------------------------------------------
  // 2. Batch Parent Project Name & Visibility Resolution (N+1 Prevention)
  // -------------------------------------------------------------------------

  const parentProjectIds = new Set<string>();
  for (const t of rawTasks) {
    if (t.projectId) parentProjectIds.add(t.projectId.toString());
  }
  for (const m of rawMilestones) {
    if (m.projectId) parentProjectIds.add(m.projectId.toString());
  }
  for (const mem of rawMemories) {
    if (mem.projectId) parentProjectIds.add(mem.projectId.toString());
  }

  const validParentProjectsMap = new Map<string, string>();
  if (parentProjectIds.size > 0) {
    const parentObjectIds = Array.from(parentProjectIds).map(
      (id) => new Types.ObjectId(id)
    );

    const activeParents = await Project.find(
      {
        _id: { $in: parentObjectIds },
        owner: ownerObjectId,
        isDeleted: false,
        archived: false,
      },
      { name: 1 }
    ).lean();

    for (const p of activeParents) {
      validParentProjectsMap.set(p._id.toString(), p.name);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Scoring & DTO Transformation
  // -------------------------------------------------------------------------

  const rankedProjects: RankedResultItem[] = [];
  for (const p of rawProjects) {
    const candidate: SearchCandidateInput = {
      type: "project",
      title: p.name,
      description: p.description,
    };
    const score = calculateRelevanceScore(candidate, norm.trimmed);
    if (score > 0) {
      rankedProjects.push({
        id: p._id.toString(),
        type: "project",
        title: p.name,
        subtitle: p.description ? p.description.slice(0, 100) : undefined,
        url: generateNavigationUrl("project", p._id.toString()),
        updatedAt: p.updatedAt.toISOString(),
        score,
      });
    }
  }

  const rankedTasks: RankedResultItem[] = [];
  for (const t of rawTasks) {
    // If task has a parent project, verify parent is active & visible
    let projectName: string | undefined;
    if (t.projectId) {
      const pIdStr = t.projectId.toString();
      if (!validParentProjectsMap.has(pIdStr)) {
        continue; // Parent is deleted, archived, or unowned
      }
      projectName = validParentProjectsMap.get(pIdStr);
    }

    const candidate: SearchCandidateInput = {
      type: "task",
      title: t.title,
      description: t.description,
      labels: t.labels,
    };
    const score = calculateRelevanceScore(candidate, norm.trimmed);
    if (score > 0) {
      rankedTasks.push({
        id: t._id.toString(),
        type: "task",
        title: t.title,
        subtitle: t.description ? t.description.slice(0, 100) : undefined,
        url: generateNavigationUrl("task", t._id.toString()),
        projectId: t.projectId ? t.projectId.toString() : undefined,
        projectName,
        status: t.status,
        updatedAt: t.updatedAt.toISOString(),
        score,
      });
    }
  }

  const rankedMilestones: RankedResultItem[] = [];
  for (const m of rawMilestones) {
    const pIdStr = m.projectId.toString();
    if (!validParentProjectsMap.has(pIdStr)) {
      continue; // Parent is deleted, archived, or unowned
    }
    const projectName = validParentProjectsMap.get(pIdStr);

    const candidate: SearchCandidateInput = {
      type: "milestone",
      title: m.title,
      description: m.description,
    };
    const score = calculateRelevanceScore(candidate, norm.trimmed);
    if (score > 0) {
      rankedMilestones.push({
        id: m._id.toString(),
        type: "milestone",
        title: m.title,
        subtitle: m.description ? m.description.slice(0, 100) : undefined,
        url: generateNavigationUrl("milestone", m._id.toString(), pIdStr),
        projectId: pIdStr,
        projectName,
        updatedAt: m.updatedAt.toISOString(),
        score,
      });
    }
  }

  const rankedMemories: RankedResultItem[] = [];
  for (const mem of rawMemories) {
    const pIdStr = mem.projectId.toString();
    if (!validParentProjectsMap.has(pIdStr)) {
      continue; // Parent is deleted, archived, or unowned
    }
    const projectName = validParentProjectsMap.get(pIdStr);

    const candidate: SearchCandidateInput = {
      type: "memory",
      content: mem.content,
    };
    const score = calculateRelevanceScore(candidate, norm.trimmed);
    if (score > 0) {
      rankedMemories.push({
        id: mem._id.toString(),
        type: "memory",
        title: "Project Memory",
        subtitle: generateMemorySnippet(mem.content, norm.trimmed),
        url: generateNavigationUrl("memory", mem._id.toString(), pIdStr),
        projectId: pIdStr,
        projectName,
        updatedAt: mem.updatedAt.toISOString(),
        score,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 4. Result Composition & Bounded Sorting
  // -------------------------------------------------------------------------

  let finalItems: SearchResultDto[];

  if (searchAll) {
    // Sort per entity group and apply per-type cap (5 items max)
    rankedProjects.sort(compareSearchResults);
    rankedTasks.sort(compareSearchResults);
    rankedMilestones.sort(compareSearchResults);
    rankedMemories.sort(compareSearchResults);

    const cappedProjects = rankedProjects.slice(0, SEARCH_PER_TYPE_LIMIT);
    const cappedTasks = rankedTasks.slice(0, SEARCH_PER_TYPE_LIMIT);
    const cappedMilestones = rankedMilestones.slice(0, SEARCH_PER_TYPE_LIMIT);
    const cappedMemories = rankedMemories.slice(0, SEARCH_PER_TYPE_LIMIT);

    // Combine capped results and globally rank them
    const combined = [
      ...cappedProjects,
      ...cappedTasks,
      ...cappedMilestones,
      ...cappedMemories,
    ];
    combined.sort(compareSearchResults);

    // Apply global cap (min of effectiveLimit or SEARCH_ALL_MAX_RESULTS)
    const globalCap = Math.min(effectiveLimit, SEARCH_ALL_MAX_RESULTS);
    const topCap = combined.slice(0, globalCap);

    // Strip internal score property before returning public DTOs
    finalItems = topCap.map(({ score: _, ...dto }) => dto);
  } else {
    let singleGroup: RankedResultItem[] = [];
    if (type === "project") singleGroup = rankedProjects;
    else if (type === "task") singleGroup = rankedTasks;
    else if (type === "milestone") singleGroup = rankedMilestones;
    else if (type === "memory") singleGroup = rankedMemories;

    singleGroup.sort(compareSearchResults);
    const capped = singleGroup.slice(0, effectiveLimit);
    finalItems = capped.map(({ score: _, ...dto }) => dto);
  }

  return {
    query: norm.trimmed,
    totalResults: finalItems.length,
    items: finalItems,
  };
}
