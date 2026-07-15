import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";

import { Button } from "@/components/ui/button";

import { ProjectGrid } from "@/features/projects/components/ProjectGrid";
import { ProjectFilters } from "@/features/projects/components/ProjectFilters";
import { CreateProjectDialog } from "@/features/projects/components/CreateProjectDialog";
import { EditProjectDialog } from "@/features/projects/components/EditProjectDialog";
import { DeleteProjectDialog } from "@/features/projects/components/DeleteProjectDialog";

import {
  useProjects,
  useArchiveProject,
} from "@/features/projects/hooks";

import type { Project } from "@/features/projects/types/projects.types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 12;

// ---------------------------------------------------------------------------
// Pagination Component
// ---------------------------------------------------------------------------

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
}

function PaginationControls({
  page,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <Button
        id="pagination-prev"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPreviousPage}
      >
        Previous
      </Button>

      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      <Button
        id="pagination-next"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
      >
        Next
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

/**
 * Projects Dashboard — the landing page after login.
 *
 * This page is the primary view of the application. It owns all project-level
 * UI state (dialogs, pagination, search, filters) and delegates data fetching
 * to React Query hooks.
 *
 * State decisions:
 * - `page`, `search`, `showArchived` are local state because they are pure UI.
 * - Searching resets to page 1 to avoid landing on a non-existent page.
 * - `debouncedSearch` delays the API call to avoid firing on every keystroke.
 * - Dialog state (which project is selected, which dialog is open) is local state.
 */
export default function ProjectsDashboardPage() {
  // ---------------------------------------------------------------------------
  // UI State
  // ---------------------------------------------------------------------------
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  // Debounce search to avoid firing API calls on every keystroke
  const debouncedSearch = useDebounce(search, 300);


  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const { data, isLoading } = useProjects({
    page,
    limit: DEFAULT_LIMIT,
    search: debouncedSearch || undefined,
    archived: showArchived,
    sort: "-updatedAt",
  });

  const { mutate: archiveProject } = useArchiveProject();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1); // Reset to page 1 when search changes
  }, []);

  const handleShowArchivedChange = useCallback((value: boolean) => {
    setShowArchived(value);
    setPage(1);
  }, []);

  const handleEdit = useCallback((project: Project) => {
    setEditTarget(project);
  }, []);

  const handleArchive = useCallback(
    (project: Project) => {
      archiveProject(project.id);
    },
    [archiveProject],
  );

  const handleDelete = useCallback((project: Project) => {
    setDeleteTarget(project);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const projects = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pagination
              ? `${pagination.total} project${pagination.total === 1 ? "" : "s"}`
              : "Your workspace"}
          </p>
        </div>

        <Button
          id="create-project-button"
          onClick={() => setCreateOpen(true)}
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <ProjectFilters
          search={search}
          onSearchChange={handleSearchChange}
          showArchived={showArchived}
          onShowArchivedChange={handleShowArchivedChange}
        />
      </motion.div>

      {/* Grid */}
      <ProjectGrid
        projects={projects}
        isLoading={isLoading}
        onCreateProject={() => setCreateOpen(true)}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {pagination && (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          hasNextPage={pagination.hasNextPage}
          hasPreviousPage={pagination.hasPreviousPage}
          onPageChange={setPage}
        />
      )}

      {/* Dialogs */}
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <EditProjectDialog
        project={editTarget}
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      <DeleteProjectDialog
        project={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
