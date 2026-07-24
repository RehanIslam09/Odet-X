import { PLAN_MAX_MILESTONES, PLAN_MAX_TASKS } from "@/constants/planning.js";
import { BadRequestError } from "@/utils/app-error.js";

export interface PlanTaskInput {
  tempId: string;
  title: string;
  description?: string;
  priority?: "none" | "low" | "medium" | "high" | "urgent";
  estimatedTime?: string | null;
  position: number;
  dependencies?: string[];
  milestoneTempId?: string | null;
}

export interface PlanMilestoneInput {
  tempId: string;
  title: string;
  description?: string;
  targetDate?: Date | string | null;
  position: number;
}

export interface PlanInput {
  tasks: PlanTaskInput[];
  milestones?: PlanMilestoneInput[];
}

export interface ValidatedPlan {
  tasks: Array<{
    tempId: string;
    title: string;
    description: string;
    priority: "none" | "low" | "medium" | "high" | "urgent";
    estimatedTime: string | null;
    position: number;
    dependencies: string[];
    milestoneTempId: string | null;
  }>;
  milestones: Array<{
    tempId: string;
    title: string;
    description: string;
    targetDate: Date | null;
    position: number;
  }>;
}

/**
 * Pure domain utility for validating plan structure, tempId uniqueness,
 * milestone references, cardinality bounds, and Directed Acyclic Graph (DAG) cycle rules.
 */
export function validatePlan(input: PlanInput): ValidatedPlan {
  if (!input || typeof input !== "object") {
    throw new BadRequestError("Plan payload must be an object.");
  }

  const rawTasks = input.tasks || [];
  const rawMilestones = input.milestones || [];

  // 1. Cardinality Validation
  if (rawTasks.length > PLAN_MAX_TASKS) {
    throw new BadRequestError(`Plan task count cannot exceed ${PLAN_MAX_TASKS}.`);
  }
  if (rawMilestones.length > PLAN_MAX_MILESTONES) {
    throw new BadRequestError(`Plan milestone count cannot exceed ${PLAN_MAX_MILESTONES}.`);
  }

  // 2. TempId Uniqueness & Uniqueness Scope
  const taskTempIds = new Set<string>();
  const milestoneTempIds = new Set<string>();

  const validatedMilestones: ValidatedPlan["milestones"] = [];
  for (const ms of rawMilestones) {
    if (!ms.tempId || typeof ms.tempId !== "string" || ms.tempId.trim().length === 0) {
      throw new BadRequestError("Milestone tempId must be a non-empty string.");
    }
    const tempId = ms.tempId.trim();
    if (milestoneTempIds.has(tempId)) {
      throw new BadRequestError(`Duplicate milestone tempId '${tempId}' found in plan.`);
    }
    milestoneTempIds.add(tempId);

    if (!ms.title || typeof ms.title !== "string" || ms.title.trim().length === 0) {
      throw new BadRequestError(`Milestone '${tempId}' title cannot be empty.`);
    }
    if (ms.title.trim().length > 120) {
      throw new BadRequestError(`Milestone '${tempId}' title cannot exceed 120 characters.`);
    }

    if (typeof ms.position !== "number" || !Number.isInteger(ms.position) || ms.position < 1) {
      throw new BadRequestError(`Milestone '${tempId}' position must be an integer >= 1.`);
    }

    let parsedTargetDate: Date | null = null;
    if (ms.targetDate) {
      parsedTargetDate = new Date(ms.targetDate);
      if (isNaN(parsedTargetDate.getTime())) {
        throw new BadRequestError(`Milestone '${tempId}' targetDate is invalid.`);
      }
    }

    validatedMilestones.push({
      tempId,
      title: ms.title.trim(),
      description: ms.description ? ms.description.trim() : "",
      targetDate: parsedTargetDate,
      position: ms.position,
    });
  }

  const validatedTasks: ValidatedPlan["tasks"] = [];
  for (const t of rawTasks) {
    if (!t.tempId || typeof t.tempId !== "string" || t.tempId.trim().length === 0) {
      throw new BadRequestError("Task tempId must be a non-empty string.");
    }
    const tempId = t.tempId.trim();
    if (taskTempIds.has(tempId)) {
      throw new BadRequestError(`Duplicate task tempId '${tempId}' found in plan.`);
    }
    if (milestoneTempIds.has(tempId)) {
      throw new BadRequestError(`tempId '${tempId}' collides between task and milestone namespaces.`);
    }
    taskTempIds.add(tempId);

    if (!t.title || typeof t.title !== "string" || t.title.trim().length === 0) {
      throw new BadRequestError(`Task '${tempId}' title cannot be empty.`);
    }
    if (t.title.trim().length > 120) {
      throw new BadRequestError(`Task '${tempId}' title cannot exceed 120 characters.`);
    }

    if (typeof t.position !== "number" || !Number.isInteger(t.position) || t.position < 1) {
      throw new BadRequestError(`Task '${tempId}' position must be an integer >= 1.`);
    }

    // Milestone reference check
    const milestoneTempId = t.milestoneTempId ? t.milestoneTempId.trim() : null;
    if (milestoneTempId && !milestoneTempIds.has(milestoneTempId)) {
      throw new BadRequestError(
        `Task '${tempId}' references non-existent milestoneTempId '${milestoneTempId}'.`
      );
    }

    // Dependency normalization & self-reference check
    const rawDeps = t.dependencies || [];
    const normalizedDeps: string[] = [];
    const seenDeps = new Set<string>();

    for (const depRaw of rawDeps) {
      const dep = typeof depRaw === "string" ? depRaw.trim() : "";
      if (!dep) continue;

      if (dep === tempId) {
        throw new BadRequestError(`Task '${tempId}' cannot depend on itself.`);
      }

      if (!seenDeps.has(dep)) {
        seenDeps.add(dep);
        normalizedDeps.push(dep);
      }
    }

    validatedTasks.push({
      tempId,
      title: t.title.trim(),
      description: t.description ? t.description.trim() : "",
      priority: t.priority || "none",
      estimatedTime: t.estimatedTime || null,
      position: t.position,
      dependencies: normalizedDeps,
      milestoneTempId,
    });
  }

  // 3. Reference Integrity & DAG Cycle Detection
  for (const t of validatedTasks) {
    for (const dep of t.dependencies) {
      if (!taskTempIds.has(dep)) {
        throw new BadRequestError(`Task '${t.tempId}' depends on non-existent tempId '${dep}'.`);
      }
    }
  }

  // Topological Sort (Kahn's Algorithm) for DAG Cycle Detection
  // Task B.dependencies = [Task A] => Task A must precede Task B (Edge: Task A -> Task B)
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const t of validatedTasks) {
    inDegree.set(t.tempId, 0);
    graph.set(t.tempId, []);
  }

  for (const t of validatedTasks) {
    for (const prerequisite of t.dependencies) {
      // Prerequisite precedes t => Edge: Prerequisite -> t
      const dependents = graph.get(prerequisite) || [];
      dependents.push(t.tempId);
      graph.set(prerequisite, dependents);

      inDegree.set(t.tempId, (inDegree.get(t.tempId) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [tempId, count] of inDegree.entries()) {
    if (count === 0) {
      queue.push(tempId);
    }
  }

  let visitedCount = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    visitedCount++;

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      const currentInDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, currentInDegree);
      if (currentInDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (visitedCount !== validatedTasks.length) {
    throw new BadRequestError("Dependency cycle detected in plan. Task dependencies must form a Directed Acyclic Graph (DAG).");
  }

  return {
    tasks: validatedTasks,
    milestones: validatedMilestones,
  };
}
