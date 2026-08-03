import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskBoardEmptyStateProps {
  onCreateTaskClick?: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function TaskBoardEmptyState({
  onCreateTaskClick,
  hasActiveFilters = false,
  onClearFilters,
}: TaskBoardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 p-12 text-center min-h-[350px]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
        <CheckCircle2 className="h-6 w-6" />
      </div>

      <h3 className="text-lg font-semibold text-foreground">
        {hasActiveFilters ? "No Tasks Match Your Filters" : "No Tasks Found"}
      </h3>

      <p className="mt-1 text-xs text-muted-foreground max-w-sm">
        {hasActiveFilters
          ? "Try adjusting or clearing your active filters to see tasks in your workspace."
          : "Get started by creating your first task or AI-generated action plan."}
      </p>

      <div className="mt-6 flex items-center gap-3">
        {hasActiveFilters && onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}

        {onCreateTaskClick && (
          <Button size="sm" className="gap-1.5" onClick={onCreateTaskClick}>
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        )}
      </div>
    </div>
  );
}
