/**
 * Type definitions for the Projects feature.
 *
 * These mirror the backend response shapes exactly. They are the single
 * source of truth for all project-related data structures on the frontend.
 */

// ---------------------------------------------------------------------------
// Domain Model
// ---------------------------------------------------------------------------

export interface ProjectAISummary {
  summary: string;
  highlights: string[];
  risks: string[];
}

/**
 * A project as returned by the API.
 * Sensitive/internal fields (isDeleted, __v) are stripped by the backend
 * before transmission.
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  archived: boolean;
  owner: string;
  aiSummary?: ProjectAISummary;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedProjects {
  items: Project[];
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export interface CreateProjectDto {
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  emoji?: string;
  color?: string;
}

export interface ProjectsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  archived?: boolean;
}

// ---------------------------------------------------------------------------
// Response Data Payloads
// ---------------------------------------------------------------------------

export interface ProjectResponseData {
  project: Project;
}

export interface ProjectsListResponseData {
  items: Project[];
  pagination: PaginationMeta;
}

export interface ProjectSummaryData {
  total: number;
  completed: number;
  inProgress: number;
  remaining: number;
  overdue: number;
  completionPercentage: number;
}
