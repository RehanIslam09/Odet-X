import { z } from 'zod';
import { GeneratePlanResponseSchema, GeneratePlanResponse } from '../../../schemas/project-plan.schema.js';
import { EvaluationFixture } from '../../types/evaluation.types.js';

/**
 * Zod schema for task/milestone quality concepts in planning ground truth.
 */
export const ExpectedConceptSchema = z.object({
  id: z.string().min(1, 'Concept ID is required'),
  concept: z.string().min(1, 'Concept description is required'),
  keywords: z.array(z.string().min(1)).min(1, 'At least one keyword is required'),
  required: z.boolean().default(true),
});

/**
 * Zod schema for expected dependency edges in ground truth.
 */
export const ExpectedDependencyEdgeSchema = z.object({
  prerequisiteConcept: z.string().min(1, 'Prerequisite concept is required'),
  dependentConcept: z.string().min(1, 'Dependent concept is required'),
  reason: z.string().min(1, 'Dependency reason is required'),
});

/**
 * Zod schema for planning ground truth requirements.
 */
export const ProjectPlanGroundTruthSchema = z.object({
  expectedTasks: z.array(ExpectedConceptSchema),
  expectedMilestones: z.array(ExpectedConceptSchema).default([]),
  groundedContextFacts: z.array(z.string()).default([]),
  forbiddenClaims: z.array(z.string()).default([]),
  expectedDependencyEdges: z.array(ExpectedDependencyEdgeSchema).default([]),
});

export type ExpectedConcept = z.infer<typeof ExpectedConceptSchema>;
export type ExpectedDependencyEdge = z.infer<typeof ExpectedDependencyEdgeSchema>;
export type ProjectPlanGroundTruth = z.infer<typeof ProjectPlanGroundTruthSchema>;

/**
 * Validates generic structural invariants of an EvaluationFixture.
 */
export function validateFixtureStructure<TInput, TGroundTruth, TCandidate>(
  fixture: EvaluationFixture<TInput, TGroundTruth, TCandidate>
): void {
  if (!fixture.fixtureId || typeof fixture.fixtureId !== 'string' || fixture.fixtureId.trim().length === 0) {
    throw new Error('Fixture ID must be a non-empty string.');
  }
  if (!fixture.name || typeof fixture.name !== 'string' || fixture.name.trim().length === 0) {
    throw new Error('Fixture name must be a non-empty string.');
  }
  if (!fixture.targetCapability || typeof fixture.targetCapability !== 'string') {
    throw new Error('Fixture targetCapability must be a non-empty string.');
  }
  if (!fixture.version || typeof fixture.version !== 'string') {
    throw new Error('Fixture version must be a non-empty string.');
  }
  if (!fixture.candidateOutputs || typeof fixture.candidateOutputs !== 'object') {
    throw new Error('Fixture must contain a candidateOutputs object.');
  }
  if (!fixture.candidateOutputs.knownGood) {
    throw new Error('Fixture candidateOutputs must contain a knownGood candidate.');
  }
  if (!fixture.candidateOutputs.knownRegression) {
    throw new Error('Fixture candidateOutputs must contain a knownRegression candidate.');
  }
}

/**
 * Validates a planning golden fixture by combining generic structural validation,
 * ground-truth schema validation, and production GeneratePlanResponseSchema parsing.
 */
export function validatePlanningFixture(
  fixture: EvaluationFixture<{ description: string }, ProjectPlanGroundTruth, GeneratePlanResponse>
): void {
  // 1. Generic structural validation
  validateFixtureStructure(fixture);

  // 2. Planning Ground Truth validation
  ProjectPlanGroundTruthSchema.parse(fixture.groundTruth);

  // 3. Candidate outputs validation against production GeneratePlanResponseSchema
  for (const [candidateKey, candidateOutput] of Object.entries(fixture.candidateOutputs)) {
    try {
      GeneratePlanResponseSchema.parse(candidateOutput);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Candidate output '${candidateKey}' in fixture '${fixture.fixtureId}' failed production schema validation: ${msg}`,
        { cause: err }
      );
    }
  }
}
