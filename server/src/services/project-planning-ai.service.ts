import { Types } from "mongoose";
import Project, { IProjectDocument } from "@/models/project.model.js";
import Task from "@/models/task.model.js";
import PlanDraft, { IPlanDraftDocument } from "@/models/plan-draft.model.js";
import { NotFoundError, BadRequestError } from "@/utils/app-error.js";
import { AIModelTier } from "../ai/types/index.js";
import { aiService } from "../ai/ai.service.js";
import { promptRegistry } from "@/ai/prompts/registry/prompt.registry.js";
import { GeneratePlanResponseSchema } from "@/ai/schemas/project-plan.schema.js";
import { validatePlan, PlanTaskInput, PlanMilestoneInput } from "@/domain/plan-validator.js";
import { PLAN_DRAFT_TTL_MS, PLAN_MAX_PROMPT_LENGTH } from "@/constants/planning.js";
import { recordActivity } from "./activity.service.js";
import { ACTIVITY_TYPES } from "@/constants/activity.js";

/**
 * Asserts that the project exists, belongs to the authenticated user, is not soft-deleted,
 * and is not archived.
 */
async function assertActiveProjectOwnership(
  projectId: string,
  userId: string
): Promise<IProjectDocument> {
  const project = await Project.findOne({
    _id: new Types.ObjectId(projectId),
    owner: new Types.ObjectId(userId),
    isDeleted: false,
  });

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  if (project.archived) {
    throw new BadRequestError("Cannot generate a plan for an archived project.");
  }

  return project;
}

/**
 * Orchestrates AI project plan generation:
 * 1. Validates user prompt bounds and project ownership/archival status.
 * 2. Fetches existing tasks for context.
 * 3. Calls AIService with DEEP_CONTEXT model tier.
 * 4. Validates raw response against Zod AI response schema.
 * 5. Normalizes AI symbolic references to canonical server-controlled tempIds.
 * 6. Executes pure domain DAG & reference validation via validatePlan.
 * 7. Discards any previous active draft for the project.
 * 8. Persists the new PlanDraft document.
 * 9. Records AI_PLAN_GENERATED activity audit log.
 *
 * Safety Invariant: AI generation NEVER creates permanent Task or Milestone documents.
 */
