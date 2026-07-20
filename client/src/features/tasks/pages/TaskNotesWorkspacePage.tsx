import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";

import { useTask } from "../hooks/useTask.js";
import { useTaskNotesAutosave } from "../hooks/useTaskNotesAutosave.js";
import { TaskNotesEditor } from "../components/TaskNotesEditor.js";
import { TaskDetailSkeleton } from "../components/TaskDetailSkeleton.js";
import { TaskNotFoundState } from "../components/TaskNotFoundState.js";
import { Button } from "@/components/ui/button.js";
import { PageHeader } from "@/components/common/PageHeader.js";
import { PageContainer } from "@/components/common/PageContainer.js";
import { ErrorState } from "@/components/common/ErrorState.js";
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
      <PageContainer maxWidth="5xl">
        <TaskNotFoundState />
      </PageContainer>
    );
  }

  // Recoverable Error
  if (taskError) {
    return (
      <PageContainer maxWidth="5xl">
        <ErrorState
          title="Failed to load task"
          description="There was a problem communicating with the server. Please check your connection and try again."
          action={
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (!task) return null;

  return (
    <PageContainer maxWidth="5xl">
      {/* Header Context */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground gap-1.5 -ml-2" asChild>
          <Link to={`/tasks/${task.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to task
          </Link>
        </Button>
        <PageHeader 
          title={task.title}
          description={
            <div className="flex items-center gap-2">
              <span>Detailed Notes</span>
              <span className="text-border">•</span>
              <span className="truncate">{task.projectName || "No Project"}</span>
            </div>
          }
          className="mb-0"
        />
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

      <TaskNotesEditor
        localDraft={localDraft}
        isDirty={isDirty}
        status={status}
        onDraftChange={handleDraftChange}
        onExplicitSave={handleExplicitSave}
        mode={mode as "write" | "preview"}
        onModeChange={setMode}
      />

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
    </PageContainer>
  );
}
