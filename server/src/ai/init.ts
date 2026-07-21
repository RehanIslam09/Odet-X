import { promptRegistry } from './prompts/registry/prompt.registry';
import { projectToTasksPrompt } from './prompts/definitions/project-tasks.prompt';

/**
 * Initializes the AI subsystem by registering all known prompts into the central registry.
 * This should be imported exactly once during application startup.
 */
export function initializeAI() {
  promptRegistry.register(projectToTasksPrompt);
}
