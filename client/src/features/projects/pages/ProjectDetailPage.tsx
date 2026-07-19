import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

import { useProject } from "@/features/projects/hooks/useProject";
import { useProjectSummary } from "@/features/projects/hooks/useProjectSummary";
import { useArchiveProject } from "@/features/projects/hooks";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/utils/api-error";

import { ProjectHeader } from "@/features/projects/components/ProjectHeader";
import { ProjectSummaryCards } from "@/features/projects/components/ProjectSummaryCards";
import { ProjectTasks } from "@/features/projects/components/ProjectTasks";
import { EditProjectDialog } from "@/features/projects/components/EditProjectDialog";
import { DeleteProjectDialog } from "@/features/projects/components/DeleteProjectDialog";
import { EntityActivityTimeline } from "@/features/activity/components/EntityActivityTimeline";

/**
 * The Project Detail Workspace.
 * Fetches the project by ID from the URL, and displays the workspace UI.
 */
export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const {
    data: projectData,
    isLoading: isProjectLoading,
    error: projectError,
  } = useProject(projectId);

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
  } = useProjectSummary(projectId);

  const { mutate: archiveProject } = useArchiveProject();

  // Dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Render States
  // ---------------------------------------------------------------------------

  if (isProjectLoading) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  // Handle 404 (Not Found) or 403 (mapped to 404 by backend)
  const isNotFoundError = isApiError(projectError, 404);

  if (isNotFoundError || (!isProjectLoading && !projectData)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Project Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          The project you are looking for does not exist, has been deleted, or you don't have permission to view it.
        </p>
        <Button onClick={() => navigate("/projects")} className="mt-6">
          Return to Projects
        </Button>
      </div>
    );
  }

  // Handle other network/server errors
  if (projectError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Failed to load project</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          A network or server error occurred. Please try again later.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-6">
          Retry
        </Button>
      </div>
    );
  }

  const project = projectData!.project;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-8"
    >
      <ProjectHeader
        project={project}
        onEdit={() => setEditOpen(true)}
        onArchive={() => archiveProject(project.id)}
        onDelete={() => setDeleteOpen(true)}
      />

      <ProjectSummaryCards
        summary={summaryData!}
        isLoading={isSummaryLoading}
      />

      <ProjectTasks projectId={project.id} />

      <EntityActivityTimeline projectId={project.id} />

      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          setDeleteOpen(false);
          // Redirect safely to projects list after deletion
          navigate("/projects", { replace: true });
        }}
      />
    </motion.div>
  );
}
