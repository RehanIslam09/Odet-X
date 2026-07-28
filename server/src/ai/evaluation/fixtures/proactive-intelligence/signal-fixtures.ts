import { Types } from "mongoose";
import { ProactiveSignalFixture } from "./types.js";

export const FROZEN_EVAL_NOW = new Date("2026-07-27T12:00:00.000Z");

const pId = new Types.ObjectId("64f000000000000000000001");
const uId = new Types.ObjectId("64f000000000000000000002");

export const SIGNAL_FIXTURES: ProactiveSignalFixture[] = [
  // -------------------------------------------------------------------------
  // 1. OVERDUE_HIGH_PRIORITY_TASKS
  // -------------------------------------------------------------------------
  {
    id: "fix_signal_overdue_high_positive",
    description: "Incomplete high-priority task past due date -> HIGH severity",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000101"),
          projectId: pId,
          title: "Overdue High Task",
          status: "in_progress",
          priority: "high",
          dueDate: new Date("2026-07-25T12:00:00.000Z"),
        },
      ],
      milestones: [],
    },
    expectedSignals: [
      {
        type: "OVERDUE_HIGH_PRIORITY_TASKS",
        severity: "HIGH",
        expectedRelatedEntityIds: ["64f000000000000000000101"],
      },
    ],
  },
  {
    id: "fix_signal_overdue_urgent_positive",
    description: "Incomplete urgent task past due date -> CRITICAL severity",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000102"),
          projectId: pId,
          title: "Overdue Urgent Task",
          status: "todo",
          priority: "urgent",
          dueDate: new Date("2026-07-26T12:00:00.000Z"),
        },
      ],
      milestones: [],
    },
    expectedSignals: [
      {
        type: "OVERDUE_HIGH_PRIORITY_TASKS",
        severity: "CRITICAL",
        expectedRelatedEntityIds: ["64f000000000000000000102"],
      },
    ],
  },
  {
    id: "fix_signal_overdue_medium_negative",
    description: "Overdue medium-priority task -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000103"),
          projectId: pId,
          title: "Medium Overdue Task",
          status: "in_progress",
          priority: "medium",
          dueDate: new Date("2026-07-25T12:00:00.000Z"),
        },
      ],
      milestones: [],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_overdue_low_negative",
    description: "Overdue low-priority task -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000104"),
          projectId: pId,
          title: "Low Overdue Task",
          status: "todo",
          priority: "low",
          dueDate: new Date("2026-07-25T12:00:00.000Z"),
        },
      ],
      milestones: [],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_overdue_completed_negative",
    description: "Completed high-priority task past due -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000105"),
          projectId: pId,
          title: "Completed High Task",
          status: "completed",
          priority: "high",
          dueDate: new Date("2026-07-25T12:00:00.000Z"),
        },
      ],
      milestones: [],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_overdue_cancelled_negative",
    description: "Cancelled urgent task past due -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000106"),
          projectId: pId,
          title: "Cancelled Urgent Task",
          status: "cancelled",
          priority: "urgent",
          dueDate: new Date("2026-07-25T12:00:00.000Z"),
        },
      ],
      milestones: [],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_overdue_archived_negative",
    description: "Archived high-priority task past due -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000107"),
          projectId: pId,
          title: "Archived High Task",
          status: "in_progress",
          priority: "high",
          dueDate: new Date("2026-07-25T12:00:00.000Z"),
          archived: true,
        },
      ],
      milestones: [],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_overdue_deleted_negative",
    description: "Soft-deleted urgent task past due -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000108"),
          projectId: pId,
          title: "Deleted Urgent Task",
          status: "in_progress",
          priority: "urgent",
          dueDate: new Date("2026-07-25T12:00:00.000Z"),
          isDeleted: true,
        },
      ],
      milestones: [],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_overdue_future_negative",
    description: "Future high-priority task -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000109"),
          projectId: pId,
          title: "Future High Task",
          status: "todo",
          priority: "high",
          dueDate: new Date("2026-07-29T12:00:00.000Z"),
        },
      ],
      milestones: [],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_overdue_null_date_negative",
    description: "Null dueDate high-priority task -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000110"),
          projectId: pId,
          title: "No Date High Task",
          status: "in_progress",
          priority: "high",
          dueDate: null,
        },
      ],
      milestones: [],
    },
    expectedSignals: [],
  },

  // -------------------------------------------------------------------------
  // 2. MILESTONE_AT_RISK
  // -------------------------------------------------------------------------
  {
    id: "fix_signal_milestone_overdue_critical",
    description: "Milestone past target date with incomplete tasks -> CRITICAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [
        {
          _id: new Types.ObjectId("64f000000000000000000201"),
          projectId: pId,
          title: "Overdue Milestone",
          targetDate: new Date("2026-07-25T12:00:00.000Z"),
        },
      ],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000111"),
          projectId: pId,
          milestoneId: new Types.ObjectId("64f000000000000000000201"),
          title: "Attached Task",
          status: "in_progress",
          priority: "medium",
        },
      ],
    },
    expectedSignals: [
      {
        type: "MILESTONE_AT_RISK",
        severity: "CRITICAL",
        expectedRelatedEntityIds: ["64f000000000000000000201"],
      },
    ],
  },
  {
    id: "fix_signal_milestone_due_3d_high",
    description: "Milestone due within <= 3 days with incomplete tasks -> HIGH",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [
        {
          _id: new Types.ObjectId("64f000000000000000000202"),
          projectId: pId,
          title: "Urgent Milestone",
          targetDate: new Date("2026-07-29T12:00:00.000Z"), // 2 days away
        },
      ],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000112"),
          projectId: pId,
          milestoneId: new Types.ObjectId("64f000000000000000000202"),
          title: "Attached Task",
          status: "todo",
          priority: "medium",
        },
      ],
    },
    expectedSignals: [
      {
        type: "MILESTONE_AT_RISK",
        severity: "HIGH",
        expectedRelatedEntityIds: ["64f000000000000000000202"],
      },
    ],
  },
  {
    id: "fix_signal_milestone_due_7d_medium",
    description: "Milestone due within <= 7 days with incomplete tasks -> MEDIUM",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [
        {
          _id: new Types.ObjectId("64f000000000000000000203"),
          projectId: pId,
          title: "Upcoming Milestone",
          targetDate: new Date("2026-08-01T12:00:00.000Z"), // 5 days away
        },
      ],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000113"),
          projectId: pId,
          milestoneId: new Types.ObjectId("64f000000000000000000203"),
          title: "Attached Task",
          status: "todo",
          priority: "low",
        },
      ],
    },
    expectedSignals: [
      {
        type: "MILESTONE_AT_RISK",
        severity: "MEDIUM",
        expectedRelatedEntityIds: ["64f000000000000000000203"],
      },
    ],
  },
  {
    id: "fix_signal_milestone_due_9d_negative",
    description: "Milestone due in > 7 days -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [
        {
          _id: new Types.ObjectId("64f000000000000000000204"),
          projectId: pId,
          title: "Distant Milestone",
          targetDate: new Date("2026-08-06T12:00:00.000Z"), // 10 days away
        },
      ],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000114"),
          projectId: pId,
          milestoneId: new Types.ObjectId("64f000000000000000000204"),
          title: "Attached Task",
          status: "todo",
          priority: "high",
        },
      ],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_milestone_all_tasks_done_negative",
    description: "Milestone with all tasks completed -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [
        {
          _id: new Types.ObjectId("64f000000000000000000205"),
          projectId: pId,
          title: "Done Milestone",
          targetDate: new Date("2026-07-25T12:00:00.000Z"),
        },
      ],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000115"),
          projectId: pId,
          milestoneId: new Types.ObjectId("64f000000000000000000205"),
          title: "Completed Task",
          status: "completed",
          priority: "high",
        },
      ],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_milestone_deleted_milestone_negative",
    description: "Soft-deleted milestone -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [
        {
          _id: new Types.ObjectId("64f000000000000000000206"),
          projectId: pId,
          title: "Deleted Milestone",
          targetDate: new Date("2026-07-25T12:00:00.000Z"),
          isDeleted: true,
        },
      ],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000116"),
          projectId: pId,
          milestoneId: new Types.ObjectId("64f000000000000000000206"),
          title: "Attached Task",
          status: "todo",
          priority: "high",
        },
      ],
    },
    expectedSignals: [],
  },

  // -------------------------------------------------------------------------
  // 3. DEPENDENCY_BOTTLENECK
  // -------------------------------------------------------------------------
  {
    id: "fix_signal_dep_3_downstream_medium",
    description: "Blocker with 3 active downstream tasks -> MEDIUM severity",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000301"),
          projectId: pId,
          title: "Blocker Task",
          status: "in_progress",
          priority: "medium",
        },
        {
          _id: new Types.ObjectId("64f000000000000000000302"),
          projectId: pId,
          title: "Downstream 1",
          status: "todo",
          priority: "low",
          dependencies: [new Types.ObjectId("64f000000000000000000301")],
        },
        {
          _id: new Types.ObjectId("64f000000000000000000303"),
          projectId: pId,
          title: "Downstream 2",
          status: "todo",
          priority: "medium",
          dependencies: [new Types.ObjectId("64f000000000000000000301")],
        },
        {
          _id: new Types.ObjectId("64f000000000000000000304"),
          projectId: pId,
          title: "Downstream 3",
          status: "in_progress",
          priority: "medium",
          dependencies: [new Types.ObjectId("64f000000000000000000301")],
        },
      ],
    },
    expectedSignals: [
      {
        type: "DEPENDENCY_BOTTLENECK",
        severity: "MEDIUM",
        expectedRelatedEntityIds: ["64f000000000000000000301"],
      },
    ],
  },
  {
    id: "fix_signal_dep_5_downstream_high",
    description: "Blocker with 5 active downstream tasks -> HIGH severity",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000310"),
          projectId: pId,
          title: "Major Blocker",
          status: "todo",
          priority: "medium",
        },
        {
          _id: new Types.ObjectId("64f000000000000000000311"),
          projectId: pId,
          title: "D1",
          status: "todo",
          priority: "low",
          dependencies: [new Types.ObjectId("64f000000000000000000310")],
        },
        {
          _id: new Types.ObjectId("64f000000000000000000312"),
          projectId: pId,
          title: "D2",
          status: "todo",
          priority: "low",
          dependencies: [new Types.ObjectId("64f000000000000000000310")],
        },
        {
          _id: new Types.ObjectId("64f000000000000000000313"),
          projectId: pId,
          title: "D3",
          status: "todo",
          priority: "low",
          dependencies: [new Types.ObjectId("64f000000000000000000310")],
        },
        {
          _id: new Types.ObjectId("64f000000000000000000314"),
          projectId: pId,
          title: "D4",
          status: "todo",
          priority: "low",
          dependencies: [new Types.ObjectId("64f000000000000000000310")],
        },
        {
          _id: new Types.ObjectId("64f000000000000000000315"),
          projectId: pId,
          title: "D5",
          status: "todo",
          priority: "low",
          dependencies: [new Types.ObjectId("64f000000000000000000310")],
        },
      ],
    },
    expectedSignals: [
      {
        type: "DEPENDENCY_BOTTLENECK",
        severity: "HIGH",
        expectedRelatedEntityIds: ["64f000000000000000000310"],
      },
    ],
  },
  {
    id: "fix_signal_dep_urgent_downstream_high",
    description: "Blocker with 1 urgent downstream task -> HIGH severity",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000320"),
          projectId: pId,
          title: "Critical Blocker",
          status: "todo",
          priority: "low",
        },
        {
          _id: new Types.ObjectId("64f000000000000000000321"),
          projectId: pId,
          title: "Urgent Downstream",
          status: "todo",
          priority: "urgent",
          dependencies: [new Types.ObjectId("64f000000000000000000320")],
        },
      ],
    },
    expectedSignals: [
      {
        type: "DEPENDENCY_BOTTLENECK",
        severity: "HIGH",
        expectedRelatedEntityIds: ["64f000000000000000000320"],
      },
    ],
  },
  {
    id: "fix_signal_dep_2_downstream_negative",
    description: "Blocker with 2 non-urgent downstream tasks -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      milestones: [],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000330"),
          projectId: pId,
          title: "Minor Blocker",
          status: "todo",
          priority: "medium",
        },
        {
          _id: new Types.ObjectId("64f000000000000000000331"),
          projectId: pId,
          title: "D1",
          status: "todo",
          priority: "medium",
          dependencies: [new Types.ObjectId("64f000000000000000000330")],
        },
        {
          _id: new Types.ObjectId("64f000000000000000000332"),
          projectId: pId,
          title: "D2",
          status: "todo",
          priority: "low",
          dependencies: [new Types.ObjectId("64f000000000000000000330")],
        },
      ],
    },
    expectedSignals: [],
  },

  // -------------------------------------------------------------------------
  // 4. PROJECT_STALLED
  // -------------------------------------------------------------------------
  {
    id: "fix_signal_stalled_7d_medium",
    description: "8 days inactivity with 3 active tasks -> MEDIUM severity",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: new Date("2026-07-01T12:00:00.000Z") },
      latestActivityDate: new Date("2026-07-19T12:00:00.000Z"), // 8 days ago
      milestones: [],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000401"),
          projectId: pId,
          title: "T1",
          status: "todo",
          priority: "medium",
          updatedAt: new Date("2026-07-19T12:00:00.000Z"),
        },
        {
          _id: new Types.ObjectId("64f000000000000000000402"),
          projectId: pId,
          title: "T2",
          status: "todo",
          priority: "medium",
          updatedAt: new Date("2026-07-19T12:00:00.000Z"),
        },
        {
          _id: new Types.ObjectId("64f000000000000000000403"),
          projectId: pId,
          title: "T3",
          status: "in_progress",
          priority: "medium",
          updatedAt: new Date("2026-07-19T12:00:00.000Z"),
        },
      ],
    },
    expectedSignals: [
      {
        type: "PROJECT_STALLED",
        severity: "MEDIUM",
        expectedRelatedEntityIds: ["64f000000000000000000001"],
      },
    ],
  },
  {
    id: "fix_signal_stalled_14d_high",
    description: "15 days inactivity with 3 active tasks -> HIGH severity",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: new Date("2026-07-01T12:00:00.000Z") },
      latestActivityDate: new Date("2026-07-12T12:00:00.000Z"), // 15 days ago
      milestones: [],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000411"),
          projectId: pId,
          title: "T1",
          status: "todo",
          priority: "medium",
          updatedAt: new Date("2026-07-12T12:00:00.000Z"),
        },
        {
          _id: new Types.ObjectId("64f000000000000000000412"),
          projectId: pId,
          title: "T2",
          status: "todo",
          priority: "medium",
          updatedAt: new Date("2026-07-12T12:00:00.000Z"),
        },
        {
          _id: new Types.ObjectId("64f000000000000000000413"),
          projectId: pId,
          title: "T3",
          status: "in_progress",
          priority: "medium",
          updatedAt: new Date("2026-07-12T12:00:00.000Z"),
        },
      ],
    },
    expectedSignals: [
      {
        type: "PROJECT_STALLED",
        severity: "HIGH",
        expectedRelatedEntityIds: ["64f000000000000000000001"],
      },
    ],
  },
  {
    id: "fix_signal_stalled_5d_negative",
    description: "5 days inactivity -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      latestActivityDate: new Date("2026-07-22T12:00:00.000Z"), // 5 days ago
      milestones: [],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000421"),
          projectId: pId,
          title: "T1",
          status: "todo",
          priority: "medium",
        },
        {
          _id: new Types.ObjectId("64f000000000000000000422"),
          projectId: pId,
          title: "T2",
          status: "todo",
          priority: "medium",
        },
        {
          _id: new Types.ObjectId("64f000000000000000000423"),
          projectId: pId,
          title: "T3",
          status: "todo",
          priority: "medium",
        },
      ],
    },
    expectedSignals: [],
  },
  {
    id: "fix_signal_stalled_activity_reset_negative",
    description: "Old task timestamps but recent activity (3 days ago) -> NO SIGNAL",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Project Alpha", createdAt: FROZEN_EVAL_NOW },
      latestActivityDate: new Date("2026-07-24T12:00:00.000Z"), // 3 days ago (reset baseline)
      milestones: [],
      tasks: [
        {
          _id: new Types.ObjectId("64f000000000000000000431"),
          projectId: pId,
          title: "T1",
          status: "todo",
          priority: "medium",
          updatedAt: new Date("2026-07-01T12:00:00.000Z"),
        },
        {
          _id: new Types.ObjectId("64f000000000000000000432"),
          projectId: pId,
          title: "T2",
          status: "todo",
          priority: "medium",
          updatedAt: new Date("2026-07-01T12:00:00.000Z"),
        },
        {
          _id: new Types.ObjectId("64f000000000000000000433"),
          projectId: pId,
          title: "T3",
          status: "todo",
          priority: "medium",
          updatedAt: new Date("2026-07-01T12:00:00.000Z"),
        },
      ],
    },
    expectedSignals: [],
  },

  // -------------------------------------------------------------------------
  // 5. MULTI_SIGNAL REALISTIC FIXTURE
  // -------------------------------------------------------------------------
  {
    id: "fix_signal_multi_realistic",
    description: "Realistic project simultaneously triggering OVERDUE (HIGH), MILESTONE (CRITICAL), and DEPENDENCY (HIGH)",
    input: {
      now: FROZEN_EVAL_NOW,
      project: { _id: pId, owner: uId, name: "Realistic Multi Project", createdAt: FROZEN_EVAL_NOW },
      milestones: [
        {
          _id: new Types.ObjectId("64f000000000000000000501"),
          projectId: pId,
          title: "Beta Launch",
          targetDate: new Date("2026-07-24T12:00:00.000Z"), // Overdue milestone -> CRITICAL
        },
      ],
      tasks: [
        // Overdue High Task -> OVERDUE_HIGH_PRIORITY_TASKS (HIGH)
        {
          _id: new Types.ObjectId("64f000000000000000000510"),
          projectId: pId,
          title: "Auth Refactor",
          status: "in_progress",
          priority: "high",
          dueDate: new Date("2026-07-25T12:00:00.000Z"),
          milestoneId: new Types.ObjectId("64f000000000000000000501"),
        },
        // Blocker task with urgent downstream -> DEPENDENCY_BOTTLENECK (HIGH)
        {
          _id: new Types.ObjectId("64f000000000000000000520"),
          projectId: pId,
          title: "Database Schema Migration",
          status: "todo",
          priority: "medium",
        },
        {
          _id: new Types.ObjectId("64f000000000000000000521"),
          projectId: pId,
          title: "Urgent API Integration",
          status: "todo",
          priority: "urgent",
          dependencies: [new Types.ObjectId("64f000000000000000000520")],
        },
      ],
    },
    expectedSignals: [
      {
        type: "MILESTONE_AT_RISK",
        severity: "CRITICAL",
        expectedRelatedEntityIds: ["64f000000000000000000501"],
      },
      {
        type: "OVERDUE_HIGH_PRIORITY_TASKS",
        severity: "HIGH",
        expectedRelatedEntityIds: ["64f000000000000000000510"],
      },
      {
        type: "DEPENDENCY_BOTTLENECK",
        severity: "HIGH",
        expectedRelatedEntityIds: ["64f000000000000000000520"],
      },
    ],
  },
];
