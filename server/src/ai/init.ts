import { promptRegistry } from './prompts/registry/prompt.registry.js';
import { projectToTasksPrompt } from './prompts/definitions/project-tasks.prompt.js';
import { taskAutoLabelPrompt } from './prompts/definitions/task-labels.prompt.js';
import { projectSummaryPrompt } from './prompts/definitions/project-summary.prompt.js';
import { projectPlanPrompt } from './prompts/definitions/project-plan.prompt.js';

/**
 * Initializes the AI subsystem by registering all known prompts into the central registry.
 * This should be imported exactly once during application startup.
 */
export function initializeAI() {
  promptRegistry.register(projectToTasksPrompt);
  promptRegistry.register(taskAutoLabelPrompt);
  promptRegistry.register(projectSummaryPrompt);
  promptRegistry.register(projectPlanPrompt);
}
