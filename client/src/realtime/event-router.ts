import { QueryClient } from "@tanstack/react-query";
import type { RealtimeEventEnvelope } from "./realtime-types.js";
import { activityKeys } from "@/features/activity/hooks/activity.keys.js";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys.js";
import { notificationKeys } from "@/features/notifications/hooks/notification.keys.js";
import { planKeys } from "@/features/ai/hooks/usePlanDraft.js";
import { projectKeys } from "@/features/projects/hooks/useProjects.js";
import { taskKeys } from "@/features/tasks/hooks/useTasks.js";
import { workspaceKeys } from "@/features/workspaces/hooks/useWorkspaces.js";

/**
 * Centrally routes incoming Socket.io realtime domain event envelopes to the
 * QueryClient to invalidate active query caches.
 */
export function routeDomainEvent(
  event: RealtimeEventEnvelope,
  queryClient: QueryClient,
  activeWorkspaceId: string,
): void {
  if (event.workspaceId !== activeWorkspaceId) {
    return;
  }

  const payload = event.payload as Record<string, unknown> | undefined;
  const projectId = (payload?.projectId as string) || undefined;

  switch (event.type) {
    case "task.created":
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId) });
      }
      break;

    case "task.updated":
    case "task.archived":
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      if (event.resource.id) {
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(event.resource.id) });
      }
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId) });
      }
      break;

    case "task.deleted":
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      if (event.resource.id) {
        queryClient.removeQueries({ queryKey: taskKeys.detail(event.resource.id) });
      }
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId) });
      }
      break;

    case "project.created":
    case "project.updated":
    case "project.archived":
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      if (event.resource.id) {
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(event.resource.id) });
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(event.resource.id) });
      }
      break;

    case "project.deleted":
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      if (event.resource.id) {
        queryClient.removeQueries({ queryKey: projectKeys.detail(event.resource.id) });
        queryClient.removeQueries({ queryKey: projectKeys.summary(event.resource.id) });
      }
      break;

    case "activity.created":
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      break;

    case "member.invited":
    case "member.added":
    case "member.updated":
    case "member.removed":
    case "workspace.ownerTransferred":
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      break;

    case "plan.committed":
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: planKeys.project(projectId) });
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(projectId) });
      }
      break;

    default:
      console.warn(`[EventRouter] Unhandled event type: ${(event as unknown as { type: string }).type}`);
      break;
  }
}
