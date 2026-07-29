/**
 * Search Domain Types & Constants
 * Phase 31 — Global Search & Command Palette
 */

export type SearchEntityType = "project" | "task" | "milestone" | "memory";

export type SearchTypeFilter = "all" | SearchEntityType;

export interface SearchResultDto {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string | undefined;
  url: string;
  projectId?: string | undefined;
  projectName?: string | undefined;
  status?: string | undefined;
  updatedAt: string;
}

// Search Query Constraints
export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 100;
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 50;
export const SEARCH_ALL_MAX_RESULTS = 20;
export const SEARCH_PER_TYPE_LIMIT = 5;

// Scoring Constants
export const SEARCH_SCORE_EXACT_TITLE = 100;
export const SEARCH_SCORE_PREFIX_TITLE = 80;
export const SEARCH_SCORE_SUBSTRING_TITLE = 60;
export const SEARCH_SCORE_TASK_LABEL = 40;
export const SEARCH_SCORE_DESCRIPTION = 30;
export const SEARCH_SCORE_NO_MATCH = 0;

// Project Memory Privacy Bounds
export const SEARCH_MEMORY_SNIPPET_MAX_LENGTH = 100;
export const SEARCH_MEMORY_CONTEXT_BEFORE_MATCH = 40;
