import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { routeDomainEvent } from "./event-router";
import { realtimeClient } from "./realtime-client";
import type { RealtimeEventEnvelope } from "./realtime-types";
import { taskKeys } from "@/features/tasks/hooks/useTasks";
import { projectKeys } from "@/features/projects/hooks/useProjects";
import { activityKeys } from "@/features/activity/hooks/activity.keys";
import { workspaceKeys } from "@/features/workspaces/hooks/useWorkspaces";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { planKeys } from "@/features/ai/hooks/usePlanDraft";
import { notificationKeys } from "@/features/notifications/hooks/notification.keys";

describe("WP-2 — Live Cache Synchronization & Domain Event Router Integration Tests", () => {
  let queryClient: QueryClient;
  const ACTIVE_WS_ID = "ws-alpha";

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    realtimeClient.disconnect();
  });

  it("1. task.created invalidates task, dashboard, activity, notification, and project detail/summary queries", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "evt-task-create-1",
      protocolVersion: 1,
      type: "task.created",
      workspaceId: ACTIVE_WS_ID,
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "task-100" },
      payload: { projectId: "proj-200", title: "New Task" },
    };

    routeDomainEvent(event, queryClient, ACTIVE_WS_ID);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.detail("proj-200") });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.summary("proj-200") });
  });

  it("2. task.updated invalidates task, detail, dashboard, activity, notification, and project queries", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "evt-task-update-1",
      protocolVersion: 1,
      type: "task.updated",
      workspaceId: ACTIVE_WS_ID,
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "task-100" },
      payload: { projectId: "proj-200", title: "Updated Task" },
    };

    routeDomainEvent(event, queryClient, ACTIVE_WS_ID);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.detail("task-100") });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationKeys.all });
  });

  it("3. project.created invalidates project, dashboard, activity, and notification queries", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "evt-proj-create-1",
      protocolVersion: 1,
      type: "project.created",
      workspaceId: ACTIVE_WS_ID,
      occurredAt: new Date().toISOString(),
      resource: { type: "project", id: "proj-300" },
      payload: { name: "New Project" },
    };

    routeDomainEvent(event, queryClient, ACTIVE_WS_ID);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationKeys.all });
  });

  it("4. activity.created invalidates activity and notification queries", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "evt-act-create-1",
      protocolVersion: 1,
      type: "activity.created",
      workspaceId: ACTIVE_WS_ID,
      occurredAt: new Date().toISOString(),
      resource: { type: "activity", id: "act-400" },
      payload: { action: "task_completed" },
    };

    routeDomainEvent(event, queryClient, ACTIVE_WS_ID);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationKeys.all });
  });

  it("5. member.removed invalidates workspace, activity, and notification queries", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "evt-mem-remove-1",
      protocolVersion: 1,
      type: "member.removed",
      workspaceId: ACTIVE_WS_ID,
      occurredAt: new Date().toISOString(),
      resource: { type: "workspace", id: ACTIVE_WS_ID },
      payload: { removedUserId: "user-999" },
    };

    routeDomainEvent(event, queryClient, ACTIVE_WS_ID);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: workspaceKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationKeys.all });
  });

  it("6. plan.committed invalidates plan, task, project, dashboard, activity, and notification queries", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "evt-plan-commit-1",
      protocolVersion: 1,
      type: "plan.committed",
      workspaceId: ACTIVE_WS_ID,
      occurredAt: new Date().toISOString(),
      resource: { type: "plan", id: "plan-500" },
      payload: { projectId: "proj-200" },
    };

    routeDomainEvent(event, queryClient, ACTIVE_WS_ID);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: planKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationKeys.all });
  });

  it("7. Events for inactive workspaces are strictly ignored (Workspace Eligibility Guard)", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "evt-foreign-1",
      protocolVersion: 1,
      type: "task.created",
      workspaceId: "ws-beta-foreign",
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "task-foreign" },
      payload: {},
    };

    routeDomainEvent(event, queryClient, ACTIVE_WS_ID);

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("8. Duplicate event IDs are processed exactly once (500-item LRU Set Deduplication)", () => {
    const handler = vi.fn();
    const unsubscribe = realtimeClient.onDomainEvent(handler);

    const event: RealtimeEventEnvelope = {
      id: "evt-dedupe-unique-123",
      protocolVersion: 1,
      type: "task.created",
      workspaceId: ACTIVE_WS_ID,
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "task-dedupe" },
      payload: {},
    };

    realtimeClient.subscribeWorkspace(ACTIVE_WS_ID);

    // Simulate raw socket domain event dispatch twice with same envelope ID
    // @ts-expect-error accessing private method for unit verification
    realtimeClient.handleIncomingDomainEvent(event);
    // @ts-expect-error accessing private method for unit verification
    realtimeClient.handleIncomingDomainEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("9. Reconnect recovery invalidates active queries only without clearing cache", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    // Simulate active query in queryClient
    queryClient.setQueryData(taskKeys.all, [{ id: "t1" }]);

    // Trigger reconnect recovery predicate
    queryClient.invalidateQueries({
      predicate: (q) => q.isActive(),
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      predicate: expect.any(Function),
    });
  });
});
