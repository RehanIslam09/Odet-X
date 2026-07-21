import { Types } from "mongoose";
import Project, { IProjectDocument } from "@/models/project.model.js";
import Task from "@/models/task.model.js";
import { NotFoundError, BadRequestError } from "@/utils/app-error.js";
import { AIModelTier } from '../ai/types/index.js';
import { aiService } from "@/ai/ai.service.js";
import { promptRegistry } from "@/ai/prompts/registry/prompt.registry.js";
import { GeneratedProjectSummarySchema } from "@/ai/schemas/project-summary.schema.js";
import { updateProject } from "./project.service.js";

/**
 * Ensures the project exists and belongs to the user.
 */
async function assertProjectOwnership(
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

  return project;
}

/**
 * Normalizes string arrays by trimming and removing empty values.
 */
function normalizeAndDeduplicate(items: string[], maxLength: number = 100): string[] {
  const normalized = items
    .map(item => item.trim().replace(/\s+/g, ' '))
    .filter(item => item.length > 0 && item.length <= maxLength);
    
  return [...new Set(normalized)];
}

/**
 * Orchestrates the generation of an intelligent project summary using AI.
 * Validates output against domain rules and persists the summary via ProjectService.
 */
export async function generateSummaryForProject(
  projectId: string,
  userId: string
) {
  // 1. Context Preparation
  const project = await assertProjectOwnership(projectId, userId);

  // Load active tasks (non-archived, non-deleted)
  const activeTasks = await Task.find({
    projectId: new Types.ObjectId(projectId),
    owner: new Types.ObjectId(userId),
    isDeleted: false,
    archived: false
  }).select('title description status priority labels').lean();

  // Construct a dedicated, lightweight AI context (omit internal IDs and metadata)
  const projectContext = {
    title: project.name,
    description: project.description
  };

  const tasksContext = activeTasks.map(t => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    labels: t.labels || []
  }));

  // 2. Prompt Preparation
  const templateBlueprint = promptRegistry.get('project-summary');
  
  const dynamicSections = [
    ...templateBlueprint.sections,
    {
      identifier: 'context',
      content: `Project Details:\n${JSON.stringify(projectContext, null, 2)}\n\nTasks:\n${JSON.stringify(tasksContext, null, 2)}`
    }
  ];

  const executableTemplate = {
    metadata: templateBlueprint.metadata,
    sections: dynamicSections
  };

  // 3. AI Execution & Zod Validation
  const result = await aiService.generateStructuredData(
    executableTemplate,
    GeneratedProjectSummarySchema,
    { tier: AIModelTier.DEEP_CONTEXT }
  );

  const { summary, highlights, risks } = result.data;

  // 4. Domain / Business Validation & Normalization
  const normalizedSummary = summary.trim();
  if (normalizedSummary.length < 10) {
    throw new BadRequestError("AI generated an invalid or empty summary.");
  }

  // Deduplicate and enforce max length per item (e.g., 200 characters to prevent abuse)
  const normalizedHighlights = normalizeAndDeduplicate(highlights, 200).slice(0, 5);
  const normalizedRisks = normalizeAndDeduplicate(risks, 200).slice(0, 5);

  const aiSummary = {
    summary: normalizedSummary,
    highlights: normalizedHighlights,
    risks: normalizedRisks
  };

  // 5. Persistence
  const updatedProject = await updateProject(projectId, userId, { aiSummary } as any);

  return updatedProject;
}
