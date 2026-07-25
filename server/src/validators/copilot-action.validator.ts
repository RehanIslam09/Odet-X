import { Types } from "mongoose";
import { z } from "zod";
import { ProposedActionSchema } from "@/ai/actions/action.types.js";

/**
 * Zod schema for POST /api/copilot/actions/dry-run
 */
export const dryRunActionSchema = z.object({
  projectId: z.string().trim().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid project ID format.",
  }),
  proposedAction: ProposedActionSchema,
});

/**
 * Zod schema for POST /api/copilot/actions/confirm
 */
export const confirmActionSchema = z.object({
  confirmationToken: z
    .string()
    .trim()
    .min(1, "Action confirmation token is required."),
});

export type DryRunActionDto = z.infer<typeof dryRunActionSchema>;
export type ConfirmActionDto = z.infer<typeof confirmActionSchema>;
