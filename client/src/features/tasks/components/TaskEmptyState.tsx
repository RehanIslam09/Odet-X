import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskEmptyStateProps {
  onCreateClick?: () => void;
}

export function TaskEmptyState({ onCreateClick }: TaskEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center shadow-xs transition-all duration-300">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 border border-border/80 mb-4">
        <ClipboardList className="h-6 w-6 text-muted-foreground/80 animate-bounce-slow" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight">No tasks found</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-[320px] leading-normal">
        No tasks match your current filters. Create a new task or adjust filters to start planning.
      </p>
      <Button
        id="empty-state-create-button"
        variant="outline"
        size="sm"
        onClick={onCreateClick}
        className="mt-5 text-xs h-8 px-4 font-medium shadow-xs hover:bg-accent"
      >
        Create Task
      </Button>
    </div>
  );
}
