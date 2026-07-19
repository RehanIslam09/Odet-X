import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowLeft, AlertCircle, Save, Loader2, Check } from "lucide-react";

import { useTask } from "../hooks/useTask.js";
import { useUpdateTaskNotes } from "../hooks/useUpdateTaskNotes.js";
import { MemoizedMarkdownRenderer } from "../components/MarkdownRenderer.js";
import { TaskDetailSkeleton } from "../components/TaskDetailSkeleton.js";
import { TaskNotFoundState } from "../components/TaskNotFoundState.js";
import { Button } from "@/components/ui/button.js";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.js";

type SaveStatus = "idle" | "saving" | "error" | "saved";

export default function TaskNotesWorkspacePage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Queries & Mutations
  const { data: taskRes, isLoading: isTaskLoading, error: taskError, refetch } = useTask(taskId);
  const task = taskRes?.task;
  const { mutateAsync: updateNotes } = useUpdateTaskNotes();

  // Local State
  const [localDraft, setLocalDraft] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const initializedTaskIdRef = useRef<string | null>(null);

  // Initialize draft safely ONLY once per task, preserving dirty drafts during background refetches
  useEffect(() => {
    if (task && initializedTaskIdRef.current !== task.id) {
      setLocalDraft(task.notes || "");
      setIsDirty(false);
      setSaveStatus("idle");
      initializedTaskIdRef.current = task.id;
    }
  }, [task]);

  // URL Mode Management
  const rawMode = searchParams.get("mode");
  const defaultMode = task?.notes?.trim().length === 0 ? "write" : "preview";
  const mode = rawMode === "write" || rawMode === "preview" ? rawMode : defaultMode;

  const setMode = (newMode: "write" | "preview") => {
    setSearchParams({ mode: newMode }, { replace: true });
  };

  // Explicit Save Logic
  const handleSave = useCallback(async () => {
    if (!task || !isDirty || saveStatus === "saving") return;

    setSaveStatus("saving");
    // Capture the exact draft being saved to prevent race conditions
    const draftToSave = localDraft;

    try {
      await updateNotes({ id: task.id, notes: draftToSave });
      
      // If the user hasn't continued typing while the request was in flight, mark clean.
      // We check this via setState callback to get the freshest state.
      setLocalDraft((currentDraft) => {
        if (currentDraft === draftToSave) {
          setIsDirty(false);
          setSaveStatus("saved");
          
          // Clear the "saved" status after a brief moment
          setTimeout(() => {
            setSaveStatus((prev) => prev === "saved" ? "idle" : prev);
          }, 2000);
        } else {
          // The user kept typing, so it remains dirty
          setSaveStatus("idle");
        }
        return currentDraft;
      });
    } catch (_error) {
      setSaveStatus("error");
      // The local draft remains completely untouched
    }
  }, [task, isDirty, saveStatus, localDraft, updateNotes]);

  // Ctrl/Cmd + S Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // Loading State
  if (isTaskLoading) {
    return (
      <div className="max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
        <TaskDetailSkeleton />
      </div>
    );
  }

  // Error States (404/BOLA)
  if (taskError?.message?.includes("404") || taskError?.name === "NotFoundError" || (taskError as { status?: number })?.status === 404) {
    return (
      <div className="max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
        <TaskNotFoundState />
      </div>
    );
  }

  // Recoverable Error
  if (taskError) {
    return (
      <div className="max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Failed to load task</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            There was a problem communicating with the server. Please check your connection and try again.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-8 flex flex-col h-[calc(100vh-theme(spacing.16))] animate-in fade-in duration-500">
      {/* Header Context */}
      <div className="mb-6 shrink-0">
        <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground gap-1.5 -ml-2" asChild>
          <Link to={`/tasks/${task.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to task
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground mb-2 break-words">
          {task.title}
        </h1>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span>Detailed Notes</span>
          <span className="text-border">•</span>
          <span className="truncate">{task.projectName || "No Project"}</span>
        </div>
      </div>

      {/* Toolbar & Save Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "write" | "preview")} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-sm">
            {saveStatus === "saving" && (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Save failed
              </span>
            )}
            {saveStatus === "idle" && isDirty && (
              <span className="text-amber-600 dark:text-amber-500 font-medium">
                Unsaved changes
              </span>
            )}
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={!isDirty || saveStatus === "saving"}
            className="min-w-[100px] gap-2 shadow-sm"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 bg-card border border-border/40 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {mode === "write" ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <TextareaAutosize
              value={localDraft}
              onChange={(e) => {
                setLocalDraft(e.target.value);
                setIsDirty(true);
                if (saveStatus === "error") setSaveStatus("idle");
              }}
              className="w-full min-h-full resize-none bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-base text-foreground/90 font-mono leading-relaxed"
              placeholder="Add detailed notes, technical context, implementation ideas..."
              aria-label="Task notes editor"
              spellCheck={true}
              minRows={15}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
            {localDraft.trim().length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground italic">
                Nothing to preview.
              </div>
            ) : (
              <MemoizedMarkdownRenderer content={localDraft} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
