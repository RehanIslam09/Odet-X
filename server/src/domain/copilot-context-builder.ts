import mongoose, { Types } from "mongoose";
import Project from "@/models/project.model.js";
import Task from "@/models/task.model.js";
import Milestone from "@/models/milestone.model.js";
import Activity from "@/models/activity.model.js";
import { ACTIVITY_TYPES } from "@/constants/activity.js";
import { TaskPriority, TaskStatus } from "@/constants/task.js";
import { NotFoundError } from "@/utils/app-error.js";

// ---------------------------------------------------------------------------
// Constants & Budget Limits
// ---------------------------------------------------------------------------

export const COPILOT_MAX_TASKS = 40;
export const COPILOT_MAX_COMPLETED_TASKS = 10;
export const COPILOT_MAX_MILESTONES = 5;
export const COPILOT_MAX_ACTIVITIES = 10;

// ---------------------------------------------------------------------------
// Interfaces & DTO Contracts
// ---------------------------------------------------------------------------

export interface CopilotProjectContext {
  ref: "project";
  name: string;
  description: string;
  archived: boolean;
  aiSummary?: {
    summary: string;
    highlights: string[];
    risks: string[];
  };
}

export interface CopilotTaskContext {
  ref: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  estimatedTime: string | null;
  labels: string[];
  prerequisiteRefs: string[];
  milestoneRef: string | null;
  position: number;
  completedAt: string | null;
}

export interface CopilotMilestoneContext {
  ref: string;
  title: string;
  description: string;
  targetDate: string | null;
  position: number;
}

export interface CopilotActivityContext {
  type: string;
  summary: string;
  timestamp: string;
}

export interface CopilotTruncationMetadata {
  totalTasks: number;
  includedTasks: number;
  isTruncated: boolean;
  totalMilestones: number;
  includedMilestones: number;
  totalActivity: number;
  includedActivity: number;
}

export interface CopilotContextDTO {
  project: CopilotProjectContext;
  milestones: CopilotMilestoneContext[];
  tasks: CopilotTaskContext[];
  recentActivity: CopilotActivityContext[];
  truncation: CopilotTruncationMetadata;
}

export interface SymbolicEntityMapItem {
  type: "project" | "task" | "milestone";
  id: string;
  label: string;
}

export interface CopilotContextBuilderResult {
  context: CopilotContextDTO;
  symbolicMap: Record<string, SymbolicEntityMapItem>;
}

