import { useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowLeft, AlertCircle, Save, Loader2, Check } from "lucide-react";

import { useTask } from "../hooks/useTask.js";
import { useTaskNotesAutosave } from "../hooks/useTaskNotesAutosave.js";
import { MemoizedMarkdownRenderer } from "../components/MarkdownRenderer.js";
import { TaskDetailSkeleton } from "../components/TaskDetailSkeleton.js";
import { TaskNotFoundState } from "../components/TaskNotFoundState.js";
import { Button } from "@/components/ui/button.js";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.js";

export default function TaskNotesWorkspacePage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Queries
  const { data: taskRes, isLoading: isTaskLoading, error: taskError, refetch } = useTask(taskId);
  const task = taskRes?.task;

  const {
    localDraft,
    isDirty,
    status,
    handleDraftChange,
    handleExplicitSave,
    blocker,
    reloadLatest,
    overwriteWithMyVersion,
  } = useTaskNotesAutosave({
    taskId: task?.id as string,
    taskNotes: task?.notes,
    taskVersion: task?.version,
    refetch,
  });

  // URL Mode Management
  const rawMode = searchParams.get("mode");
  const defaultMode = task?.notes?.trim().length === 0 ? "write" : "preview";
  const mode = rawMode === "write" || rawMode === "preview" ? rawMode : defaultMode;

  const setMode = (newMode: "write" | "preview") => {
    setSearchParams({ mode: newMode }, { replace: true });
  };

  // Ctrl/Cmd + S Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleExplicitSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExplicitSave]);

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
    <div className="max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header Context */}
      <div className="mb-6">
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

      {/* Conflict Resolution Banner */}
      {status === "conflict" && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground animate-in fade-in shrink-0">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-destructive" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">These notes were updated in another session</h3>
              <p className="text-sm opacity-90 mb-3">
                Someone else (or another tab) has saved changes to these notes. Overwriting will erase their changes.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={reloadLatest} className="border-destructive/30 hover:bg-destructive/20 text-destructive bg-transparent">
                  Reload latest version
                </Button>
                <Button variant="default" size="sm" onClick={overwriteWithMyVersion} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Overwrite with my version
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Card */}
      <div className="border border-border/60 rounded-xl shadow-sm bg-card overflow-hidden flex flex-col mb-8">
        {/* Card Header (Tabs) */}
        <div className="bg-muted/30 border-b border-border/60 px-2 sm:px-4 pt-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "write" | "preview")} className="w-full">
            <TabsList className="bg-transparent h-auto p-0 flex w-full justify-start border-none">
              <TabsTrigger 
                value="write" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 mb-[-1px] font-medium"
              >
                Write
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 mb-[-1px] font-medium"
              >
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Card Content Area */}
        <div className="flex flex-col min-h-[450px] max-h-[70vh] overflow-y-auto custom-scrollbar bg-background">
          {mode === "write" ? (
            <div className="flex flex-col flex-1">
              <TextareaAutosize
                value={localDraft}
                onChange={(e) => handleDraftChange(e.target.value)}
                className="w-full flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-0 p-4 md:p-6 text-base text-foreground/90 font-mono leading-relaxed"
                placeholder="Add detailed notes, technical context, implementation ideas..."
                aria-label="Task notes editor"
                spellCheck={true}
                minRows={15}
              />
            </div>
          ) : (
            <div className="flex flex-col flex-1 p-4 md:p-6 lg:p-8">
              {localDraft.trim().length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground italic h-[400px]">
                  Nothing to preview.
                </div>
              ) : (
                <MemoizedMarkdownRenderer content={localDraft} />
              )}
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border/60 text-sm">
          <div className="text-muted-foreground flex items-center gap-2">
            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" className="fill-current opacity-70 hidden sm:block"><path d="M14.85 3H1.15C.52 3 0 3.52 0 4.15v7.69C0 12.48.52 13 1.15 13h13.69c.64 0 1.15-.52 1.15-1.15v-7.7C16 3.52 15.48 3 14.85 3ZM9 11H7V8L5.5 9.92 4 8v3H2V5h2l1.5 2L7 5h2v6Zm2.99.5L9.5 8H11V5h2v3h1.5l-2.51 3.5Z"></path></svg>
            <span className="hidden sm:inline">Markdown is supported</span>
            <span className="sm:hidden">Markdown</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm">
              {status === "saving" && (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </span>
              )}
              {status === "saved" && (
                <span className="text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5" aria-live="polite">
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </span>
              )}
              {status === "error" && (
                <span className="text-destructive flex items-center gap-1.5" aria-live="polite">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Save failed
                </span>
              )}
              {status === "conflict" && (
                <span className="text-destructive font-medium flex items-center gap-1.5" aria-live="polite">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Conflict
                </span>
              )}
              {status === "idle" && isDirty && (
                <span className="text-amber-600 dark:text-amber-500 font-medium">
                  Unsaved changes
                </span>
              )}
            </div>
            
            <Button 
              onClick={handleExplicitSave} 
              disabled={!isDirty || status === "saving" || status === "conflict"}
              size="sm"
              className="gap-2 shadow-sm min-w-[80px]"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Blocker Dialog */}
      <Dialog open={blocker.state === "blocked"} onOpenChange={(open) => { if (!open && blocker.state === "blocked") blocker.reset?.() }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              Your latest notes haven't been saved yet. Leaving now may discard your changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2 mt-2">
            <Button variant="ghost" onClick={() => blocker.reset?.()}>
              Stay
            </Button>
            <Button variant="outline" onClick={() => blocker.proceed?.()} className="border-destructive/30 text-destructive hover:bg-destructive/10">
              Leave without saving
            </Button>
            <Button 
              variant="default" 
              onClick={async () => {
                const success = await handleExplicitSave();
                if (success) {
                  blocker.proceed?.();
                }
              }}
            >
              Save and leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
