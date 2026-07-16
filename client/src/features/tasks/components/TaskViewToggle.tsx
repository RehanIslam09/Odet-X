import { List, Kanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskViewToggleProps {
  view: "list" | "board";
  onViewChange: (view: "list" | "board") => void;
}

export function TaskViewToggle({ view, onViewChange }: TaskViewToggleProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/30 p-0.5">
        {/* List View Toggle (Active) */}
        <Button
          id="view-toggle-list"
          variant="ghost"
          size="sm"
          onClick={() => onViewChange("list")}
          className={`h-7 px-2.5 text-xs gap-1.5 font-medium rounded-md shadow-2xs transition-all ${
            view === "list"
              ? "bg-background text-foreground border border-border/40 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <List className="h-3.5 w-3.5" />
          <span>List</span>
        </Button>

        {/* Board View Toggle (Disabled, Coming Soon) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                id="view-toggle-board"
                variant="ghost"
                size="sm"
                disabled
                className="h-7 px-2.5 text-xs gap-1.5 font-medium rounded-md text-muted-foreground/40 cursor-not-allowed opacity-60"
              >
                <Kanban className="h-3.5 w-3.5" />
                <span>Board</span>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[11px] py-1 px-2">
            Board view is coming soon
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
