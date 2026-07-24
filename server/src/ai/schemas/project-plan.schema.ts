import { z } from 'zod';
import { PLAN_MAX_MILESTONES, PLAN_MAX_TASKS } from '@/constants/planning.js';

export const AIPlanTaskSchema = z.object({
  ref: z.string().min(1, "Task ref is required"),
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
  description: z.string().max(2000, "Description is too long").optional().default(""),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional().default("none"),
  estimatedTime: z.string().max(50, "Estimated time is too long").nullable().optional(),
  position: z.number().int().min(1, "Position must be >= 1"),
  dependencies: z.array(z.string()).optional().default([]),
  milestoneRef: z.string().nullable().optional(),
});

export const AIPlanMilestoneSchema = z.object({
  ref: z.string().min(1, "Milestone ref is required"),
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
  description: z.string().max(1000, "Description is too long").optional().default(""),
  targetDate: z.string().nullable().optional(),
  position: z.number().int().min(1, "Position must be >= 1"),
});

export const GeneratePlanResponseSchema = z.object({
  tasks: z.array(AIPlanTaskSchema).max(PLAN_MAX_TASKS, `Task count cannot exceed ${PLAN_MAX_TASKS}`),
  milestones: z.array(AIPlanMilestoneSchema).max(PLAN_MAX_MILESTONES, `Milestone count cannot exceed ${PLAN_MAX_MILESTONES}`).optional().default([]),
});

export type AIPlanTask = z.infer<typeof AIPlanTaskSchema>;
export type AIPlanMilestone = z.infer<typeof AIPlanMilestoneSchema>;
export type GeneratePlanResponse = z.infer<typeof GeneratePlanResponseSchema>;
