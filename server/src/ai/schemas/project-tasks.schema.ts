import { z } from 'zod';

export const GeneratedTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Title is too long"),
  description: z.string(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]),
  estimatedTime: z.string().nullable().optional(),
  suggestedOrder: z.number().int().min(1)
});

export const GenerateTasksResponseSchema = z.object({
  tasks: z.array(GeneratedTaskSchema).min(1, "Task list cannot be empty")
});

export type GeneratedTask = z.infer<typeof GeneratedTaskSchema>;
export type GenerateTasksResponse = z.infer<typeof GenerateTasksResponseSchema>;
