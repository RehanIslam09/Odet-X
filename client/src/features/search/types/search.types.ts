/**
 * Global Search Frontend Types & DTO Contracts
 * Phase 31 — Global Search & Command Palette
 * WP-06 — Global Search UX & Result Navigation
 */

export type SearchEntityType = "project" | "task" | "milestone" | "memory";

export interface SearchResultDto {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  url: string;
  projectId?: string;
  projectName?: string;
  status?: string;
  updatedAt: string;
}

export interface GlobalSearchResponseData {
  query: string;
  totalResults: number;
  items: SearchResultDto[];
}

export interface SearchQueryParams {
  q: string;
  type?: "all" | SearchEntityType;
  limit?: number;
}
