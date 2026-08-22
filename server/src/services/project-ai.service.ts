import { Types } from "mongoose";
import Task from "@/models/task.model.js";
import { BadRequestError } from "@/utils/app-error.js";
import { AIModelTier } from '../ai/types/index.js';
import { aiService } from "../ai/ai.service.js";
import { promptRegistry } from "@/ai/prompts/registry/prompt.registry.js";
import { GenerateTasksResponseSchema } from "@/ai/schemas/project-tasks.schema.js";
import { createTask } from "./task.service.js";
import { getProjectById } from "./project.service.js";

/**
 * Orchestrates the generation of structured tasks for a project using AI,
 * validates the output against domain rules, and persists the tasks.
 * 
 * @param projectId The ID of the project to generate tasks for
 * @param userId The ID of the user requesting task generation
 * @param description Unstructured text describing the project and desired tasks
 * @param workspaceId Optional active workspace ID
 * @returns Array of created task documents
 */
export async function generateTasksForProject(
  projectId: string,
  userId: string,
  description: string,
  workspaceId?: string,
) {
  if (!description || description.trim().length === 0) {
    throw new BadRequestError("Project description cannot be empty.");
  }

  // 1. Context Preparation
  const project = await getProjectById(projectId, userId, workspaceId);

  // Load existing tasks to provide context against duplicates
  const existingTasks = await Task.find({
    projectId: new Types.ObjectId(projectId),
    isDeleted: false,
  }).select('title').lean();

  const existingTitles = existingTasks.map(t => t.title);

  // 2. Prompt Preparation
  // Retrieve the blueprint from the registry
  const templateBlueprint = promptRegistry.get('project-to-tasks');
  
  // Clone sections and append dynamic user context, replacing the static intent
  const dynamicSections = [
    ...templateBlueprint.sections.filter((s: any) => s.identifier !== 'intent'),
    {
      identifier: 'context',
      content: `Project Name: ${project.name}\nProject Description: ${project.description || 'None'}\n\nExisting Task Titles (DO NOT DUPLICATE THESE):\n${existingTitles.length > 0 ? existingTitles.join('\n') : 'None'}`
    },
    {
      identifier: 'intent',
      content: `User Request: ${description}`
    }
  ];

  const executableTemplate = {
    metadata: templateBlueprint.metadata,
    sections: dynamicSections
  };

  // 3. AI Execution & Zod Validation
  // The aiService strictly validates the response against GenerateTasksResponseSchema.
  const result = await aiService.generateStructuredData(
    executableTemplate,
    GenerateTasksResponseSchema,
    { tier: AIModelTier.DEEP_CONTEXT } // High reasoning tier for task planning
  );

  const generatedTasks = result.data.tasks;

  // 4. Domain / Business Validation
  const validTasksToCreate: any[] = [];
  const normalizedExistingTitles = new Set(existingTitles.map(t => t.toLowerCase().trim()));

  for (const t of generatedTasks) {
    const title = t.title.trim();
    if (!title || title.length > 120) continue; // Skip invalid titles
    
    // De-duplicate against existing tasks
    if (normalizedExistingTitles.has(title.toLowerCase())) continue;

    // De-duplicate within the same AI response
    if (validTasksToCreate.some(v => v.title.toLowerCase() === title.toLowerCase())) continue;

    validTasksToCreate.push({
      projectId,
      title: title,
      description: t.description || '',
      priority: t.priority || 'none',
      estimatedTime: t.estimatedTime || null,
      status: 'todo' as const,
      labels: [],
    });
  }

  if (validTasksToCreate.length === 0) {
    throw new BadRequestError("AI did not generate any new actionable tasks. They may be duplicates of existing tasks.");
  }

  // 5. Persistence
  // We sequentially call createTask to ensure activity logging and domain boundaries are preserved.
  const targetWsId = workspaceId || (project.workspaceId ? project.workspaceId.toString() : undefined);
  const createdTasks = [];
  for (const taskData of validTasksToCreate) {
    const createdTask = await createTask(userId, taskData, targetWsId);
    createdTasks.push(createdTask);
  }

  return createdTasks;
}
