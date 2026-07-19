import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button.js";
import { useDebounce } from "@/hooks/useDebounce.js";
import { useProjectOptions } from "@/features/projects/hooks/useProjectOptions.js";

import { QuickFilters } from "../components/QuickFilters.js";
import { TaskToolbar } from "../components/TaskToolbar.js";
import { TaskList } from "../components/TaskList.js";
import { CreateTaskDialog } from "../components/CreateTaskDialog.js";
import { EditTaskDialog } from "../components/EditTaskDialog.js";
import { DeleteTaskDialog } from "../components/DeleteTaskDialog.js";

import type { Task, TaskStatus, TaskPriority } from "../types/tasks.types.js";
import {
  useTasks,
  useArchiveTask,
} from "../hooks/index.js";

/**
 * Main Tasks page container.
 *
 * Responsibilities:
 * - Maintain local UI state for filter inputs (search, status, priority, projectId, sort, page).
 * - Debounce search query changes to prevent API throttling.
 * - Call the useTasks query hook to fetch filtered/paginated tasks.
 * - Call useTasks with limit: 1 for completing Quick Filter counts.
 * - Map loaded projectId to dynamic project properties (name, color) using the projects cache.
 * - Manage Open/Close status variables for Create, Edit, and Delete Task dialogs.
 */
export default function TasksPage() {
  // ---------------------------------------------------------------------------
  // Filters & Pagination State
  // ---------------------------------------------------------------------------
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [sort, setSort] = useState("dueDate");
  const [quickFilter, setQuickFilter] = useState<"all" | "my-tasks" | "due-today" | "overdue" | "completed">("all");
  const [view, setView] = useState<"list" | "board">("list");

  // Dialog management targets
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  // Debounce search input
  const debouncedSearch = useDebounce(search, 300);

  // ---------------------------------------------------------------------------
  // Projects API Integration
  // ---------------------------------------------------------------------------
  const { data: projectsData } = useProjectOptions();
  const projectOptions = useMemo(() => {
    return (projectsData || []).map((proj) => ({
      id: proj.id,
      name: `${proj.emoji} ${proj.name}`,
    }));
  }, [projectsData]);

  // ---------------------------------------------------------------------------
  // Quick Filter Total Counts Queries
  // ---------------------------------------------------------------------------
  // We run 4 query calls with limit: 1 to fetch totals for the tab badges.
  // The database evaluates these fast via indexes.
  const { data: allData } = useTasks({ page: 1, limit: 1, quickFilter: "all", archived: false });
  const { data: completedData } = useTasks({ page: 1, limit: 1, quickFilter: "completed", archived: false });
  const { data: dueTodayData } = useTasks({ page: 1, limit: 1, quickFilter: "due-today", archived: false });
  const { data: overdueData } = useTasks({ page: 1, limit: 1, quickFilter: "overdue", archived: false });

  const quickFilterCounts = useMemo(() => {
    return {
      all: allData?.pagination.total ?? 0,
      myTasks: allData?.pagination.total ?? 0, // all tasks belong to user
      dueToday: dueTodayData?.pagination.total ?? 0,
      overdue: overdueData?.pagination.total ?? 0,
      completed: completedData?.pagination.total ?? 0,
    };
  }, [allData, completedData, dueTodayData, overdueData]);

  // ---------------------------------------------------------------------------
  // Core Listing Query Integration
  // ---------------------------------------------------------------------------
  const queryParams = useMemo(() => {
    return {
      page,
      limit,
      search: debouncedSearch || undefined,
      status: status === "all" ? undefined : status,
      priority: priority === "all" ? undefined : priority,
      projectId: projectId === "all" ? undefined : projectId,
      sort,
      quickFilter: quickFilter === "all" ? undefined : quickFilter,
      archived: false,
    };
  }, [page, limit, debouncedSearch, status, priority, projectId, sort, quickFilter]);

  const { data: tasksData, isLoading, isFetching } = useTasks(queryParams);

  // Map task.projectId to project name and color using cached projects
  const mappedTasks = useMemo(() => {
    const projectsList = projectsData || [];
    const items = tasksData?.items || [];

    return items.map((task) => {
      const project = projectsList.find((p) => p.id === task.projectId);
      return {
        ...task,
        projectName: project ? project.name : undefined,
        projectColor: project ? project.color : undefined,
      };
    });
  }, [tasksData, projectsData]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const { mutate: archiveTask } = useArchiveTask();

  return (
    <div className="flex flex-col gap-5 min-h-[500px]">
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Keep track of everything that needs your attention.
          </p>
        </div>

        <Button
          id="new-task-button"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 h-8 text-xs px-3 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </motion.div>

      {/* Quick Filters Pill Toggles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <QuickFilters
          value={quickFilter}
          onChange={(val) => {
            setQuickFilter(val || "all");
            setPage(1);
          }}
          counts={quickFilterCounts}
        />
      </motion.div>

      {/* Main Filter Toolbar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.08 }}
      >
        <TaskToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          status={status}
          onStatusChange={(val) => {
            setStatus(val);
            setPage(1);
          }}
          priority={priority}
          onPriorityChange={(val) => {
            setPriority(val);
            setPage(1);
          }}
          projectId={projectId}
          onProjectIdChange={(val) => {
            setProjectId(val);
            setPage(1);
          }}
          sort={sort}
          onSortChange={(val) => {
            setSort(val);
            setPage(1);
          }}
          view={view}
          onViewChange={setView}
          projects={projectOptions}
        />
      </motion.div>

      {/* Task List Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="flex-1"
      >
        <TaskList
          tasks={mappedTasks}
          isLoading={isLoading}
          onCreateTaskClick={() => setCreateOpen(true)}
          onEditTask={(task) => setEditTarget(task)}
          onArchiveTask={(task) => archiveTask(task.id)}
          onDeleteTask={(task) => setDeleteTarget(task)}
        />

        {/* Pagination Actions */}
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

      {/* Dialog Triggers */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <EditTaskDialog
        task={editTarget}
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      <DeleteTaskDialog
        task={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
