import { z } from 'zod';

export const GeneratedProjectSummarySchema = z.object({
  summary: z.string().min(10, "Summary must be at least 10 characters").max(2000, "Summary cannot exceed 2000 characters"),
  highlights: z.array(z.string().min(1)).max(5, "Maximum 5 highlights allowed"),
  risks: z.array(z.string().min(1)).max(5, "Maximum 5 risks allowed")
});

export type GeneratedProjectSummary = z.infer<typeof GeneratedProjectSummarySchema>;
