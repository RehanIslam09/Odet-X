import { CircleDot, SignalHigh, FolderKanban } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskStatus, TaskPriority } from "../types/tasks.types";

interface ProjectOption {
  id: string;
  name: string;
}

interface TaskFiltersProps {
  status: TaskStatus | "all";
  onStatusChange: (status: TaskStatus | "all") => void;
  priority: TaskPriority | "all";
  onPriorityChange: (priority: TaskPriority | "all") => void;
  projectId: string | "all";
  onProjectIdChange: (projectId: string | "all") => void;
  projects: ProjectOption[];
}

export function TaskFilters({
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  projectId,
  onProjectIdChange,
  projects,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status Filter */}
      <div className="flex items-center gap-1">
        <Select value={status} onValueChange={(val) => onStatusChange(val as TaskStatus | "all")}>
          <SelectTrigger size="sm" className="h-8 text-xs font-medium bg-background border border-border/80 min-w-[110px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CircleDot className="h-3.5 w-3.5" />
              <SelectValue placeholder="Status" />
            </span>
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority Filter */}
      <div className="flex items-center gap-1">
        <Select value={priority} onValueChange={(val) => onPriorityChange(val as TaskPriority | "all")}>
          <SelectTrigger size="sm" className="h-8 text-xs font-medium bg-background border border-border/80 min-w-[110px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <SignalHigh className="h-3.5 w-3.5" />
              <SelectValue placeholder="Priority" />
            </span>
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="none">No Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project Filter */}
      <div className="flex items-center gap-1">
        <Select value={projectId} onValueChange={onProjectIdChange}>
          <SelectTrigger size="sm" className="h-8 text-xs font-medium bg-background border border-border/80 min-w-[120px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5" />
              <SelectValue placeholder="Project" />
            </span>
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((proj) => (
              <SelectItem key={proj.id} value={proj.id}>
                {proj.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
