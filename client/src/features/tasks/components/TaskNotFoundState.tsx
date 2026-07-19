import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.js";

export function TaskNotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Task not found</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        The task you are looking for does not exist, has been deleted, or you do not have permission to view it.
      </p>
      <Button asChild variant="outline">
        <Link to="/tasks">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Link>
      </Button>
    </div>
  );
}
