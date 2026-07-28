import { Types } from "mongoose";
import Project from "@/models/project.model.js";
import Task from "@/models/task.model.js";
import Milestone from "@/models/milestone.model.js";
import Activity from "@/models/activity.model.js";
import { ProjectSignal, ProjectSignalType } from "@/constants/proactive-intelligence.js";
import {
  SignalEvaluationContext,
  detectDependencyBottlenecks,
  detectMilestonesAtRisk,
  detectOverdueHighPriorityTasks,
  detectProjectStalled,
} from "./signal-detectors.js";

// ---------------------------------------------------------------------------
// Severity & Signal Type Ordering Constants
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

const SIGNAL_TYPE_ORDER: Record<ProjectSignalType, number> = {
  OVERDUE_HIGH_PRIORITY_TASKS: 1,
  MILESTONE_AT_RISK: 2,
  DEPENDENCY_BOTTLENECK: 3,
  PROJECT_STALLED: 4,
};

// ---------------------------------------------------------------------------
// Deterministic Signal Engine (Pure Domain Evaluation)
// ---------------------------------------------------------------------------

/**
 * Evaluates structured project state in memory against all V1 signal detectors.
 * Returns deterministically ordered ProjectSignal objects.
 *
 * Deterministic Ordering Rules:
 * 1. Severity Rank: CRITICAL (1) -> HIGH (2) -> MEDIUM (3) -> LOW (4)
 * 2. Signal Type Order: OVERDUE -> MILESTONE_AT_RISK -> BOTTLENECK -> STALLED
 * 3. Fingerprint Lexicographically Ascending
 */
export function detectProjectSignals(context: SignalEvaluationContext): ProjectSignal[] {
  const signals: ProjectSignal[] = [];

  // 1. Run OVERDUE_HIGH_PRIORITY_TASKS
  const overdueSignal = detectOverdueHighPriorityTasks(context);
  if (overdueSignal) {
    signals.push(overdueSignal);
  }

  // 2. Run MILESTONE_AT_RISK
  const milestoneSignals = detectMilestonesAtRisk(context);
  signals.push(...milestoneSignals);

  // 3. Run DEPENDENCY_BOTTLENECK
  const bottleneckSignals = detectDependencyBottlenecks(context);
  signals.push(...bottleneckSignals);

  // 4. Run PROJECT_STALLED
  const stalledSignal = detectProjectStalled(context);
  if (stalledSignal) {
    signals.push(stalledSignal);
  }

  // Sort signals deterministically
  signals.sort((a, b) => {
    const rankA = SEVERITY_RANK[a.severity] || 99;
    const rankB = SEVERITY_RANK[b.severity] || 99;
    if (rankA !== rankB) return rankA - rankB;

    const typeOrderA = SIGNAL_TYPE_ORDER[a.type] || 99;
    const typeOrderB = SIGNAL_TYPE_ORDER[b.type] || 99;
    if (typeOrderA !== typeOrderB) return typeOrderA - typeOrderB;

    return a.fingerprint.localeCompare(b.fingerprint);
  });

  return signals;
}

// ---------------------------------------------------------------------------
// Database-Backed Helper (Single Project State Loader with Tenant Scoping)
// ---------------------------------------------------------------------------

/**
 * Loads database state for a single project enforcing strict owner & project scoping,
 * and executes deterministic signal detection.
 *
 * Security & Isolation Guarantees:
 * - `Project`, `Task`, `Milestone`, and `Activity` queries explicitly filter by `owner`.
 * - No cross-tenant data can leak into detection context.
 * - Zero database mutations, zero AI calls, zero recommendation creations.
 */
export async function loadAndDetectProjectSignals(
  projectId: string,
  ownerId: string,
  now: Date = new Date(),
): Promise<ProjectSignal[]> {
  const projectObjId = new Types.ObjectId(projectId);
  const ownerObjId = new Types.ObjectId(ownerId);

  // 1. Query Project with strict owner & non-deleted/non-archived filter
  const projectDoc = await Project.findOne({
    _id: projectObjId,
    owner: ownerObjId,
    isDeleted: false,
    archived: false,
  }).lean();

  if (!projectDoc) {
    return []; // Candidate project unavailable or unowned
  }

  // 2. Query Tasks with strict owner & project scoping
  const rawTasks = await Task.find({
    owner: ownerObjId,
    projectId: projectObjId,
    isDeleted: false,
  }).lean();

  // 3. Query Milestones with strict owner & project scoping
  const rawMilestones = await Milestone.find({
    owner: ownerObjId,
    projectId: projectObjId,
    isDeleted: false,
  }).lean();

  // 4. Query Activity with strict owner & project scoping
  const rawActivities = await Activity.find({
    owner: ownerObjId,
    $or: [{ projectId: projectObjId }, { contextProjectIds: projectObjId }],
  })
    .sort({ _id: -1 })
    .limit(50) // Bounded query for project activity history
    .lean();

  // Map to evaluation context DTOs
  const context: SignalEvaluationContext = {
    project: {
      id: projectDoc._id.toString(),
      owner: projectDoc.owner.toString(),
      name: (projectDoc as any).name || "",
      description: (projectDoc as any).description || "",
      archived: Boolean((projectDoc as any).archived),
      isDeleted: Boolean((projectDoc as any).isDeleted),
      createdAt: (projectDoc as any).createdAt || new Date(),
      updatedAt: (projectDoc as any).updatedAt || new Date(),
    },
    tasks: rawTasks.map((t: any) => ({
      id: t._id.toString(),
      owner: t.owner.toString(),
      projectId: t.projectId ? t.projectId.toString() : null,
      title: t.title || "",
      status: t.status || "todo",
      priority: t.priority || "none",
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      completedAt: t.completedAt ? new Date(t.completedAt) : null,
      dependencies: Array.isArray(t.dependencies) ? t.dependencies.map((d: any) => d.toString()) : [],
      milestoneId: t.milestoneId ? t.milestoneId.toString() : null,
      archived: Boolean(t.archived),
      isDeleted: Boolean(t.isDeleted),
      createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
      updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
    })),
    milestones: rawMilestones.map((m: any) => ({
      id: m._id.toString(),
      owner: m.owner.toString(),
      projectId: m.projectId.toString(),
      title: m.title || "",
      targetDate: m.targetDate ? new Date(m.targetDate) : null,
      isDeleted: Boolean(m.isDeleted),
      createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date(),
    })),
    activities: rawActivities.map((a: any) => ({
      owner: a.owner.toString(),
      projectId: a.projectId ? a.projectId.toString() : null,
      contextProjectIds: Array.isArray(a.contextProjectIds) ? a.contextProjectIds.map((c: any) => c.toString()) : [],
      createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
    })),
    now,
  };

  return detectProjectSignals(context);
}
