export const PLAN_MAX_TASKS = 25;
export const PLAN_MAX_MILESTONES = 5;
export const PLAN_MAX_PROMPT_LENGTH = 2000;
export const PLAN_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const PLAN_DRAFT_STATUSES = ["draft", "committed", "discarded"] as const;
export type PlanDraftStatus = (typeof PLAN_DRAFT_STATUSES)[number];
