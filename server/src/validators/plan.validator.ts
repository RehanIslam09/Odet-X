import { z } from 'zod';
import { PLAN_MAX_PROMPT_LENGTH, PLAN_MAX_TASKS, PLAN_MAX_MILESTONES } from '@/constants/planning.js';

export const generatePlanSchema = z.object({
  description: z
    .string()
    .min(1, "Planning requirements description cannot be empty.")
    .max(PLAN_MAX_PROMPT_LENGTH, `Planning requirements description cannot exceed ${PLAN_MAX_PROMPT_LENGTH} characters.`),
});

export const updatePlanTaskSchema = z.object({
  tempId: z.string().min(1, "Task tempId is required"),
  title: z.string().min(1, "Title is required").max(120, "Title cannot exceed 120 characters"),
  description: z.string().max(2000, "Description cannot exceed 2000 characters").optional().default(""),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional().default("none"),
  estimatedTime: z.string().max(50, "Estimated time is too long").nullable().optional().default(null),
  position: z.number().int().min(1, "Position must be an integer >= 1"),
  dependencies: z.array(z.string()).optional().default([]),
  milestoneTempId: z.string().nullable().optional().default(null),
});

export const updatePlanMilestoneSchema = z.object({
  tempId: z.string().min(1, "Milestone tempId is required"),
  title: z.string().min(1, "Title is required").max(120, "Title cannot exceed 120 characters"),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional().default(""),
  targetDate: z.string().nullable().optional().default(null),
  position: z.number().int().min(1, "Position must be an integer >= 1"),
});

export const updatePlanSchema = z.object({
  tasks: z
    .array(updatePlanTaskSchema)
    .max(PLAN_MAX_TASKS, `Plan task count cannot exceed ${PLAN_MAX_TASKS}`)
    .optional(),
  milestones: z
    .array(updatePlanMilestoneSchema)
    .max(PLAN_MAX_MILESTONES, `Plan milestone count cannot exceed ${PLAN_MAX_MILESTONES}`)
    .optional(),
});

export type GeneratePlanDto = z.infer<typeof generatePlanSchema>;
export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;
