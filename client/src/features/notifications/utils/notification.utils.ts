import type { Notification } from "../types/notification.types";

/**
 * Returns the application route URL for a notification's underlying entity.
 * If the entity is a system notification or doesn't have a known entityType, returns null.
 * 
 * Note: Returning a valid URL here does NOT guarantee the entity still exists.
 * Soft-deleted projects or tasks will gracefully trigger a 404 in the application router.
 */
export function getNotificationUrl(notification: Notification): string | null {
  if (!notification.entityId && notification.entityType !== "workspaceMember") return null;

  const slug =
    notification.workspaceSlug ||
    (typeof notification.metadata?.workspaceSlug === "string" ? notification.metadata.workspaceSlug : null);

  switch (notification.entityType) {
    case "project":
      return slug ? `/w/${slug}/projects/${notification.entityId}` : `/projects/${notification.entityId}`;
    case "task":
      return slug ? `/w/${slug}/tasks/${notification.entityId}` : `/tasks/${notification.entityId}`;
    case "workspaceMember":
      return slug ? `/w/${slug}/settings` : `/settings`;
    case "system":
    default:
      return null;
  }
}
