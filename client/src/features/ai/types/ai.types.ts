import type { Project } from "@/features/projects/types/projects.types";
import type { Task } from "@/features/tasks/types/tasks.types";

/**
 * AI Feature DTOs and Response Types.
 *
 * Derived strictly from backend contracts:
 * - POST /api/v1/projects/:id/generate-tasks
 * - POST /api/v1/projects/:id/generate-summary
 * - POST /api/v1/tasks/:id/generate-labels
 * - Phase 25 Planning Engine Endpoints: /api/v1/projects/:id/plans
 */

// ---------------------------------------------------------------------------
// Generate Tasks (Phase 24 Legacy direct task generation)
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

// ---------------------------------------------------------------------------
// Phase 25 Planning Engine Types
// ---------------------------------------------------------------------------

export type PlanDraftStatus = "draft" | "committed" | "discarded";

export interface PlanDraftTask {
  tempId: string;
  title: string;
  description: string;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  estimatedTime: string | null;
  position: number;
  dependencies: string[];
  milestoneTempId: string | null;
}

export interface PlanDraftMilestone {
  tempId: string;
  title: string;
  description: string;
  targetDate: string | null;
  position: number;
}

export interface PlanDraft {
  id: string;
  owner: string;
  projectId: string;
  status: PlanDraftStatus;
  promptDescription: string;
  tasks: PlanDraftTask[];
  milestones: PlanDraftMilestone[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratePlanDto {
  description: string;
}

export interface UpdatePlanDraftDto {
  tasks?: PlanDraftTask[];
  milestones?: PlanDraftMilestone[];
}

export interface CommitPlanResultData {
  draftId: string;
  projectId: string;
  taskCount: number;
  milestoneCount: number;
  tasks: Task[];
  milestones: unknown[];
}

// ---------------------------------------------------------------------------
// Phase 27 Read-Only Project Copilot Types
// ---------------------------------------------------------------------------

export type CopilotMessageRole = "user" | "assistant";

export interface CopilotHistoryMessage {
  role: CopilotMessageRole;
  content: string;
}

export interface CopilotReference {
  type: "project" | "task" | "milestone";
  id: string;
  label: string;
}

export interface QueryCopilotDto {
  question: string;
  history?: CopilotHistoryMessage[];
}

export interface CopilotResultData {
  answer: string;
  references: CopilotReference[];
  unmappedReferenceCount: number;
  executionId: string;
  provider: string;
  model: string;
}

/** UI-only ephemeral conversation item */
export interface CopilotConversationMessage {
  id: string;
  role: CopilotMessageRole;
  content: string;
  references?: CopilotReference[];
  timestamp: Date;
  isError?: boolean;
}
