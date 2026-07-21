import { PromptTemplate } from '../types.js';
import { validatePromptTemplate, PromptValidationError } from '../validation/prompt.validator.js';

/**
 * A simple in-memory registry for organizing and retrieving prompt definitions.
 * Future features will register their prompts here on startup.
 */
class PromptRegistry {
  private templates: Map<string, PromptTemplate> = new Map();

  /**
   * Registers a new prompt template.
   * Validates the template and prevents duplicate registrations.
   *
   * @param template The PromptTemplate to register.
   * @throws PromptValidationError if invalid or already registered.
   */
  public register(template: PromptTemplate): void {
    validatePromptTemplate(template);

    const { name } = template.metadata;
    if (this.templates.has(name)) {
      throw new PromptValidationError(`A prompt with the name '${name}' is already registered.`);
    }

    this.templates.set(name, template);
  }

  /**
   * Retrieves a prompt template by its name.
   * Note: Versioning is for observability metadata only; retrieval is strictly by name.
   *
   * @param name The name of the prompt.
   * @returns The PromptTemplate.
   * @throws PromptValidationError if the prompt is not found.
   */
  public get(name: string): PromptTemplate {
    const template = this.templates.get(name);
    if (!template) {
      throw new PromptValidationError(`Prompt '${name}' not found in registry.`);
    }
    return template;
  }

  /**
   * Lists all registered prompt templates.
   */
  public list(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * Clears the registry (useful for testing).
   */
  public clear(): void {
    this.templates.clear();
  }
}

// Export a singleton instance
export const promptRegistry = new PromptRegistry();
