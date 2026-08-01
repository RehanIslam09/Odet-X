import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { realtimeClient } from "./realtime-client";
import { routeDomainEvent } from "./event-router";
import type { RealtimeEventEnvelope } from "./realtime-types";
import { taskKeys } from "@/features/tasks/hooks/useTasks";
import { projectKeys } from "@/features/projects/hooks/useProjects";
import { activityKeys } from "@/features/activity/hooks/activity.keys";
import { workspaceKeys } from "@/features/workspaces/hooks/useWorkspaces";
import { dashboardKeys } from "@/features/dashboard/hooks/dashboard.keys";
import { planKeys } from "@/features/ai/hooks/usePlanDraft";

describe("WP-5 — Client Real-Time Foundation & TanStack Query Invalidation Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    realtimeClient.disconnect();
  });

  // ---------------------------------------------------------------------------
  // 1. Task Event Invalidation Mapping
  // ---------------------------------------------------------------------------
  it("task.created event invalidates task, dashboard, and activity query families", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "11111111-1111-4111-a111-111111111111",
      protocolVersion: 1,
      type: "task.created",
      workspaceId: "ws-alpha",
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "task-100" },
      payload: { projectId: "proj-200", title: "New Task" },
    };

    routeDomainEvent(event, queryClient, "ws-alpha");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.detail("proj-200") });
  });

  it("task.updated event invalidates task, dashboard, activity, and detail query keys", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "22222222-2222-4222-a222-222222222222",
      protocolVersion: 1,
      type: "task.updated",
      workspaceId: "ws-alpha",
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "task-100" },
      payload: { status: "in_progress" },
    };

    routeDomainEvent(event, queryClient, "ws-alpha");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.detail("task-100") });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
  });

  it("task.deleted event invalidates lists and removes task detail cache", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const removeSpy = vi.spyOn(queryClient, "removeQueries");

    const event: RealtimeEventEnvelope = {
      id: "33333333-3333-4333-a333-333333333333",
      protocolVersion: 1,
      type: "task.deleted",
      workspaceId: "ws-alpha",
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "task-100" },
      payload: { taskId: "task-100" },
    };

    routeDomainEvent(event, queryClient, "ws-alpha");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.all });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: taskKeys.detail("task-100") });
  });

  // ---------------------------------------------------------------------------
  // 2. Project Event Invalidation Mapping
  // ---------------------------------------------------------------------------
  it("project.updated event invalidates project, dashboard, and activity query families", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "44444444-4444-4444-a444-444444444444",
      protocolVersion: 1,
      type: "project.updated",
      workspaceId: "ws-alpha",
      occurredAt: new Date().toISOString(),
      resource: { type: "project", id: "proj-200" },
      payload: { name: "Updated Project" },
    };

    routeDomainEvent(event, queryClient, "ws-alpha");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.detail("proj-200") });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
  });

  // ---------------------------------------------------------------------------
  // 3. Activity & Membership Event Mapping
  // ---------------------------------------------------------------------------
  it("activity.created event invalidates activity query family", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "55555555-5555-4555-a555-555555555555",
      protocolVersion: 1,
      type: "activity.created",
      workspaceId: "ws-alpha",
      occurredAt: new Date().toISOString(),
      resource: { type: "activity", id: "act-300" },
      payload: { type: "TASK_CREATED" },
    };

    routeDomainEvent(event, queryClient, "ws-alpha");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
  });

  it("member.removed event invalidates workspace query family", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "66666666-6666-4666-a666-666666666666",
      protocolVersion: 1,
      type: "member.removed",
      workspaceId: "ws-alpha",
      occurredAt: new Date().toISOString(),
      resource: { type: "workspaceMember", id: "mem-400" },
      payload: { targetUserId: "user-500" },
    };

    routeDomainEvent(event, queryClient, "ws-alpha");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: workspaceKeys.all });
  });

  // ---------------------------------------------------------------------------
  // 4. Plan Commit Event Mapping
  // ---------------------------------------------------------------------------
  it("plan.committed event invalidates plans, tasks, projects, dashboard, and activity queries", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "77777777-7777-4777-a777-777777777777",
      protocolVersion: 1,
      type: "plan.committed",
      workspaceId: "ws-alpha",
      occurredAt: new Date().toISOString(),
      resource: { type: "plan", id: "draft-600" },
      payload: { projectId: "proj-200", committedTaskCount: 5, committedMilestoneCount: 2 },
    };

    routeDomainEvent(event, queryClient, "ws-alpha");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: planKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: activityKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: planKeys.project("proj-200") });
  });

  // ---------------------------------------------------------------------------
  // 5. Active Workspace Eligibility Defense
  // ---------------------------------------------------------------------------
  it("event for workspace Beta is IGNORED when current active workspace is Alpha", () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const event: RealtimeEventEnvelope = {
      id: "88888888-8888-4888-a888-888888888888",
      protocolVersion: 1,
      type: "task.created",
      workspaceId: "ws-beta", // Event belongs to Beta
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "task-999" },
      payload: { title: "Beta Task" },
    };

    // Client is active on ws-alpha
    routeDomainEvent(event, queryClient, "ws-alpha");

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 6. Listener Cleanup & StrictMode Safety
  // ---------------------------------------------------------------------------
  it("listener registration returns clean unsubscribe function", () => {
    const mockHandler = vi.fn();
    const unsubscribe = realtimeClient.onDomainEvent(mockHandler);

    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
  });
});
