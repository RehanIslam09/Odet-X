import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.js";
import { EmptyState } from "@/components/common/EmptyState.js";

export function TaskNotFoundState() {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Task not found"
      description="The task you are looking for does not exist, has been deleted, or you do not have permission to view it."
      action={
        <Button asChild variant="outline">
          <Link to="/tasks">
            Back to Tasks
          </Link>
        </Button>
      }
    />
  );
}
