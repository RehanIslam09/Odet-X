import { Types } from "mongoose";

/**
 * Returns the canonical Socket.IO room name for a validated workspace ID.
 * Throws error if workspaceId format is invalid.
 */
export function getWorkspaceRoom(workspaceId: string): string {
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new Error("Invalid workspace ID format.");
  }
  const trimmed = workspaceId.trim();
  if (!Types.ObjectId.isValid(trimmed)) {
    throw new Error("Invalid workspace ID format.");
  }
  return `workspace:${trimmed}`;
}
