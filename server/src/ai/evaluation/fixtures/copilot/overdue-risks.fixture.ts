import { EvaluationFixture } from "../../types/evaluation.types.js";
import { ProjectCopilotResponse } from "../../../schemas/project-copilot.schema.js";
import { CopilotFixtureInput, ProjectCopilotGroundTruth } from "../schemas/copilot-fixture.schema.js";

export const FIXTURE_COPILOT_OVERDUE_RISKS_ID = "fix_copilot_overdue_risks_v1";

export const copilotOverdueRisksFixture: EvaluationFixture<
  CopilotFixtureInput,
  ProjectCopilotGroundTruth,
  ProjectCopilotResponse
> = {
  fixtureId: FIXTURE_COPILOT_OVERDUE_RISKS_ID,
  name: "Copilot Overdue Risks Grounding Scenario",
  description:
    "Verifies that Copilot correctly prioritizes incomplete overdue and urgent tasks over completed tasks and avoids hallucinating risk status.",
  targetCapability: "project-copilot",
  version: "1.0.0",

  input: {
    question: "What are the most critical overdue risks in this project right now?",
    contextSummary:
      "Task 1 ('Migrate Payment Gateway', task_1) is overdue and urgent (status: in_progress). Task 2 ('Update Footer Links', task_2) is completed. Milestone 1 ('v1.0 Launch', ms_1) target date is next week.",
  },

  groundTruth: {
    expectedConcepts: [
      {
        id: "concept_payment_overdue",
        concept: "Migrate Payment Gateway is overdue and represents critical risk",
        keywords: ["migrate payment gateway", "payment gateway", "overdue", "risk"],
        required: true,
      },
    ],
    forbiddenClaims: [
      "Update Footer Links is overdue",
      "Migrate Payment Gateway is completed",
    ],
    validSymbolicMap: {
      projects: {
        proj_1: "64f000000000000000000001",
      },
      tasks: {
        task_1: "64f000000000000000000101",
        task_2: "64f000000000000000000102",
      },
      milestones: {
        ms_1: "64f000000000000000000201",
      },
    },
    expectedSymbolicRefs: ["task_1", "ms_1"],
  },

  candidateOutputs: {
    knownGood: {
      answer:
        "The primary risk is Task 1 ('Migrate Payment Gateway') which is currently overdue and urgent, threatening Milestone 1 ('v1.0 Launch').",
      references: [
        { type: "task", ref: "task_1" },
        { type: "milestone", ref: "ms_1" },
      ],
    },

    knownRegression: {
      answer:
        "Update Footer Links is overdue and high risk. Migrate Payment Gateway is completed.",
      references: [
        { type: "milestone", ref: "task_1" }, // Type mismatch: task_1 is a task, not milestone
      ],
    },
  },

  metadata: {
    author: "AI Engineering Team",
    createdAt: "2026-07-25T00:00:00.000Z",
    tags: ["copilot", "overdue", "risks", "grounding"],
  },
};
