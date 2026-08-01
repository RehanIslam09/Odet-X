import { Types } from "mongoose";
import { z } from "zod";

export const workspaceSubscribeSchema = z.object({
  workspaceId: z.string().refine((val) => Types.ObjectId.isValid(val.trim()), {
    message: "Invalid workspace ID format.",
  }),
});

export const workspaceUnsubscribeSchema = z.object({
  workspaceId: z.string().refine((val) => Types.ObjectId.isValid(val.trim()), {
    message: "Invalid workspace ID format.",
  }),
});

export type WorkspaceSubscribePayload = z.infer<typeof workspaceSubscribeSchema>;
export type WorkspaceUnsubscribePayload = z.infer<typeof workspaceUnsubscribeSchema>;
