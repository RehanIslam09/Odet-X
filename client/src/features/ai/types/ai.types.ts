import type { Project } from "@/features/projects/types/projects.types";
import type { Task } from "@/features/tasks/types/tasks.types";

/**
 * AI Feature DTOs and Response Types.
 *
 * Derived strictly from backend contracts:
 * - POST /api/v1/projects/:id/generate-tasks
 * - POST /api/v1/projects/:id/generate-summary
 * - POST /api/v1/tasks/:id/generate-labels
 */

// ---------------------------------------------------------------------------
// Generate Tasks
// ---------------------------------------------------------------------------

export interface GenerateTasksDto {
  description: string;
}

export interface GenerateTasksResponseData {
  items: Task[];
}

// ---------------------------------------------------------------------------
// Generate Project Summary
// ---------------------------------------------------------------------------

export interface GenerateSummaryResponseData {
  project: Project;
}

// ---------------------------------------------------------------------------
// Generate Task Labels
// ---------------------------------------------------------------------------

export interface GenerateLabelsResponseData {
  task: Task;
}
