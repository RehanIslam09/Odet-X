import { promptRegistry } from './prompts/registry/prompt.registry.js';
import { projectToTasksPrompt } from './prompts/definitions/project-tasks.prompt.js';
import { taskAutoLabelPrompt } from './prompts/definitions/task-labels.prompt.js';

/**
 * Initializes the AI subsystem by registering all known prompts into the central registry.
 * This should be imported exactly once during application startup.
 */
export function initializeAI() {
  promptRegistry.register(projectToTasksPrompt);
  promptRegistry.register(taskAutoLabelPrompt);
}
