import { z } from "zod";

export const activityQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Project ID").optional(),
  taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Task ID").optional(),
});

export type ActivityQueryDto = z.infer<typeof activityQuerySchema>;
