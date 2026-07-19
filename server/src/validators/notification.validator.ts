import { z } from "zod";

export const notificationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  readStatus: z.enum(["all", "unread", "read"]).default("all"),
});

export type NotificationQueryDto = z.infer<typeof notificationQuerySchema>;

export const notificationIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid notification ID"),
});
