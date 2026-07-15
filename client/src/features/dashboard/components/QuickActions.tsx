import { useNavigate } from "react-router-dom";
import { FolderPlus, Sparkles, SquareCheckBig } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Quick actions.
 *
 * "New project" and "New task" route to the pages that already own that
 * functionality, rather than duplicating a create dialog here. "Ask AI"
 * stays visible but disabled — it signals product direction without
 * pretending to work.
 */
export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        Quick actions
      </h2>

      <div className="flex flex-1 flex-col gap-2">
        <Button
          id="quick-action-new-project"
          variant="outline"
          className="justify-start gap-2"
          onClick={() => navigate("/projects")}
        >
          <FolderPlus className="h-4 w-4" />
          New project
        </Button>

        <Button
          id="quick-action-new-task"
          variant="outline"
          className="justify-start gap-2"
          onClick={() => navigate("/tasks")}
        >
          <SquareCheckBig className="h-4 w-4" />
          New task
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                id="quick-action-ask-ai"
                variant="outline"
                disabled
                className="w-full justify-start gap-2 border-dashed text-muted-foreground"
              >
                <Sparkles className="h-4 w-4" />
                Ask AI
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>The AI assistant is coming soon.</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}