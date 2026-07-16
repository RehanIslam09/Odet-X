import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskSearch } from "./TaskSearch";
import { TaskFilters } from "./TaskFilters";
import { TaskViewToggle } from "./TaskViewToggle";
import type { TaskStatus, TaskPriority } from "../types/tasks.types.js";

interface ProjectOption {
  id: string;
  name: string;
}

interface TaskToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: TaskStatus | "all";
  onStatusChange: (status: TaskStatus | "all") => void;
  priority: TaskPriority | "all";
  onPriorityChange: (priority: TaskPriority | "all") => void;
  projectId: string | "all";
  onProjectIdChange: (projectId: string | "all") => void;
  sort: string;
  onSortChange: (sort: string) => void;
  view: "list" | "board";
  onViewChange: (view: "list" | "board") => void;
  projects: ProjectOption[];
}

export function TaskToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  projectId,
  onProjectIdChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  projects,
}: TaskToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border border-border/40 bg-muted/10 p-3 rounded-lg shadow-2xs gap-y-4">
      {/* Left side: Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
        <TaskSearch value={search} onChange={onSearchChange} />
        <TaskFilters
          status={status}
          onStatusChange={onStatusChange}
          priority={priority}
          onPriorityChange={onPriorityChange}
          projectId={projectId}
          onProjectIdChange={onProjectIdChange}
          projects={projects}
        />
      </div>

      {/* Right side: Sorting & View Toggle */}
      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
        {/* Sort Select */}
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger size="sm" className="h-8 text-xs font-medium bg-background border border-border/80 min-w-[130px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <SelectValue placeholder="Sort" />
            </span>
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="dueDate">Due Date: Soonest</SelectItem>
            <SelectItem value="-dueDate">Due Date: Furthest</SelectItem>
            <SelectItem value="-priority">Priority: High to Low</SelectItem>
            <SelectItem value="priority">Priority: Low to High</SelectItem>
            <SelectItem value="title">Title: A-Z</SelectItem>
            <SelectItem value="-createdAt">Created: Newest</SelectItem>
          </SelectContent>
        </Select>

        <TaskViewToggle view={view} onViewChange={onViewChange} />
      </div>
    </div>
  );
}
