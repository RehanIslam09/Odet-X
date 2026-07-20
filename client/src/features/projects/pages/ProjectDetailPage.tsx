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
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";

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
      <EmptyState
        icon={AlertCircle}
        title="Project Not Found"
        description="The project you are looking for does not exist, has been deleted, or you don't have permission to view it."
        action={
          <Button onClick={() => navigate("/projects")}>
            Return to Projects
          </Button>
        }
      />
    );
  }

  // Handle other network/server errors
  if (projectError) {
    return (
      <ErrorState
        title="Failed to load project"
        description="A network or server error occurred. Please try again later."
        action={
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        }
      />
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
