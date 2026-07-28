import {
  PROACTIVE_BOTTLENECK_THRESHOLD_TASKS,
  PROACTIVE_MILESTONE_RISK_WINDOW_DAYS,
  PROACTIVE_STALLED_THRESHOLD_DAYS,
  ProjectRecommendationSeverity,
  ProjectSignal,
  RelatedEntityRef,
} from "@/constants/proactive-intelligence.js";

import {
  generateDependencyBottleneckFingerprint,
  generateMilestoneRiskFingerprint,
  generateOverdueSignalFingerprint,
  generateProjectStalledFingerprint,
} from "./signal-fingerprint.js";

// ---------------------------------------------------------------------------
// Context DTOs for Pure Detector Processing
// ---------------------------------------------------------------------------

export interface EvaluationTaskItem {
  id?: string;
  _id?: any;
  owner?: any;
  projectId?: any;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | null;
  completedAt?: Date | null;
  dependencies?: any[];
  milestoneId?: any;
  archived?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EvaluationMilestoneItem {
  id?: string;
  _id?: any;
  owner?: any;
  projectId?: any;
  title: string;
  targetDate?: Date | null;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EvaluationActivityItem {
  owner?: any;
  projectId?: any;
  createdAt?: Date;
}

export interface SignalEvaluationContext {
  project: {
    id?: string;
    _id?: any;
    owner?: any;
    name: string;
    description?: string;
    archived?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  };
  tasks: EvaluationTaskItem[];
  milestones: EvaluationMilestoneItem[];
  activities?: EvaluationActivityItem[];
  latestActivityDate?: Date | null;
  now?: Date;
}

// ---------------------------------------------------------------------------
// Helper Utilities
// ---------------------------------------------------------------------------

function getIdStr(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (val._id) return val._id.toString();
  if (val.id) return val.id.toString();
  return String(val);
}

/** Helper to check if a task is active (non-deleted, non-archived). */
function isTaskActive(t: EvaluationTaskItem): boolean {
  return !t.isDeleted && !t.archived;
}

/** Helper to check if a task is incomplete (not completed/done, not cancelled). */
function isTaskIncomplete(t: EvaluationTaskItem): boolean {
  return t.status !== "completed" && t.status !== "done" && t.status !== "cancelled";
}

// ---------------------------------------------------------------------------
// 1. OVERDUE_HIGH_PRIORITY_TASKS Detector
// ---------------------------------------------------------------------------

export function detectOverdueHighPriorityTasks(context: SignalEvaluationContext): ProjectSignal | null {
  const { project, tasks, now = new Date() } = context;

  // Filter tasks: active, incomplete, priority IN ['high', 'urgent'], dueDate < now
  const overdueTasks = tasks.filter((t) => {
    if (!isTaskActive(t) || !isTaskIncomplete(t)) return false;
    if (t.priority !== "high" && t.priority !== "urgent") return false;
    if (!t.dueDate) return false;
    return t.dueDate.getTime() < now.getTime(); // Strictly less than now
  });

  if (overdueTasks.length === 0) {
    return null;
  }

  // Sort tasks deterministically by dueDate ASC, then id ASC
  overdueTasks.sort((a, b) => {
    const timeA = a.dueDate!.getTime();
    const timeB = b.dueDate!.getTime();
    if (timeA !== timeB) return timeA - timeB;
    return getIdStr(a).localeCompare(getIdStr(b));
  });

  const urgentCount = overdueTasks.filter((t) => t.priority === "urgent").length;
  const highCount = overdueTasks.filter((t) => t.priority === "high").length;
  const oldestDueDate = overdueTasks[0]!.dueDate!.toISOString();
  const taskIds = overdueTasks.map((t) => getIdStr(t));

  const severity: ProjectRecommendationSeverity = urgentCount > 0 ? "CRITICAL" : "HIGH";

  const relatedEntities: RelatedEntityRef[] = overdueTasks.map((t) => ({
    type: "task",
    id: getIdStr(t),
    label: t.title,
  }));

  const projId = getIdStr(project);
  const ownerId = getIdStr(project.owner);
  const fingerprint = generateOverdueSignalFingerprint(projId, taskIds);

  return {
    type: "OVERDUE_HIGH_PRIORITY_TASKS",
    ownerId,
    projectId: projId,
    severity,
    detectedAt: now,
    relatedEntities,
    facts: {
      overdueCount: overdueTasks.length,
      urgentCount,
      highCount,
      oldestDueDate,
    },
    fingerprint,
  };
}

// ---------------------------------------------------------------------------
// 2. MILESTONE_AT_RISK Detector
// ---------------------------------------------------------------------------

export function detectMilestonesAtRisk(context: SignalEvaluationContext): ProjectSignal[] {
  const { project, tasks, milestones, now = new Date() } = context;
  const signals: ProjectSignal[] = [];

  const windowEnd = new Date(now.getTime() + PROACTIVE_MILESTONE_RISK_WINDOW_DAYS * 86400000);

  // Active milestones with targetDate <= now + 7 days
  const eligibleMilestones = milestones.filter((m) => {
    if (m.isDeleted) return false;
    if (!m.targetDate) return false;
    return m.targetDate.getTime() <= windowEnd.getTime();
  });

  for (const ms of eligibleMilestones) {
    const msId = getIdStr(ms);
    // Find attached valid active tasks
    const attachedTasks = tasks.filter((t) => isTaskActive(t) && getIdStr(t.milestoneId) === msId);
    if (attachedTasks.length === 0) continue;

    const incompleteAttached = attachedTasks.filter((t) => isTaskIncomplete(t));
    if (incompleteAttached.length === 0) continue; // No risk if all attached tasks are done/cancelled

    // Sort incomplete attached tasks deterministically
    incompleteAttached.sort((a, b) => {
      const dueA = a.dueDate ? a.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      const dueB = b.dueDate ? b.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      if (dueA !== dueB) return dueA - dueB;
      return getIdStr(a).localeCompare(getIdStr(b));
    });

    const overdueCount = incompleteAttached.filter((t) => t.dueDate && t.dueDate.getTime() < now.getTime()).length;
    const targetTime = ms.targetDate!.getTime();
    const threeDaysMs = 3 * 86400000;

    let severity: ProjectRecommendationSeverity;
    if (targetTime < now.getTime()) {
      severity = "CRITICAL";
    } else if (targetTime <= now.getTime() + threeDaysMs) {
      severity = "HIGH";
    } else {
      severity = "MEDIUM";
    }

    const milestoneEntityRef: RelatedEntityRef = {
      type: "milestone",
      id: msId,
      label: ms.title,
    };

    const taskEntityRefs: RelatedEntityRef[] = incompleteAttached.map((t) => ({
      type: "task",
      id: getIdStr(t),
      label: t.title,
    }));

    const relatedEntities: RelatedEntityRef[] = [milestoneEntityRef, ...taskEntityRefs];
    const incompleteTaskIds = incompleteAttached.map((t) => getIdStr(t));
    const fingerprint = generateMilestoneRiskFingerprint(msId, ms.targetDate!.toISOString(), incompleteTaskIds);

    const projId = getIdStr(project);
    const ownerId = getIdStr(project.owner);

    signals.push({
      type: "MILESTONE_AT_RISK",
      ownerId,
      projectId: projId,
      severity,
      detectedAt: now,
      relatedEntities,
      facts: {
        milestoneTitle: ms.title,
        targetDate: ms.targetDate!.toISOString(),
        totalAttachedTasks: attachedTasks.length,
        incompleteTasksCount: incompleteAttached.length,
        overdueTasksCount: overdueCount,
      },
      fingerprint,
    });
  }

  return signals;
}

// ---------------------------------------------------------------------------
// 3. DEPENDENCY_BOTTLENECK Detector
// ---------------------------------------------------------------------------

export function detectDependencyBottlenecks(context: SignalEvaluationContext): ProjectSignal[] {
  const { project, tasks, now = new Date() } = context;
  const signals: ProjectSignal[] = [];

  // Active incomplete tasks
  const activeIncompleteTasks = tasks.filter((t) => isTaskActive(t) && isTaskIncomplete(t));
  if (activeIncompleteTasks.length === 0) return signals;

  // Build dependency map: BlockerTaskId -> Downstream Task Objects
  const blockerMap = new Map<string, EvaluationTaskItem[]>();

  for (const downstream of activeIncompleteTasks) {
    if (!Array.isArray(downstream.dependencies) || downstream.dependencies.length === 0) continue;

    for (const depIdRaw of downstream.dependencies) {
      const depId = getIdStr(depIdRaw);
      if (!depId) continue;
      const existing = blockerMap.get(depId) || [];
      existing.push(downstream);
      blockerMap.set(depId, existing);
    }
  }

  // Evaluate candidate blocking tasks
  for (const [blockerId, downstreamList] of blockerMap.entries()) {
    // Blocker must be an active, incomplete task in this project
    const blockerTask = tasks.find((t) => getIdStr(t) === blockerId && isTaskActive(t) && isTaskIncomplete(t));
    if (!blockerTask) continue;

    const downstreamUrgentCount = downstreamList.filter((d) => d.priority === "urgent").length;
    const downstreamCount = downstreamList.length;

    // Must meet threshold: >= 3 downstream OR >= 1 urgent downstream
    const meetsThreshold = downstreamCount >= PROACTIVE_BOTTLENECK_THRESHOLD_TASKS || downstreamUrgentCount >= 1;
    if (!meetsThreshold) continue;

    // Severity rules
    let severity: ProjectRecommendationSeverity;
    if (downstreamUrgentCount >= 1 || downstreamCount >= 5) {
      severity = "HIGH";
    } else {
      severity = "MEDIUM";
    }

    // Sort downstream tasks deterministically by id ASC
    downstreamList.sort((a, b) => getIdStr(a).localeCompare(getIdStr(b)));

    const blockerRef: RelatedEntityRef = {
      type: "task",
      id: blockerId,
      label: blockerTask.title,
    };

    const downstreamRefs: RelatedEntityRef[] = downstreamList.map((d) => ({
      type: "task",
      id: getIdStr(d),
      label: d.title,
    }));

    const relatedEntities = [blockerRef, ...downstreamRefs];
    const downstreamIds = downstreamList.map((d) => getIdStr(d));
    const fingerprint = generateDependencyBottleneckFingerprint(blockerId, downstreamIds);

    const projId = getIdStr(project);
    const ownerId = getIdStr(project.owner);

    signals.push({
      type: "DEPENDENCY_BOTTLENECK",
      ownerId,
      projectId: projId,
      severity,
      detectedAt: now,
      relatedEntities,
      facts: {
        blockingTaskId: blockerId,
        blockingTaskTitle: blockerTask.title,
        downstreamCount,
        downstreamUrgentCount,
      },
      fingerprint,
    });
  }

  return signals;
}

// ---------------------------------------------------------------------------
// 4. PROJECT_STALLED Detector
// ---------------------------------------------------------------------------

export function detectProjectStalled(context: SignalEvaluationContext): ProjectSignal | null {
  const { project, tasks, activities = [], latestActivityDate, now = new Date() } = context;

  // Project eligibility check
  if (project.isDeleted || project.archived) return null;

  const validTasks = tasks.filter((t) => isTaskActive(t));
  if (validTasks.length < 3) return null; // Must contain total eligible tasks >= 3

  const incompleteTasks = validTasks.filter((t) => isTaskIncomplete(t));
  if (incompleteTasks.length === 0) return null; // Must have at least 1 incomplete task

  // Calculate latest activity timestamp across Task.updatedAt, Task.completedAt, Activity.createdAt, Project.createdAt
  let latestActivityMs = project.createdAt ? project.createdAt.getTime() : 0; // Baseline rule: never predate project creation

  if (project.updatedAt && project.updatedAt.getTime() > latestActivityMs) {
    latestActivityMs = project.updatedAt.getTime();
  }

  if (latestActivityDate && latestActivityDate.getTime() > latestActivityMs) {
    latestActivityMs = latestActivityDate.getTime();
  }

  for (const t of validTasks) {
    if (t.updatedAt && t.updatedAt.getTime() > latestActivityMs) {
      latestActivityMs = t.updatedAt.getTime();
    }
    if (t.completedAt && t.completedAt.getTime() > latestActivityMs) {
      latestActivityMs = t.completedAt.getTime();
    }
  }

  const actList = activities || [];
  for (const act of actList) {
    if (act.createdAt && act.createdAt.getTime() > latestActivityMs) {
      latestActivityMs = act.createdAt.getTime();
    }
  }

  const elapsedMs = Math.max(0, now.getTime() - latestActivityMs);
  const stalledDays = Math.floor(elapsedMs / 86400000);

  if (stalledDays < PROACTIVE_STALLED_THRESHOLD_DAYS) {
    return null; // Less than 7 days stalled -> No signal
  }

  let severity: ProjectRecommendationSeverity;
  if (stalledDays >= 14) {
    severity = "HIGH";
  } else {
    severity = "MEDIUM";
  }

  const projId = getIdStr(project);
  const ownerId = getIdStr(project.owner);

  const projectRef: RelatedEntityRef = {
    type: "project",
    id: projId,
    label: project.name,
  };

  const fingerprint = generateProjectStalledFingerprint(projId, stalledDays);

  return {
    type: "PROJECT_STALLED",
    ownerId,
    projectId: projId,
    severity,
    detectedAt: now,
    relatedEntities: [projectRef],
    facts: {
      stalledDays,
      incompleteTaskCount: incompleteTasks.length,
      lastActivityDate: new Date(latestActivityMs).toISOString(),
    },
    fingerprint,
  };
}
