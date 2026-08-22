import { Search, SlidersHorizontal } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskViewToggle } from "@/features/tasks/components/TaskViewToggle";

interface ProjectFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  view?: "list" | "board";
  onViewChange?: (view: "list" | "board") => void;
}

/**
 * Search and filter controls for the project list.
 *
 * - Search is debounced at the page level so this component only controls
 *   the visual input state.
 * - "Show Archived" is a binary toggle — it changes which endpoint param
 *   is sent, not a local filter.
 */
export function ProjectFilters({
  search,
  onSearchChange,
  showArchived,
  onShowArchivedChange,
  view = "list",
  onViewChange,
}: ProjectFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 items-center gap-3 max-w-md">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="project-search"
            type="search"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Show archived toggle */}
        <Button
          id="toggle-archived-projects"
          variant={showArchived ? "secondary" : "outline"}
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => onShowArchivedChange(!showArchived)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {showArchived ? "Hide Archived" : "Show Archived"}
        </Button>
      </div>

      {/* List | Board View Toggle */}
      {onViewChange && (
        <TaskViewToggle view={view} onViewChange={onViewChange} />
      )}
    </div>
  );
}
