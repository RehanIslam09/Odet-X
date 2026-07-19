import { useState, useMemo } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";

import { TaskToolbar } from "@/features/tasks/components/TaskToolbar";
import { TaskList } from "@/features/tasks/components/TaskList";
import { CreateTaskDialog } from "@/features/tasks/components/CreateTaskDialog";
import { EditTaskDialog } from "@/features/tasks/components/EditTaskDialog";
import { DeleteTaskDialog } from "@/features/tasks/components/DeleteTaskDialog";

import type { Task, TaskStatus, TaskPriority } from "@/features/tasks/types/tasks.types";
import { useTasks, useArchiveTask } from "@/features/tasks/hooks";

interface ProjectTasksProps {
  projectId: string;
}

export function ProjectTasks({ projectId }: ProjectTasksProps) {
  // ---------------------------------------------------------------------------
  // Filters & Pagination State
  // ---------------------------------------------------------------------------
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");
  const [sort, setSort] = useState("dueDate");
  const [view, setView] = useState<"list" | "board">("list");

  // Dialog management targets
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const queryParams = useMemo(() => ({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
    projectId, // Fixed to the current project
    sort,
    archived: false,
  }), [page, limit, debouncedSearch, status, priority, projectId, sort]);

  const { data: tasksData, isLoading, isFetching } = useTasks(queryParams);

  const mappedTasks = tasksData?.items || [];

  const { mutate: archiveTask } = useArchiveTask();

  return (
    <div className="flex flex-col gap-5 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Tasks</h2>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="shadow-sm">
          New Task
        </Button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        <TaskToolbar
          search={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          status={status}
          onStatusChange={(val) => { setStatus(val); setPage(1); }}
          priority={priority}
          onPriorityChange={(val) => { setPriority(val); setPage(1); }}
          projectId="all" // Hide project filter by defaulting to "all" and not exposing it, although TaskToolbar renders it.
          onProjectIdChange={() => {}} // No-op since it's fixed
          sort={sort}
          onSortChange={(val) => { setSort(val); setPage(1); }}
          view={view}
          onViewChange={setView}
          projects={[]} // Pass empty so the project filter dropdown is empty/hidden if implemented that way
        />
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <TaskList
          tasks={mappedTasks}
          isLoading={isLoading}
          onCreateTaskClick={() => setCreateOpen(true)}
          onEditTask={setEditTarget}
          onArchiveTask={(task) => archiveTask(task.id)}
          onDeleteTask={setDeleteTarget}
        />

        {tasksData && tasksData.pagination.totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
            <span>
              Showing Page {tasksData.pagination.page} of {tasksData.pagination.totalPages} ({tasksData.pagination.total} total items)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 cursor-pointer"
                disabled={!tasksData.pagination.hasPreviousPage || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 cursor-pointer"
                disabled={!tasksData.pagination.hasNextPage || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Phase 12.3: Use Project-scoped CreateTaskDialog */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialProjectId={projectId}
        fixedProject={true}
      />

      <EditTaskDialog
        task={editTarget}
        open={Boolean(editTarget)}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
      />

      <DeleteTaskDialog
        task={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      />
    </div>
  );
}
