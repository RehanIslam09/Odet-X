import { QueryClient } from "@tanstack/react-query";
import type { RealtimeEventEnvelope } from "./realtime-types";
import { taskKeys } from "@/features/tasks/hooks/useTasks";
import { projectKeys } from "@/features/projects/hooks/useProjects";
import { activityKeys } from "@/features/activity/hooks/activity.keys";
import { workspaceKeys } from "@/features/workspaces/hooks/useWorkspaces";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { planKeys } from "@/features/ai/hooks/usePlanDraft";

/**
 * Maps incoming authoritative domain events to TanStack Query key invalidation.
 *
 * Core Rule:
 * Socket.IO notifies that server state changed. TanStack Query REST refetch
 * obtains authoritative new state.
 */
export function routeDomainEvent(
  event: RealtimeEventEnvelope,
  queryClient: QueryClient,
  activeWorkspaceId: string,
): void {
  // Defense in depth: Verify workspace eligibility before triggering any invalidation
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
      if (event.resource.id) {
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(event.resource.id) });
        queryClient.invalidateQueries({ queryKey: projectKeys.summary(event.resource.id) });
      }
      break;

    case "project.deleted":
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      if (event.resource.id) {
        queryClient.removeQueries({ queryKey: projectKeys.detail(event.resource.id) });
        queryClient.removeQueries({ queryKey: projectKeys.summary(event.resource.id) });
      }
      break;

    case "activity.created":
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      break;

    case "member.removed":
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      break;

    case "plan.committed":
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
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
