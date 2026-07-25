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
 * - Phase 27 & 28 Project Copilot & Controlled Actions
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
// Phase 27 & 28 Controlled AI Actions & Project Copilot Types
// ---------------------------------------------------------------------------

export type AllowedActionType =
  | "CREATE_TASK"
  | "UPDATE_TASK_STATUS"
  | "UPDATE_TASK_PRIORITY"
  | "UPDATE_TASK_DUE_DATE"
  | "ADD_TASK_LABEL";

export interface ProposedAction {
  action: AllowedActionType;
  targetRef: string;
  arguments: Record<string, unknown>;
  explanation: string;
}

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
  proposedAction?: ProposedAction | null;
  unmappedReferenceCount: number;
  executionId: string;
  provider: string;
  model: string;
}

export type ActionCardLifecycleState = "proposed" | "reviewing" | "applied" | "failed" | "expired";

/** UI-only ephemeral conversation item */
export interface CopilotConversationMessage {
  id: string;
  role: CopilotMessageRole;
  content: string;
  references?: CopilotReference[];
  proposedAction?: ProposedAction | null;
  actionStatus?: ActionCardLifecycleState;
  appliedMessage?: string;
  timestamp: Date;
  isError?: boolean;
}

// ---------------------------------------------------------------------------
// Phase 28 Action Dry-Run & Confirmation DTOs
// ---------------------------------------------------------------------------

export interface ActionDryRunDto {
  projectId: string;
  proposedAction: ProposedAction;
}

export interface DryRunTarget {
  id: string;
  label: string;
  type: "project" | "task";
}

export interface DryRunStateDiff {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface ActionDryRunResultData {
  dryRun: {
    actionType: AllowedActionType;
    target: DryRunTarget;
    diff: DryRunStateDiff;
    explanation: string;
    expectedVersion: number | null;
  };
  confirmationToken: string;
  expiresAt: string;
}

export interface ActionConfirmDto {
  confirmationToken: string;
}

export interface ActionConfirmResultData {
  actionType: AllowedActionType;
  targetId: string;
  executedAt: string;
  updatedEntity?: unknown;
}
