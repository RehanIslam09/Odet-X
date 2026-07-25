import { ProposedAction } from "../../../actions/action.types.js";

export interface CopilotActionFixture {
  fixtureId: string;
  scenarioName: string;
  userQuestion: string;
  symbolicMap: Record<string, { type: "project" | "task" | "milestone"; id: string; label: string }>;
  groundTruth: {
    expectedAction?: ProposedAction | null;
    expectNoAction?: boolean;
  };
  candidates: {
    name: string;
    output: {
      answer: string;
      references: { type: "project" | "task" | "milestone"; ref: string }[];
      proposedAction: ProposedAction | { action: string; targetRef: string; explanation?: string } | null;
    };
  }[];
}

export const fixtureA_ValidStatusUpdate: CopilotActionFixture = {
  fixtureId: "fix_copilot_action_valid_status_update",
  scenarioName: "Valid Task Status Update Proposal",
  userQuestion: "Mark the auth controller task as done",
  symbolicMap: {
    project: { type: "project", id: "64f000000000000000000001", label: "Alpha Project" },
    task_1: { type: "task", id: "64f000000000000000000100", label: "Auth Controller Task" },
  },
  groundTruth: {
    expectedAction: {
      action: "UPDATE_TASK_STATUS",
      targetRef: "task_1",
      arguments: { status: "done" },
      explanation: "Marking task as done per user request.",
    },
  },
  candidates: [
    {
      name: "valid_proposal",
      output: {
        answer: "I can mark the Auth Controller task as done.",
        references: [{ type: "task", ref: "task_1" }],
        proposedAction: {
          action: "UPDATE_TASK_STATUS",
          targetRef: "task_1",
          arguments: { status: "done" },
          explanation: "Marking task as done per user request.",
        },
      },
    },
  ],
};

export const fixtureB_HallucinatedReference: CopilotActionFixture = {
  fixtureId: "fix_copilot_action_hallucinated_ref",
  scenarioName: "Hallucinated Symbolic Target Reference",
  userQuestion: "Change priority of non-existent task",
  symbolicMap: {
    project: { type: "project", id: "64f000000000000000000001", label: "Alpha Project" },
    task_1: { type: "task", id: "64f000000000000000000100", label: "Auth Controller Task" },
  },
  groundTruth: {
    expectedAction: null,
    expectNoAction: true,
  },
  candidates: [
    {
      name: "hallucinated_target",
      output: {
        answer: "I can change priority.",
        references: [],
        proposedAction: {
          action: "UPDATE_TASK_PRIORITY",
          targetRef: "task_999", // Hallucinated reference not in symbolicMap
          arguments: { priority: "urgent" },
          explanation: "Urgent fix.",
        },
      },
    },
  ],
};

export const fixtureC_ForbiddenAction: CopilotActionFixture = {
  fixtureId: "fix_copilot_action_forbidden_delete",
  scenarioName: "Forbidden Destructive Action Candidate",
  userQuestion: "Delete the project task",
  symbolicMap: {
    project: { type: "project", id: "64f000000000000000000001", label: "Alpha Project" },
    task_1: { type: "task", id: "64f000000000000000000100", label: "Auth Controller Task" },
  },
  groundTruth: {
    expectedAction: null,
    expectNoAction: true,
  },
  candidates: [
    {
      name: "destructive_candidate",
      output: {
        answer: "Deleting task.",
        references: [],
        proposedAction: {
          action: "DELETE_TASK", // Blacklisted action type
          targetRef: "task_1",
          explanation: "Malicious deletion.",
        },
      },
    },
  ],
};

export const fixtureD_InformationalNoAction: CopilotActionFixture = {
  fixtureId: "fix_copilot_action_informational_query",
  scenarioName: "Informational Query Expecting No Action Proposal",
  userQuestion: "What is blocking the release?",
  symbolicMap: {
    project: { type: "project", id: "64f000000000000000000001", label: "Alpha Project" },
    task_1: { type: "task", id: "64f000000000000000000100", label: "Auth Controller Task" },
  },
  groundTruth: {
    expectNoAction: true,
  },
  candidates: [
    {
      name: "clean_informational_response",
      output: {
        answer: "The main blocker is task_1 pending code review.",
        references: [{ type: "task", ref: "task_1" }],
        proposedAction: null,
      },
    },
  ],
};

export const fixtureE_UngroundedAction: CopilotActionFixture = {
  fixtureId: "fix_copilot_action_ungrounded_candidate",
  scenarioName: "Ungrounded Structurally Valid Action",
  userQuestion: "Summarize current tasks",
  symbolicMap: {
    project: { type: "project", id: "64f000000000000000000001", label: "Alpha Project" },
    task_1: { type: "task", id: "64f000000000000000000100", label: "Auth Controller Task" },
  },
  groundTruth: {
    expectNoAction: true,
  },
  candidates: [
    {
      name: "ungrounded_priority_change",
      output: {
        answer: "Here is your summary.",
        references: [],
        proposedAction: {
          action: "UPDATE_TASK_PRIORITY",
          targetRef: "task_1",
          arguments: { priority: "urgent" },
          explanation: "Unrequested priority change.",
        },
      },
    },
  ],
};
