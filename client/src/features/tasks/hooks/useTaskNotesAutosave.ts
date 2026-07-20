import { useState, useEffect, useRef, useCallback } from "react";
import { useBlocker } from "react-router-dom";
import { useUpdateTaskNotes } from "./useUpdateTaskNotes.js";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

interface UseTaskNotesAutosaveProps {
  taskId: string;
  taskNotes: string | undefined;
  taskVersion: number | undefined;
  refetch: () => Promise<unknown>;
}

export function useTaskNotesAutosave({ taskId, taskNotes, taskVersion, refetch }: UseTaskNotesAutosaveProps) {
  // Local State
  const [localDraft, setLocalDraft] = useState("");
  const [lastSavedDraft, setLastSavedDraft] = useState("");
  const [expectedVersion, setExpectedVersion] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const isDirty = localDraft !== lastSavedDraft;

  // Refs for async safety and serialization
  const initializedTaskIdRef = useRef<string | null>(null);
  const latestDraftRef = useRef(localDraft);
  const lastSavedDraftRef = useRef(lastSavedDraft);
  const expectedVersionRef = useRef(expectedVersion);
  const statusRef = useRef(status);
  const isSavingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutateAsync: updateNotes } = useUpdateTaskNotes();

  // Sync refs
  useEffect(() => {
    latestDraftRef.current = localDraft;
    lastSavedDraftRef.current = lastSavedDraft;
    expectedVersionRef.current = expectedVersion;
    statusRef.current = status;
  }, [localDraft, lastSavedDraft, expectedVersion, status]);

  // Initialization & Background Sync
  useEffect(() => {
    if (taskId && taskNotes !== undefined && taskVersion !== undefined) {
      if (initializedTaskIdRef.current !== taskId) {
        setLocalDraft(taskNotes);
        setLastSavedDraft(taskNotes);
        setExpectedVersion(taskVersion);
        setStatus("idle");
        initializedTaskIdRef.current = taskId;
      } else {
        // If we are clean and a background refetch yields a newer version, absorb it
        if (
          latestDraftRef.current === lastSavedDraftRef.current &&
          taskVersion !== expectedVersionRef.current
        ) {
          setLocalDraft(taskNotes);
          setLastSavedDraft(taskNotes);
          setExpectedVersion(taskVersion);
        }
      }
    }
  }, [taskId, taskNotes, taskVersion]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const flush = useCallback(async (): Promise<boolean> => {
    // Return true if successful or nothing to save
    if (latestDraftRef.current === lastSavedDraftRef.current) return true;
    if (isSavingRef.current) return false;

    isSavingRef.current = true;
    setStatus("saving");

    const draftToSave = latestDraftRef.current;

    try {
      const response = await updateNotes({
        id: taskId,
        notes: draftToSave,
        expectedVersion: expectedVersionRef.current,
      });

      // Success
      setLastSavedDraft(draftToSave);
      setExpectedVersion(response.task.version);
      
      setStatus("saved");
      setTimeout(() => {
        setStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2000);

      return true;
    } catch (error: unknown) {
      // 409 Conflict check
      const err = error as { response?: { status?: number }, status?: number };
      if (err?.response?.status === 409 || err?.status === 409) {
        setStatus("conflict");
      } else {
        setStatus("error");
      }
      return false;
    } finally {
      isSavingRef.current = false;

      // Serialization loop: if the user typed during this save, and we are NOT in conflict, schedule another flush.
      if (
        statusRef.current !== "conflict" &&
        latestDraftRef.current !== lastSavedDraftRef.current
      ) {
        // Avoid infinite synchronous recursion, yield to event loop
        setTimeout(() => flush(), 0);
      }
    }
  }, [taskId, updateNotes]);

  // Editor onChange handler
  const handleDraftChange = useCallback((newDraft: string) => {
    setLocalDraft(newDraft);

    if (statusRef.current === "error") {
      setStatus("idle");
    }

    if (statusRef.current === "conflict") {
      // Stop autosaving while in conflict
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flush();
    }, 1000);
  }, [flush]);

  // Explicit Save / Ctrl+S
  const handleExplicitSave = useCallback(async (): Promise<boolean> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    return await flush();
  }, [flush]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // beforeunload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, status]);

  // React Router Navigation Blocker
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Recovery actions for Conflict
  const reloadLatest = useCallback(async () => {
    // Await refetch to ensure we have the absolute latest canonical task data
    const res = (await refetch()) as { data?: { task?: { notes?: string; version?: number } } };
    const latestTask = res.data?.task;

    if (latestTask?.notes !== undefined && latestTask?.version !== undefined) {
      setLocalDraft(latestTask.notes);
      setLastSavedDraft(latestTask.notes);
      setExpectedVersion(latestTask.version);
      setStatus("idle");
    }
  }, [refetch]);

  const overwriteWithMyVersion = useCallback(async () => {
    // Await refetch to get the freshest version before we overwrite
    const res = (await refetch()) as { data?: { task?: { notes?: string; version?: number } } };
    const latestTask = res.data?.task;

    if (latestTask?.version !== undefined) {
      setExpectedVersion(latestTask.version);
      // Wait a tick for state to apply to refs
      setTimeout(() => {
        handleExplicitSave();
      }, 0);
    }
  }, [refetch, handleExplicitSave]);

  return {
    localDraft,
    isDirty,
    status,
    handleDraftChange,
    handleExplicitSave,
    blocker,
    reloadLatest,
    overwriteWithMyVersion,
  };
}
