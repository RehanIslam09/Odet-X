import { z } from "zod";

export type ViewingResourceType = "project" | "task";

export interface ResourceViewing {
  resourceType: ViewingResourceType;
  resourceId: string;
}

export const resourceViewingSchema = z
  .object({
    resourceType: z.enum(["project", "task"]),
    resourceId: z.string().min(1),
  })
  .nullable();

export interface PresenceUser {
  userId: string;
  name: string;
  username: string;
  viewing: ResourceViewing | null;
}

export interface WorkspacePresenceSnapshot {
  workspaceId: string;
  users: PresenceUser[];
}

export const workspacePresenceSnapshotSchema = z.object({
  workspaceId: z.string(),
  users: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      username: z.string(),
      viewing: resourceViewingSchema,
    }),
  ),
});
