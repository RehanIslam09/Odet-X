import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTaskNotesAutosave } from "./useTaskNotesAutosave.js";
import { useUpdateTaskNotes } from "./useUpdateTaskNotes.js";
import { useBlocker } from "react-router-dom";

// Mock dependencies
vi.mock("react-router-dom", () => ({
  useBlocker: vi.fn(),
}));

vi.mock("./useUpdateTaskNotes", () => ({
  useUpdateTaskNotes: vi.fn(),
}));

describe("useTaskNotesAutosave", () => {
  let mockMutateAsync: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockMutateAsync = vi.fn().mockResolvedValue({ task: { version: 1 } });
    (useUpdateTaskNotes as any).mockReturnValue({ mutateAsync: mockMutateAsync });
    (useBlocker as any).mockReturnValue({ state: "unblocked" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("initializes with provided notes and version", () => {
    const { result } = renderHook(() =>
      useTaskNotesAutosave({ taskId: "123", taskNotes: "Init", taskVersion: 0, refetch: vi.fn() })
    );

    expect(result.current.localDraft).toBe("Init");
    expect(result.current.isDirty).toBe(false);
    expect(result.current.status).toBe("idle");
  });

  it("debounces draft changes and triggers save", async () => {
    const { result } = renderHook(() =>
      useTaskNotesAutosave({ taskId: "123", taskNotes: "Init", taskVersion: 0, refetch: vi.fn() })
    );

    act(() => {
      result.current.handleDraftChange("New Draft");
    });

    expect(result.current.isDirty).toBe(true);
    expect(mockMutateAsync).not.toHaveBeenCalled();

    // Fast-forward past the 1s debounce
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: "123",
      notes: "New Draft",
      expectedVersion: 0,
    });
  });

  it("handles explicit save and cancels debounce", async () => {
    const { result } = renderHook(() =>
      useTaskNotesAutosave({ taskId: "123", taskNotes: "Init", taskVersion: 0, refetch: vi.fn() })
    );

    act(() => {
      result.current.handleDraftChange("New Draft");
    });

    await act(async () => {
      await result.current.handleExplicitSave();
    });

    // Should have called mutateAsync immediately
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should NOT have called again
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(result.current.isDirty).toBe(false);
  });

  it("detects 409 conflict", async () => {
    mockMutateAsync.mockRejectedValue({ response: { status: 409 } });

    const { result } = renderHook(() =>
      useTaskNotesAutosave({ taskId: "123", taskNotes: "Init", taskVersion: 0, refetch: vi.fn() })
    );

    act(() => {
      result.current.handleDraftChange("New Draft");
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe("conflict");
  });
});
