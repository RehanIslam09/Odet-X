import { PromptTemplate, PromptSection } from '../types';

/**
 * Assembles a prompt template into a single, deterministic string.
 * This is a pure functional utility. It assumes the template is already validated.
 *
 * It wraps each section in XML-style tags using the section's identifier.
 * Example: <context>...</context>
 *
 * @param template The structured prompt template to build.
 * @returns The fully assembled prompt string.
 */
export function buildPrompt(template: PromptTemplate): string {
  const assembledSections = template.sections
    .map(buildSection)
    .filter((content) => content.length > 0);

  return assembledSections.join('\n\n');
}

/**
 * Normalizes spacing and wraps a section in its XML delimiters.
 * Ignores completely empty sections.
 */
function buildSection(section: PromptSection): string {
  const content = section.content.trim();
  if (!content) {
    return '';
  }

  const tag = section.identifier.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `<${tag}>\n${content}\n</${tag}>`;
}
