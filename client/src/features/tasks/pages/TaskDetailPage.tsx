import { useParams } from "react-router-dom";
import { useEffect } from "react";

import { useTask } from "../hooks/useTask.js";
import { TaskDetailHeader } from "../components/TaskDetailHeader.js";
import { TaskPropertiesPanel } from "../components/TaskPropertiesPanel.js";
import { TaskNotesPreview } from "../components/TaskNotesPreview.js";
import { TaskNotFoundState } from "../components/TaskNotFoundState.js";
import { TaskDetailSkeleton } from "../components/TaskDetailSkeleton.js";
import { Button } from "@/components/ui/button.js";
import { ErrorState } from "@/components/common/ErrorState.js";
import { TaskActivityTimeline } from "@/features/activity/components/TaskActivityTimeline.js";
import { useRecentlyViewed } from "@/features/navigation/hooks/useRecentlyViewed.js";

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { addRecentlyViewed } = useRecentlyViewed();

  const {
    data: taskRes,
    isLoading,
    error,
    refetch,
  } = useTask(taskId);
  const task = taskRes?.task;

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [taskId]);

  useEffect(() => {
    if (task?.id && task?.title) {
      addRecentlyViewed({
        id: task.id,
        title: task.title,
        type: "task",
        url: `/tasks/${task.id}`,
      });
    }
  }, [task?.id, task?.title, addRecentlyViewed]);

  if (isLoading) {
    return <TaskDetailSkeleton />;
  }

  // 404 or BOLA/Security block translates to a generic NotFound error
  if (error?.message?.includes("404") || error?.name === "NotFoundError" || (error as { status?: number })?.status === 404) {
    return (
      <div className="mx-auto w-full max-w-5xl animate-in fade-in duration-500">
        <TaskNotFoundState />
      </div>
    );
  }

  // 500 / Network Error (recoverable)
  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl animate-in fade-in duration-500">
        <ErrorState
          title="Failed to load task"
          description="There was a problem communicating with the server. Please check your connection and try again."
          action={
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl animate-in fade-in duration-500">
      <TaskDetailHeader task={task} />

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Main Content (Description) */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-4">Description</h3>
          {task.description ? (
            <div className="markdown-prose text-sm">
              {task.description}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic bg-muted/20 border border-border/40 rounded-lg p-4">
              No description provided.
            </div>
          )}

          <div className="mt-8">
            <TaskNotesPreview task={task} />
          </div>

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
