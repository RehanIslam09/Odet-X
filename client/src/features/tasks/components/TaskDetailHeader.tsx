import { ArrowLeft, MoreHorizontal, Pencil, Archive, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.js";
import { TaskStatusSelect } from "./TaskStatusSelect.js";
import { TaskPrioritySelect } from "./TaskPrioritySelect.js";
import { EditTaskDialog } from "./EditTaskDialog.js";
import { DeleteTaskDialog } from "./DeleteTaskDialog.js";

import type { Task } from "../types/tasks.types.js";
import { useArchiveTask } from "../hooks/useArchiveTask.js";
import { useProject } from "@/features/projects/hooks/useProject.js";
import { cn } from "@/lib/utils.js";

interface TaskDetailHeaderProps {
  task: Task;
}

export function TaskDetailHeader({ task }: TaskDetailHeaderProps) {
  const navigate = useNavigate();
  const { mutate: archiveTask } = useArchiveTask();
  const { data: projectRes } = useProject(task.projectId ?? undefined);
  const project = projectRes?.project;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 mb-8">
        {/* Breadcrumb / Back */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {project ? (
            <>
              <Link 
                to="/projects" 
                className="hover:text-foreground transition-colors flex items-center"
              >
                Projects
              </Link>
              <span>/</span>
              <Link 
                to={`/projects/${project.id}`}
                className="hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                {project.emoji && <span>{project.emoji}</span>}
                <span className="truncate max-w-[150px]">{project.name}</span>
              </Link>
              <span>/</span>
              <span className="text-foreground truncate max-w-[200px]">Task</span>
            </>
          ) : (
            <>
              <Link 
                to="/tasks" 
                className="hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Tasks
              </Link>
            </>
          )}
        </div>

        {/* Title and Actions */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            <h1 className={cn(
              "text-2xl md:text-3xl font-bold tracking-tight text-foreground break-words",
              task.status === "done" && "text-muted-foreground/80 line-through",
              task.status === "cancelled" && "text-muted-foreground/60 line-through"
            )}>
              {task.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <TaskStatusSelect taskId={task.id} status={task.status} />
              <TaskPrioritySelect taskId={task.id} priority={task.priority} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="hidden sm:flex"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="sm:px-2">
                  <span className="sr-only">More options</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => setIsEditDialogOpen(true)}
                  className="sm:hidden"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => archiveTask(task.id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  {task.archived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <EditTaskDialog
        task={task}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
      <DeleteTaskDialog
        task={task}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onSuccess={() => {
          if (task.projectId) {
            navigate(`/projects/${task.projectId}`);
          } else {
            navigate("/tasks");
          }
        }}
      />
    </>
  );
}
