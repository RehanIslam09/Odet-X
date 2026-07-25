import { z } from "zod";

/**
 * Zod schema for symbolic references returned by the Copilot AI model.
 * The AI returns ONLY entity type and symbolic ref string (e.g. "task_1", "ms_2", "project").
 * Raw ObjectIds, labels, and database keys are prohibited in the AI schema.
 */
export const ProjectCopilotReferenceSchema = z.object({
  type: z.enum(["project", "task", "milestone"]),
  ref: z.string().min(1).max(50),
});

/**
 * Zod schema for structured output from the Read-Only Project Copilot AI model.
 */
export const ProjectCopilotResponseSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(1, "Copilot answer cannot be empty")
    .max(10000, "Copilot answer cannot exceed 10,000 characters"),
  references: z.array(ProjectCopilotReferenceSchema).max(20, "Maximum 20 references allowed").default([]),
});

export type ProjectCopilotReference = z.infer<typeof ProjectCopilotReferenceSchema>;
export type ProjectCopilotResponse = z.infer<typeof ProjectCopilotResponseSchema>;
