import { EvaluationFixture } from "../../types/evaluation.types.js";
import { ProjectCopilotResponse } from "../../../schemas/project-copilot.schema.js";
import { CopilotFixtureInput, ProjectCopilotGroundTruth } from "../schemas/copilot-fixture.schema.js";

export const FIXTURE_COPILOT_BLOCKERS_ID = "fix_copilot_blockers_v1";

export const copilotBlockersFixture: EvaluationFixture<
  CopilotFixtureInput,
  ProjectCopilotGroundTruth,
  ProjectCopilotResponse
> = {
  fixtureId: FIXTURE_COPILOT_BLOCKERS_ID,
  name: "Copilot Task Blockers Grounding Scenario",
  description:
    "Verifies that Copilot correctly identifies prerequisite blocking tasks and returns valid symbolic references without reversing dependency direction or inventing blockers.",
  targetCapability: "project-copilot",
  version: "1.0.0",

  input: {
    question: "Which task is blocking the authentication implementation and why?",
    contextSummary:
      "Task B ('Implement Login API Endpoint', task_2) depends on Task A ('Setup Auth Database Schema', task_1). Task A is incomplete and currently blocking Task B.",
  },

  groundTruth: {
    expectedConcepts: [
      {
        id: "concept_auth_db_blocker",
        concept: "Setup Auth Database Schema is the blocking prerequisite task",
        keywords: ["setup auth database schema", "auth database", "prerequisite"],
        required: true,
      },
    ],
    forbiddenClaims: [
      "Implement Login API Endpoint is blocking Setup Auth Database Schema",
      "all tasks are completed",
    ],
    validSymbolicMap: {
      projects: {
        proj_1: "64f000000000000000000001",
      },
      tasks: {
        task_1: "64f000000000000000000101",
        task_2: "64f000000000000000000102",
        task_3: "64f000000000000000000103",
      },
      milestones: {
        ms_1: "64f000000000000000000201",
      },
    },
    expectedSymbolicRefs: ["task_1", "task_2"],
  },

  candidateOutputs: {
    knownGood: {
      answer:
        "Task 1 ('Setup Auth Database Schema') is currently incomplete and blocking Task 2 ('Implement Login API Endpoint') because Login API requires the database schema to be configured first.",
      references: [
        { type: "task", ref: "task_1" },
        { type: "task", ref: "task_2" },
      ],
    },

    knownRegression: {
      answer:
        "Task 2 ('Implement Login API Endpoint') is blocking Setup Auth Database Schema. Everything else is blocked by task 999.",
      references: [
        { type: "task", ref: "task_2" },
        { type: "task", ref: "task_999" }, // Hallucinated reference
      ],
    },
  },

  metadata: {
    author: "AI Engineering Team",
    createdAt: "2026-07-25T00:00:00.000Z",
    tags: ["copilot", "blockers", "dependencies", "grounding"],
  },
};
