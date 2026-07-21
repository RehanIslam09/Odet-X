/**
 * Pure functions to build modular, immutable prompts.
 */

/**
 * Builds the complete prompt by combining system instructions, user context, and intent.
 * It uses explicit structural delimiters to protect against prompt injection.
 *
 * @param systemInstructions Immutable behavioral guidelines (e.g., 'You are a project manager...').
 * @param context The specific domain data provided by the user (e.g., Task Notes, Project Description).
 * @param intent The specific action requested (e.g., 'Extract action items from the notes').
 * @returns The fully constructed prompt string.
 */
export function buildPrompt(systemInstructions: string, context: string, intent: string): string {
  return `
${buildSystemPrompt(systemInstructions)}

${buildContext(context)}

<intent>
${intent}
</intent>
`.trim();
}

/**
 * Formats the immutable system instructions.
 */
export function buildSystemPrompt(instructions: string): string {
  return `
<system_instructions>
${instructions}
</system_instructions>
`.trim();
}

/**
 * Formats the user-provided context. Wrapping user context in tags prevents
 * the LLM from confusing user text with system instructions.
 */
export function buildContext(context: string): string {
  return `
<context>
${context}
</context>
`.trim();
}
