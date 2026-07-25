import { z } from "zod";
import { ProjectCopilotResponseSchema, ProjectCopilotResponse } from "../../../schemas/project-copilot.schema.js";
import { EvaluationFixture } from "../../types/evaluation.types.js";
import { validateFixtureStructure } from "./fixture.schema.js";

export const CopilotExpectedConceptSchema = z.object({
  id: z.string().min(1, "Concept ID is required"),
  concept: z.string().min(1, "Concept description is required"),
  keywords: z.array(z.string().min(1)).min(1, "At least one keyword is required"),
  required: z.boolean().default(true),
});

export const CopilotValidSymbolicMapSchema = z.object({
  projects: z.record(z.string(), z.string()).default({}),
  tasks: z.record(z.string(), z.string()).default({}),
  milestones: z.record(z.string(), z.string()).default({}),
});

export const ProjectCopilotGroundTruthSchema = z.object({
  expectedConcepts: z.array(CopilotExpectedConceptSchema),
  forbiddenClaims: z.array(z.string()).optional().default([]),
  validSymbolicMap: CopilotValidSymbolicMapSchema,
  expectedSymbolicRefs: z.array(z.string()).optional().default([]),
});

export type CopilotExpectedConcept = z.infer<typeof CopilotExpectedConceptSchema>;
export type CopilotValidSymbolicMap = z.infer<typeof CopilotValidSymbolicMapSchema>;
export type ProjectCopilotGroundTruth = z.infer<typeof ProjectCopilotGroundTruthSchema>;

export interface CopilotFixtureInput {
  question: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  contextSummary?: string;
}

/**
 * Validates a Copilot golden fixture by combining generic structural validation,
 * ground-truth schema validation, and production ProjectCopilotResponseSchema parsing.
 */
export function validateCopilotFixture(
  fixture: EvaluationFixture<CopilotFixtureInput, ProjectCopilotGroundTruth, ProjectCopilotResponse>,
): void {
  // 1. Generic structural validation
  validateFixtureStructure(fixture);

  // 2. Copilot Ground Truth validation
  ProjectCopilotGroundTruthSchema.parse(fixture.groundTruth);

  // 3. Candidate outputs validation against production ProjectCopilotResponseSchema
  for (const [candidateKey, candidateOutput] of Object.entries(fixture.candidateOutputs)) {
    try {
      ProjectCopilotResponseSchema.parse(candidateOutput);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Candidate output '${candidateKey}' in fixture '${fixture.fixtureId}' failed production schema validation: ${msg}`,
        { cause: err },
      );
    }
  }
}
