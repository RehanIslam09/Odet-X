import { Types } from "mongoose";
import Task, { ITaskDocument } from "@/models/task.model.js";
import Project, { IProjectDocument } from "@/models/project.model.js";
import { NotFoundError, BadRequestError } from "@/utils/app-error.js";
import { AIModelTier } from '../ai/types/index.js';
import { aiService } from "@/ai/ai.service.js";
import { promptRegistry } from "@/ai/prompts/registry/prompt.registry.js";
import { GeneratedLabelsSchema } from "@/ai/schemas/task-labels.schema.js";
import { updateTask } from "./task.service.js";

/**
 * Ensures the task exists, is not deleted, and belongs to the user.
 */
async function assertTaskOwnership(
  taskId: string,
  userId: string
): Promise<ITaskDocument> {
  const task = await Task.findOne({
    _id: new Types.ObjectId(taskId),
    owner: new Types.ObjectId(userId),
    isDeleted: false,
  });

  if (!task) {
    throw new NotFoundError("Task not found.");
  }

  return task;
}

/**
 * Normalizes a label by trimming, collapsing spaces, and converting to lowercase.
 */
function normalizeLabel(label: string): string {
  return label
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Orchestrates the generation of structured labels for a task using AI,
 * validates the output against domain rules, and persists them via TaskService.
 */
export async function generateLabelsForTask(
  taskId: string,
  userId: string
) {
  // 1. Context Preparation
  const task = await assertTaskOwnership(taskId, userId);
  
  let projectContext = "None";
  if (task.projectId) {
    const project = await Project.findById(task.projectId);
    if (project && !project.isDeleted) {
      projectContext = `Project Name: ${project.name}\nProject Description: ${project.description || 'None'}`;
    }
  }

  const existingLabels = task.labels || [];
  const existingLabelsText = existingLabels.length > 0 ? existingLabels.join(', ') : "None";

  // 2. Prompt Preparation
  const templateBlueprint = promptRegistry.get('task-auto-label');
  
  const dynamicSections = [
    ...templateBlueprint.sections.filter((s: any) => s.identifier !== 'intent'),
    {
      identifier: 'context',
      content: `${projectContext}\n\nExisting Task Labels: ${existingLabelsText}`
    },
    {
      identifier: 'intent',
      content: `Task Title: ${task.title}\nTask Description: ${task.description || 'None'}`
    }
  ];

  const executableTemplate = {
    metadata: templateBlueprint.metadata,
    sections: dynamicSections
  };

  // 3. AI Execution & Zod Validation
  const result = await aiService.generateStructuredData(
    executableTemplate,
    GeneratedLabelsSchema,
    { tier: AIModelTier.DEEP_CONTEXT }
  );

  const generatedLabels = result.data.labels;

  // 4. Domain / Business Validation & Normalization
  // Max AI generated labels = 5 (already checked by schema, but re-enforcing domain intent)
  // Total labels max = 10
  
  const normalizedExisting = existingLabels.map(normalizeLabel);
  const existingSet = new Set(normalizedExisting);
  
  const validNewLabels: string[] = [];
  
  for (const label of generatedLabels) {
    const normalized = normalizeLabel(label);
    
    // Filter invalid: empty, too long, invalid chars
    if (normalized.length === 0 || normalized.length > 30) continue;
    
    // Check duplicates against existing labels
    if (existingSet.has(normalized)) continue;
    
    // Check duplicates within the newly generated batch
    if (validNewLabels.includes(normalized)) continue;
    
    validNewLabels.push(normalized);
  }

  // Combine: existing + new
  // We keep all original existing labels (un-normalized to preserve case user typed)
  // and append new labels (which are normalized).
  const combinedLabels = [...existingLabels, ...validNewLabels];

  // Truncate to maximum 10 labels total per task domain rule
  const finalLabels = combinedLabels.slice(0, 10);

  // 5. Persistence
  // Call updateTask so activity logs are correctly generated
  const updatedTask = await updateTask(taskId, userId, { labels: finalLabels });

  return updatedTask;
}
