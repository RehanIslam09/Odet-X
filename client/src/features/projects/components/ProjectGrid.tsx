import type { Project } from "@/features/projects/types/projects.types";

import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { ProjectCardSkeleton } from "@/features/projects/components/ProjectCardSkeleton";
import { ProjectEmptyState } from "@/features/projects/components/ProjectEmptyState";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectGridProps {
  projects: Project[];
  isLoading: boolean;
  onCreateProject: () => void;
  onEdit: (project: Project) => void;
  onArchive: (project: Project) => void;
  onDelete: (project: Project) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SKELETON_COUNT = 6;

/**
 * Renders the project grid, skeleton loading state, or empty state.
 *
 * The grid uses a responsive CSS grid: 1 column on mobile, 2 on tablet,
 * 3 on desktop. This is sufficient for the initial phase.
 */
export function ProjectGrid({
  projects,
  isLoading,
  onCreateProject,
  onEdit,
  onArchive,
  onDelete,
}: ProjectGridProps) {
  // Skeleton loading state — show cards in the same grid layout.
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state — no projects found (with or without active filters).
  if (projects.length === 0) {
    return <ProjectEmptyState onCreateProject={onCreateProject} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          index={index}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