export interface BuildCopilotContextOptions {
  projectId: string;
  userId: string;
  referenceTime?: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Truncates a string cleanly to maxLength with an ellipsis suffix.
 * Does not mutate persisted strings.
 */
export function truncateString(str: string | undefined | null, maxLength: number): string {
  if (!str) return "";
  const trimmed = str.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Formats an Activity record into a safe, human-readable summary
 * without leaking raw ObjectIds, user IDs, or internal metadata.
 */
export function formatActivitySummary(type: string, metadata?: Record<string, unknown>): string {
  const meta = metadata || {};
  const title =
    typeof meta.title === "string"
      ? meta.title
      : typeof meta.name === "string"
        ? meta.name
        : "";

  switch (type) {
    case ACTIVITY_TYPES.TASK_CREATED:
      return title ? `Task created: "${title}"` : "Task created";
    case ACTIVITY_TYPES.TASK_STATUS_CHANGED: {
      const status = meta.to || meta.newStatus || meta.status;
      return title && status
        ? `Task status changed to ${status}: "${title}"`
        : title
          ? `Task status changed: "${title}"`
          : "Task status changed";
    }
    case ACTIVITY_TYPES.TASK_UPDATED:
      return title ? `Task updated: "${title}"` : "Task updated";
    case ACTIVITY_TYPES.TASK_PRIORITY_CHANGED: {
      const priority = meta.to || meta.priority;
      return title && priority
        ? `Task priority changed to ${priority}: "${title}"`
        : title
          ? `Task priority changed: "${title}"`
          : "Task priority changed";
    }
    case ACTIVITY_TYPES.PROJECT_CREATED:
      return "Project created";
    case ACTIVITY_TYPES.PROJECT_UPDATED:
      return "Project updated";
    case ACTIVITY_TYPES.PROJECT_ARCHIVED:
      return "Project archived";
    case ACTIVITY_TYPES.PROJECT_RESTORED:
      return "Project restored";
    case ACTIVITY_TYPES.AI_PLAN_GENERATED:
      return "AI plan generated";
    case ACTIVITY_TYPES.AI_PLAN_COMMITTED:
      return "AI plan committed";
    case ACTIVITY_TYPES.AI_PLAN_DISCARDED:
      return "AI plan discarded";
    case ACTIVITY_TYPES.AI_SUMMARY_GENERATED:
      return "AI summary generated";
    case ACTIVITY_TYPES.AI_TASKS_GENERATED:
      return "AI tasks generated";
    default:
      return title ? `${type}: "${title}"` : type;
  }
}

const PRIORITY_WEIGHTS: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

// ---------------------------------------------------------------------------
// Main Context Builder
// ---------------------------------------------------------------------------

/**
 * Builds authorized, read-only project context and symbolic reference map for Copilot.
 *
 * Enforces:
 * 1. Strict project ownership check `{ _id: projectId, owner: userId, isDeleted: false }`.
 * 2. Owner-scoped retrieval of tasks, milestones, and activities.
 * 3. Single reference timestamp for overdue classification.
 * 4. Deterministic categorization, sorting, and budgeting caps:
 *    - Max 40 tasks (overdue -> urgent/high -> standard -> max 10 completed).
 *    - Max 5 milestones.
 *    - Max 10 recent activities.
 * 5. Accurate truncation metadata computation (`isTruncated`).
 * 6. Safe field inclusion — no ObjectIds, owner IDs, notes, or internal Mongoose fields.
 * 7. Server-managed symbolic reference mapping (`project`, `ms_1`..`ms_M`, `task_1`..`task_N`).
 * 8. Dependency and milestone assignment filtering after budgeting (no dangling refs).
 * 9. ZERO database mutations.
 */
export async function buildCopilotContext(
  options: BuildCopilotContextOptions,
): Promise<CopilotContextBuilderResult> {
  const { projectId, userId } = options;

  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new NotFoundError("Project not found.");
  }

  const projectObjId = new Types.ObjectId(projectId);
  const userObjId = new Types.ObjectId(userId);

  // 1. Authorize Project Ownership & Check Deletion
  const project = await Project.findOne({
    _id: projectObjId,
    owner: userObjId,
    isDeleted: false,
  }).lean();

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  const now = options.referenceTime || new Date();

  // 2. Query Milestones (Owner + Project + Not Deleted)
  const rawMilestones = await Milestone.find({
    projectId: projectObjId,
    owner: userObjId,
    isDeleted: false,
  }).lean();

  const totalMilestonesCount = rawMilestones.length;

  // Sort Milestones deterministically by position ASC, then _id ASC
  const sortedMilestones = rawMilestones.sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return a._id.toString().localeCompare(b._id.toString());
  });

  // Apply Milestone Budget (Max 5)
  const selectedMilestones = sortedMilestones.slice(0, COPILOT_MAX_MILESTONES);

  // 3. Query Tasks (Owner + Project + Not Deleted)
  const rawTasks = await Task.find({
    projectId: projectObjId,
    owner: userObjId,
    isDeleted: false,
  }).lean();

  const totalTasksCount = rawTasks.length;

  // Categorize Tasks into 4 disjoint categories
  const catOverdue: typeof rawTasks = [];
  const catUrgentHigh: typeof rawTasks = [];
  const catStandard: typeof rawTasks = [];
  const catCompleted: typeof rawTasks = [];

  for (const t of rawTasks) {
    if (t.status !== "done" && t.dueDate !== null && t.dueDate < now) {
      catOverdue.push(t);
    } else if (t.status !== "done" && (t.priority === "urgent" || t.priority === "high")) {
      catUrgentHigh.push(t);
    } else if (t.status !== "done") {
      catStandard.push(t);
    } else {
      catCompleted.push(t);
    }
  }

  // Sort Category 1: Incomplete Overdue (dueDate ASC, priority DESC, position ASC, _id ASC)
  catOverdue.sort((a, b) => {
    if (a.dueDate && b.dueDate && a.dueDate.getTime() !== b.dueDate.getTime()) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    const pA = PRIORITY_WEIGHTS[a.priority] || 0;
    const pB = PRIORITY_WEIGHTS[b.priority] || 0;
    if (pA !== pB) return pB - pA;
    if (a.position !== b.position) return a.position - b.position;
    return a._id.toString().localeCompare(b._id.toString());
  });

  // Sort Category 2: Incomplete Urgent/High (priority DESC, dueDate ASC [nulls last], position ASC, _id ASC)
  catUrgentHigh.sort((a, b) => {
    const pA = PRIORITY_WEIGHTS[a.priority] || 0;
    const pB = PRIORITY_WEIGHTS[b.priority] || 0;
    if (pA !== pB) return pB - pA;
    if (a.dueDate || b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      if (a.dueDate.getTime() !== b.dueDate.getTime()) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
    }
    if (a.position !== b.position) return a.position - b.position;
    return a._id.toString().localeCompare(b._id.toString());
  });

  // Sort Category 3: Incomplete Standard (position ASC, dueDate ASC [nulls last], _id ASC)
  catStandard.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    if (a.dueDate || b.dueDate) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      if (a.dueDate.getTime() !== b.dueDate.getTime()) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
    }
    return a._id.toString().localeCompare(b._id.toString());
  });

  // Sort Category 4: Completed (completedAt DESC [nulls last], _id ASC)
  catCompleted.sort((a, b) => {
    if (a.completedAt || b.completedAt) {
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      if (a.completedAt.getTime() !== b.completedAt.getTime()) {
        return b.completedAt.getTime() - a.completedAt.getTime();
      }
    }
    return a._id.toString().localeCompare(b._id.toString());
  });

  // Apply Task Budget (Max 40 tasks, Category 4 capped at max 10 tasks)
  const selectedTasks: typeof rawTasks = [];
  let remainingCapacity = COPILOT_MAX_TASKS;

  for (const t of catOverdue) {
    if (remainingCapacity > 0) {
      selectedTasks.push(t);
      remainingCapacity--;
    }
  }

  for (const t of catUrgentHigh) {
    if (remainingCapacity > 0) {
      selectedTasks.push(t);
      remainingCapacity--;
    }
  }

  for (const t of catStandard) {
    if (remainingCapacity > 0) {
      selectedTasks.push(t);
      remainingCapacity--;
    }
  }

  const completedCap = Math.min(COPILOT_MAX_COMPLETED_TASKS, remainingCapacity);
  for (let i = 0; i < Math.min(completedCap, catCompleted.length); i++) {
    const completedTask = catCompleted[i];
    if (completedTask) {
      selectedTasks.push(completedTask);
    }
  }

  // 4. Query Recent Activity (Owner + Project Scope, newest first)
  const rawActivities = await Activity.find({
    owner: userObjId,
    $or: [{ contextProjectIds: projectObjId }, { projectId: projectObjId }],
  })
    .sort({ _id: -1 })
    .lean();

  const totalActivityCount = rawActivities.length;

  // Apply Activity Budget (Max 10)
  const selectedActivities = rawActivities.slice(0, COPILOT_MAX_ACTIVITIES);

  // 5. Build Symbolic Reference Map and DTOs over SELECTED items ONLY
  const symbolicMap: Record<string, SymbolicEntityMapItem> = {};
  const taskIdToSymbolicRef = new Map<string, string>();
  const milestoneIdToSymbolicRef = new Map<string, string>();

  // Add project to symbolicMap
  symbolicMap["project"] = {
    type: "project",
    id: project._id.toString(),
    label: project.name,
  };

  // Map selected milestones
  const milestoneDTOs: CopilotMilestoneContext[] = selectedMilestones.map((ms, index) => {
    const ref = `ms_${index + 1}`;
    const idStr = ms._id.toString();
    symbolicMap[ref] = {
      type: "milestone",
      id: idStr,
      label: ms.title,
    };
    milestoneIdToSymbolicRef.set(idStr, ref);

    return {
      ref,
      title: ms.title,
      description: truncateString(ms.description, 300),
      targetDate: ms.targetDate ? ms.targetDate.toISOString() : null,
      position: ms.position,
    };
  });

  // Map selected tasks
  const taskDTOs: CopilotTaskContext[] = selectedTasks.map((t, index) => {
    const ref = `task_${index + 1}`;
    const idStr = t._id.toString();
    symbolicMap[ref] = {
      type: "task",
      id: idStr,
      label: t.title,
    };
    taskIdToSymbolicRef.set(idStr, ref);

    return {
      ref,
      title: t.title,
      description: truncateString(t.description, 300),
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      estimatedTime: t.estimatedTime || null,
      labels: Array.isArray(t.labels) ? t.labels : [],
      prerequisiteRefs: [], // Populated in second pass below
      milestoneRef: t.milestoneId ? milestoneIdToSymbolicRef.get(t.milestoneId.toString()) || null : null,
      position: t.position,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    };
  });

  // Second pass for task prerequisiteRefs (filters out excluded/deleted dependencies)
  selectedTasks.forEach((t, index) => {
    const prereqRefs: string[] = [];
    if (Array.isArray(t.dependencies)) {
      for (const depId of t.dependencies) {
        const mappedRef = taskIdToSymbolicRef.get(depId.toString());
        if (mappedRef) {
          prereqRefs.push(mappedRef);
        }
      }
    }
    const currentTaskDTO = taskDTOs[index];
    if (currentTaskDTO) {
      currentTaskDTO.prerequisiteRefs = prereqRefs;
    }
  });

  // Format selected activities safely
  const activityDTOs: CopilotActivityContext[] = selectedActivities.map((act) => ({
    type: act.type,
    summary: formatActivitySummary(act.type, act.metadata),
    timestamp: act.createdAt ? act.createdAt.toISOString() : new Date().toISOString(),
  }));

  // Build Project DTO
  const projectDTO: CopilotProjectContext = {
    ref: "project",
    name: project.name,
    description: truncateString(project.description, 500),
    archived: Boolean(project.archived),
    ...(project.aiSummary && {
      aiSummary: {
        summary: project.aiSummary.summary,
        highlights: project.aiSummary.highlights || [],
        risks: project.aiSummary.risks || [],
      },
    }),
  };

  const includedTasksCount = taskDTOs.length;
  const includedMilestonesCount = milestoneDTOs.length;
  const includedActivityCount = activityDTOs.length;

  const isTruncated =
    includedTasksCount < totalTasksCount ||
    includedMilestonesCount < totalMilestonesCount ||
    includedActivityCount < totalActivityCount;

  const context: CopilotContextDTO = {
    project: projectDTO,
    milestones: milestoneDTOs,
    tasks: taskDTOs,
    recentActivity: activityDTOs,
    truncation: {
      totalTasks: totalTasksCount,
      includedTasks: includedTasksCount,
      isTruncated,
      totalMilestones: totalMilestonesCount,
      includedMilestones: includedMilestonesCount,
      totalActivity: totalActivityCount,
      includedActivity: includedActivityCount,
    },
  };

  return {
    context,
    symbolicMap,
  };
}
