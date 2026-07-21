import { z } from 'zod';

export const GeneratedLabelsSchema = z.object({
  labels: z.array(z.string().min(1).max(30))
    .min(1, "Must generate at least 1 label")
    .max(5, "Cannot generate more than 5 labels")
});

export type GeneratedLabels = z.infer<typeof GeneratedLabelsSchema>;