export async function generateProjectPlan(
  projectId: string,
  userId: string,
  promptDescription: string
): Promise<IPlanDraftDocument> {
  if (!promptDescription || promptDescription.trim().length === 0) {
    throw new BadRequestError("Planning requirements description cannot be empty.");
  }

  if (promptDescription.trim().length > PLAN_MAX_PROMPT_LENGTH) {
    throw new BadRequestError(`Planning requirements description cannot exceed ${PLAN_MAX_PROMPT_LENGTH} characters.`);
  }

  // 1. Authorize Project & Check Archival Status
  const project = await assertActiveProjectOwnership(projectId, userId);

  // Load existing tasks to provide context against duplication
  const existingTasks = await Task.find({
    projectId: new Types.ObjectId(projectId),
    owner: new Types.ObjectId(userId),
    isDeleted: false,
  }).select("title status").lean();

  const existingTaskContext = existingTasks
    .map((t) => `- ${t.title} [Status: ${t.status}]`)
    .join("\n");

  // 2. Prompt Preparation
  const templateBlueprint = promptRegistry.get("project-plan");

  const dynamicSections = [
    ...templateBlueprint.sections.filter((s) => s.identifier !== "intent"),
    {
      identifier: "context",
      content: `Project Name: ${project.name}\nProject Description: ${project.description || "None"}\n\nExisting Active Tasks (DO NOT DUPLICATE THESE):\n${existingTaskContext || "None"}`,
    },
    {
      identifier: "intent",
      content: `User Requirements & Goals: ${promptDescription.trim()}`,
    },
  ];

  const executableTemplate = {
    metadata: templateBlueprint.metadata,
    sections: dynamicSections,
  };

  // 3. AI Execution & Zod Validation (DEEP_CONTEXT Tier)
  const result = await aiService.generateStructuredData(
    executableTemplate,
    GeneratePlanResponseSchema,
    { tier: AIModelTier.DEEP_CONTEXT }
  );

  const rawAiPlan = result.data;

  // 4. Server-Controlled tempId Normalization & Reference Translation
  const taskRefMap = new Map<string, string>();
  const milestoneRefMap = new Map<string, string>();

  const rawMilestones = rawAiPlan.milestones || [];
  const normalizedMilestones: PlanMilestoneInput[] = [];

  for (let i = 0; i < rawMilestones.length; i++) {
    const rawMs = rawMilestones[i]!;
    const canonicalTempId = `temp_ms_${i + 1}`;
    taskRefMap.set(rawMs.ref, canonicalTempId); // Also track in namespace collision set if needed
    milestoneRefMap.set(rawMs.ref, canonicalTempId);

    let parsedTargetDate: Date | null = null;
    if (rawMs.targetDate) {
      const date = new Date(rawMs.targetDate);
      if (!isNaN(date.getTime())) {
        parsedTargetDate = date;
      }
    }

    normalizedMilestones.push({
      tempId: canonicalTempId,
      title: rawMs.title,
      description: rawMs.description || "",
      targetDate: parsedTargetDate,
      position: rawMs.position || i + 1,
    });
  }

  const rawTasks = rawAiPlan.tasks || [];
  const normalizedTaskTempMap = new Map<string, string>();
  for (let i = 0; i < rawTasks.length; i++) {
    const rawT = rawTasks[i]!;
    const canonicalTempId = `temp_task_${i + 1}`;
    normalizedTaskTempMap.set(rawT.ref, canonicalTempId);
  }

  const normalizedTasks: PlanTaskInput[] = [];
  for (let i = 0; i < rawTasks.length; i++) {
    const rawT = rawTasks[i]!;
    const canonicalTempId = normalizedTaskTempMap.get(rawT.ref)!;

    // Translate dependencies array
    const translatedDeps: string[] = [];
    for (const depRef of rawT.dependencies || []) {
      const canonicalDepId = normalizedTaskTempMap.get(depRef);
      if (!canonicalDepId) {
        throw new BadRequestError(`AI plan contained an unresolved dependency reference '${depRef}'.`);
      }
      translatedDeps.push(canonicalDepId);
    }

    // Translate milestone reference
    let canonicalMilestoneTempId: string | null = null;
    if (rawT.milestoneRef) {
      canonicalMilestoneTempId = milestoneRefMap.get(rawT.milestoneRef) || null;
      if (!canonicalMilestoneTempId) {
        throw new BadRequestError(`AI plan contained an unresolved milestone reference '${rawT.milestoneRef}'.`);
      }
    }

    normalizedTasks.push({
      tempId: canonicalTempId,
      title: rawT.title,
      description: rawT.description || "",
      priority: rawT.priority || "none",
      estimatedTime: rawT.estimatedTime || null,
      position: rawT.position || i + 1,
      dependencies: translatedDeps,
      milestoneTempId: canonicalMilestoneTempId,
    });
  }

  // 5. Domain DAG & Reference Validation
  const validatedPlan = validatePlan({
    tasks: normalizedTasks,
    milestones: normalizedMilestones,
  });

  // 6. Active Draft Replacement Semantics
  // Discard previous active draft AFTER confirming the new plan is 100% valid
  const existingActiveDraft = await PlanDraft.findOne({
    owner: new Types.ObjectId(userId),
    projectId: new Types.ObjectId(projectId),
    status: "draft",
  });

  if (existingActiveDraft) {
    existingActiveDraft.status = "discarded";
    await existingActiveDraft.save();
  }

  // 7. Persist New PlanDraft
  const expiresAt = new Date(Date.now() + PLAN_DRAFT_TTL_MS);

  const draft = await PlanDraft.create({
    owner: new Types.ObjectId(userId),
    projectId: new Types.ObjectId(projectId),
    status: "draft",
    promptDescription: promptDescription.trim(),
    tasks: validatedPlan.tasks,
    milestones: validatedPlan.milestones,
    expiresAt,
  });

  // 8. Record Activity Audit Log
  await recordActivity({
    owner: userId,
    actorId: userId,
    type: ACTIVITY_TYPES.AI_PLAN_GENERATED,
    entityType: "project",
    entityId: projectId,
    projectId,
    contextProjectIds: [projectId],
    taskId: null,
    metadata: {
      draftId: draft._id.toString(),
      taskCount: draft.tasks.length,
      milestoneCount: draft.milestones.length,
      durationMs: result.metadata.durationMs,
    },
  });

  return draft;
}
