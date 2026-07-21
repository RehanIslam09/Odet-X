import { PromptTemplate } from '../types.js';
import { AIConfigurationError } from '../../errors/ai.errors.js';

/**
 * Custom error for prompt definition issues, extending AIConfigurationError.
 */
export class PromptValidationError extends AIConfigurationError {
  constructor(message: string) {
    super(`Prompt Validation Error: ${message}`);
  }
}

/**
 * Validates a PromptTemplate structure.
 * Separates validation logic from the builder to adhere to Single Responsibility.
 *
 * @param template The template to validate.
 * @throws PromptValidationError if the template is malformed.
 */
export function validatePromptTemplate(template: PromptTemplate): void {
  if (!template) {
    throw new PromptValidationError('Template is undefined or null.');
  }

  if (!template.metadata) {
    throw new PromptValidationError('Template is missing metadata.');
  }

  if (!template.metadata.name || template.metadata.name.trim() === '') {
    throw new PromptValidationError('Template metadata must include a valid name.');
  }

  if (!template.metadata.version || template.metadata.version.trim() === '') {
    throw new PromptValidationError(`Template '${template.metadata.name}' must include a version.`);
  }

  if (!template.sections || !Array.isArray(template.sections) || template.sections.length === 0) {
    throw new PromptValidationError(`Template '${template.metadata.name}' must contain at least one section.`);
  }

  const identifiers = new Set<string>();

  for (const section of template.sections) {
    if (!section.identifier || section.identifier.trim() === '') {
      throw new PromptValidationError(`Template '${template.metadata.name}' contains a section without an identifier.`);
    }

    const normalizedTag = section.identifier.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    
    if (identifiers.has(normalizedTag)) {
      throw new PromptValidationError(`Template '${template.metadata.name}' contains duplicate section identifier: '${section.identifier}'.`);
    }
    
    identifiers.add(normalizedTag);
  }

  // Enforce required structural sections
  if (!identifiers.has('system')) {
    throw new PromptValidationError(`Template '${template.metadata.name}' is missing a required 'system' section.`);
  }

  if (!identifiers.has('intent')) {
    throw new PromptValidationError(`Template '${template.metadata.name}' is missing a required 'intent' section.`);
  }
}
