/**
 * Pure Search Domain Primitives & Helpers
 * Phase 31 — Global Search & Command Palette
 */

import {
  SearchEntityType,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_SCORE_EXACT_TITLE,
  SEARCH_SCORE_PREFIX_TITLE,
  SEARCH_SCORE_SUBSTRING_TITLE,
  SEARCH_SCORE_TASK_LABEL,
  SEARCH_SCORE_DESCRIPTION,
  SEARCH_SCORE_NO_MATCH,
  SEARCH_MEMORY_SNIPPET_MAX_LENGTH,
  SEARCH_MEMORY_CONTEXT_BEFORE_MATCH,
} from "../types/search.types.js";

/**
 * Escapes special regex characters in a query string to prevent ReDoS / injection.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface NormalizedSearchQuery {
  raw: string;
  trimmed: string;
  normalized: string;
  escaped: string;
  isSearchable: boolean;
}

/**
 * Normalizes a raw search query string.
 */
export function normalizeSearchQuery(rawQuery: string): NormalizedSearchQuery {
  const trimmed = (rawQuery || "").trim();
  const normalized = trimmed.toLowerCase();
  const isSearchable =
    trimmed.length >= SEARCH_MIN_QUERY_LENGTH &&
    trimmed.length <= SEARCH_MAX_QUERY_LENGTH;
  const escaped = escapeRegex(trimmed);

  return {
    raw: rawQuery,
    trimmed,
    normalized,
    escaped,
    isSearchable,
  };
}

export interface SearchCandidateInput {
  type: SearchEntityType;
  title?: string;
  description?: string;
  labels?: string[];
  content?: string;
}

/**
 * Calculates relevance score for a candidate item given a query.
 * Non-accumulating: Highest matching category score wins.
 */
export function calculateRelevanceScore(
  candidate: SearchCandidateInput,
  query: string
): number {
  const norm = normalizeSearchQuery(query);
  if (!norm.isSearchable) {
    return SEARCH_SCORE_NO_MATCH;
  }

  const q = norm.normalized;
  let maxScore = SEARCH_SCORE_NO_MATCH;

  // Title / Name matching (Project, Task, Milestone)
  if (candidate.title) {
    const titleNorm = candidate.title.trim().toLowerCase();
    if (titleNorm === q) {
      maxScore = Math.max(maxScore, SEARCH_SCORE_EXACT_TITLE);
    } else if (titleNorm.startsWith(q)) {
      maxScore = Math.max(maxScore, SEARCH_SCORE_PREFIX_TITLE);
    } else if (titleNorm.includes(q)) {
      maxScore = Math.max(maxScore, SEARCH_SCORE_SUBSTRING_TITLE);
    }
  }

  // Task Label matching
  if (candidate.labels && candidate.labels.length > 0) {
    const labelMatch = candidate.labels.some((label) =>
      label.trim().toLowerCase().includes(q)
    );
    if (labelMatch) {
      maxScore = Math.max(maxScore, SEARCH_SCORE_TASK_LABEL);
    }
  }

  // Description / Content matching (Project, Task, Milestone description, or Memory content)
  const bodyText = candidate.description || candidate.content;
  if (bodyText) {
    const bodyNorm = bodyText.toLowerCase();
    if (bodyNorm.includes(q)) {
      maxScore = Math.max(maxScore, SEARCH_SCORE_DESCRIPTION);
    }
  }

  return maxScore;
}

export interface SearchResultItemInput {
  id: string;
  score: number;
  updatedAt: string | Date;
}

/**
 * Deterministic search result comparator.
 * Order: score DESC -> updatedAt DESC -> id ASC (lexicographical)
 */
export function compareSearchResults<T extends SearchResultItemInput>(
  a: T,
  b: T
): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  const timeA = new Date(a.updatedAt).getTime();
  const timeB = new Date(b.updatedAt).getTime();
  if (timeB !== timeA) {
    return timeB - timeA;
  }

  return a.id.localeCompare(b.id);
}

/**
 * Generates a safe, bounded plain-text snippet for Project Memory search results.
 * Strictly guarantees returned length <= SEARCH_MEMORY_SNIPPET_MAX_LENGTH (100 characters).
 */
export function generateMemorySnippet(content: string, query: string): string {
  const maxLength = SEARCH_MEMORY_SNIPPET_MAX_LENGTH;
  if (!content) return "";

  const trimmedContent = content.trim();
  if (trimmedContent.length <= maxLength && !query) {
    return trimmedContent;
  }

  const normQuery = (query || "").trim().toLowerCase();
  const contentLower = trimmedContent.toLowerCase();

  let matchIndex = -1;
  if (normQuery.length >= SEARCH_MIN_QUERY_LENGTH) {
    matchIndex = contentLower.indexOf(normQuery);
  }

  if (matchIndex === -1) {
    // Fallback: Return starting slice with trailing ellipsis if needed
    if (trimmedContent.length <= maxLength) {
      return trimmedContent;
    }
    return trimmedContent.slice(0, maxLength - 3) + "...";
  }

  // Calculate start index with context before match
  const startIndex = Math.max(0, matchIndex - SEARCH_MEMORY_CONTEXT_BEFORE_MATCH);
  const prependEllipsis = startIndex > 0;

  // Compute character allowance
  const prefixEllipsisLen = prependEllipsis ? 3 : 0;
  // Reserve space for suffix ellipsis if needed
  const maxBodyLen = maxLength - prefixEllipsisLen - 3; // reserve 3 for suffix

  const endIndex = Math.min(trimmedContent.length, startIndex + maxBodyLen);
  const appendEllipsis = endIndex < trimmedContent.length;

  // Extract body slice
  const snippet = trimmedContent.slice(startIndex, endIndex);

  // Assemble full snippet
  let result = (prependEllipsis ? "..." : "") + snippet + (appendEllipsis ? "..." : "");

  // Enforce absolute cap safeguard
  if (result.length > maxLength) {
    result = result.slice(0, maxLength - 3) + "...";
  }

  return result;
}

/**
 * Generates canonical frontend navigation URL for a search entity.
 */
export function generateNavigationUrl(
  type: SearchEntityType,
  id: string,
  projectId?: string,
  workspaceSlug?: string,
): string {
  const prefix = workspaceSlug ? `/w/${workspaceSlug}` : "";
  switch (type) {
    case "project":
      return `${prefix}/projects/${id}`;
    case "task":
      return `${prefix}/tasks/${id}`;
    case "milestone":
    case "memory":
      return `${prefix}/projects/${projectId || id}`;
    default:
      return `${prefix}/projects/${id}`;
  }
}
