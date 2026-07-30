import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { Permission } from "@/constants/permissions";
import { usePermissions } from "@/features/workspaces/hooks/usePermissions";
import type { WorkspaceRole } from "./types/workspace.types";

// Mock Active Workspace Context
let mockCurrentRole: WorkspaceRole = "OWNER";

vi.mock("@/features/workspaces/context/WorkspaceContext", () => ({
  useActiveWorkspace: () => ({
    currentRole: mockCurrentRole,
    currentWorkspace: { id: "ws-123", name: "Test Workspace", slug: "test-ws", role: mockCurrentRole },
    isLoading: false,
    isError: false,
  }),
}));

describe("Frontend RBAC Permission Layer Tests", () => {
  it("OWNER role has all capabilities", () => {
    mockCurrentRole = "OWNER";
    const { result } = renderHook(() => usePermissions());

    expect(result.current.isOwner).toBe(true);
    expect(result.current.can(Permission.WORKSPACE_UPDATE)).toBe(true);
    expect(result.current.can(Permission.WORKSPACE_DELETE)).toBe(true);
    expect(result.current.can(Permission.PROJECT_CREATE)).toBe(true);
    expect(result.current.can(Permission.TASK_DELETE)).toBe(true);
  });

  it("ADMIN role can manage members and delete projects but cannot update workspace", () => {
    mockCurrentRole = "ADMIN";
    const { result } = renderHook(() => usePermissions());

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.can(Permission.WORKSPACE_UPDATE)).toBe(false);
    expect(result.current.can(Permission.WORKSPACE_DELETE)).toBe(false);
    expect(result.current.can(Permission.MEMBER_INVITE)).toBe(true);
    expect(result.current.can(Permission.PROJECT_DELETE)).toBe(true);
  });

  it("MEMBER role can create projects/tasks but cannot manage members or delete workspace", () => {
    mockCurrentRole = "MEMBER";
    const { result } = renderHook(() => usePermissions());

    expect(result.current.isMember).toBe(true);
    expect(result.current.can(Permission.MEMBER_INVITE)).toBe(false);
    expect(result.current.can(Permission.PROJECT_CREATE)).toBe(true);
    expect(result.current.can(Permission.TASK_CREATE)).toBe(true);
    expect(result.current.can(Permission.WORKSPACE_UPDATE)).toBe(false);
  });

  it("VIEWER role is strictly read-only", () => {
    mockCurrentRole = "VIEWER";
    const { result } = renderHook(() => usePermissions());

    expect(result.current.isViewer).toBe(true);
    expect(result.current.can(Permission.PROJECT_READ)).toBe(true);
    expect(result.current.can(Permission.TASK_READ)).toBe(true);
    expect(result.current.can(Permission.PROJECT_CREATE)).toBe(false);
    expect(result.current.can(Permission.TASK_CREATE)).toBe(false);
    expect(result.current.can(Permission.AI_ACTION_EXECUTE)).toBe(false);
  });

  it("hasRole helper resolves correctly for single and array role checks", () => {
    mockCurrentRole = "MEMBER";
    const { result } = renderHook(() => usePermissions());

    expect(result.current.hasRole("MEMBER")).toBe(true);
    expect(result.current.hasRole(["ADMIN", "MEMBER"])).toBe(true);
    expect(result.current.hasRole(["OWNER", "ADMIN"])).toBe(false);
  });
});
