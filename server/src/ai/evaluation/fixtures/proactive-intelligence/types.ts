import { ProjectSignalType, ProjectRecommendationSeverity, ProjectSignal } from "../../../../constants/proactive-intelligence.js";

/**
 * Single expected signal specification for deterministic detector evaluation.
 */
export interface ExpectedSignalSpec {
  type: ProjectSignalType;
  severity: ProjectRecommendationSeverity;
  expectedRelatedEntityIds?: string[];
}

/**
 * Input structured domain state for a deterministic signal detector fixture.
 */
export interface ProactiveSignalFixtureInput {
  now: Date;
  project: {
    _id: any;
    owner: any;
    name: string;
    description?: string;
    archived?: boolean;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  };
  tasks: Array<{
    _id: any;
    projectId: any;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: Date | null;
    milestoneId?: any;
    dependencies?: any[];
    isDeleted?: boolean;
    archived?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  milestones: Array<{
    _id: any;
    projectId: any;
    title: string;
    targetDate?: Date | null;
    status?: string;
    isDeleted?: boolean;
    archived?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  latestActivityDate?: Date | null;
}

/**
 * Deterministic signal evaluation fixture definition.
 */
export interface ProactiveSignalFixture {
  id: string;
  description: string;
  input: ProactiveSignalFixtureInput;
  expectedSignals: ExpectedSignalSpec[];
}

/**
 * Mocked enrichment scenario fixture for WP-03 AI / Grounding evaluator testing.
 */
export interface ProactiveEnrichmentFixture {
  id: string;
  description: string;
  signal: ProjectSignal;
  mockAiOutput?: any;
  mockAiError?: Error;
  expectedBehavior: "VALID_AI" | "FALLBACK" | "REJECTED_SCHEMA";
  expectedGroundingPass: boolean;
  expectedAuthorityPreserved: boolean;
  expectedAdvisoryPass: boolean;
  notes?: string;
}
