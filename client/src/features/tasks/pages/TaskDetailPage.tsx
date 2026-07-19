import { useParams } from "react-router-dom";
import { useTask } from "../hooks/useTask.js";
import { TaskDetailHeader } from "../components/TaskDetailHeader.js";
import { TaskPropertiesPanel } from "../components/TaskPropertiesPanel.js";
import { TaskNotFoundState } from "../components/TaskNotFoundState.js";
import { TaskDetailSkeleton } from "../components/TaskDetailSkeleton.js";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { useEffect } from "react";
import { TaskActivityTimeline } from "@/features/activity/components/TaskActivityTimeline.js";

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  
  const { 
    data: taskRes, 
    isLoading, 
    error,
    refetch
  } = useTask(taskId);
  const task = taskRes?.task;

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [taskId]);

  if (isLoading) {
    return <TaskDetailSkeleton />;
  }

  // 404 or BOLA/Security block translates to a generic NotFound error
  if (error?.message?.includes("404") || error?.name === "NotFoundError" || (error as { status?: number })?.status === 404) {
    return (
      <div className="max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
        <TaskNotFoundState />
      </div>
    );
  }

  // 500 / Network Error (recoverable)
  if (error) {
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

  if (!task) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <TaskDetailHeader task={task} />
      
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Main Content (Description) */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-4">Description</h3>
          {task.description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap text-foreground/80 leading-relaxed">
              {task.description}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic bg-muted/20 border border-border/40 rounded-lg p-4">
              No description provided.
            </div>
          )}

          <div className="mt-8">
            <TaskActivityTimeline taskId={task.id} />
          </div>
        </div>

        {/* Sidebar (Properties) */}
        <div className="w-full md:w-64 lg:w-80 shrink-0">
          <TaskPropertiesPanel task={task} />
        </div>
      </div>
    </div>
  );
}
