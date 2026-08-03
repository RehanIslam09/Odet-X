import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

import { useProject } from "@/features/projects/hooks/useProject.js";
import { useProjectSummary } from "@/features/projects/hooks/useProjectSummary.js";
import { useArchiveProject } from "@/features/projects/hooks/index.js";
import { useRecentlyViewed } from "@/features/navigation/hooks/useRecentlyViewed.js";

import { Button } from "@/components/ui/button.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { isApiError } from "@/utils/api-error.js";
import { ErrorState } from "@/components/common/ErrorState.js";
import { EmptyState } from "@/components/common/EmptyState.js";

import { ProjectHeader } from "@/features/projects/components/ProjectHeader.js";
import { ProjectSummaryCards } from "@/features/projects/components/ProjectSummaryCards.js";
import { ProjectAISummaryCard } from "@/features/projects/components/ProjectAISummaryCard.js";
import { ProjectRecommendationsCard } from "@/features/projects/components/recommendations/ProjectRecommendationsCard.js";
import { ProjectMemoriesCard } from "@/features/projects/components/memories/ProjectMemoriesCard.js";
import { ProjectTasks } from "@/features/projects/components/ProjectTasks.js";
import { EditProjectDialog } from "@/features/projects/components/EditProjectDialog.js";
import { DeleteProjectDialog } from "@/features/projects/components/DeleteProjectDialog.js";
import { EntityActivityTimeline } from "@/features/activity/components/EntityActivityTimeline.js";
import { ProjectCopilotSheet } from "@/features/ai/components/copilot/ProjectCopilotSheet.js";

/**
 * The Project Detail Workspace.
 * Fetches the project by ID from the URL, and displays the workspace UI.
 */
export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { addRecentlyViewed } = useRecentlyViewed();

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

  // Dialog & Sheet state
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const project = projectData?.project;

  useEffect(() => {
    if (project?.id && project?.name) {
      addRecentlyViewed({
        id: project.id,
        title: project.name,
        type: "project",
        url: `/projects/${project.id}`,
      });
    }
  }, [project?.id, project?.name, addRecentlyViewed]);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-8"
    >
      <ProjectHeader
        project={project!}
        onEdit={() => setEditOpen(true)}
        onArchive={() => archiveProject(project!.id)}
        onDelete={() => setDeleteOpen(true)}
        onAskCopilot={() => setCopilotOpen(true)}
      />

      <ProjectSummaryCards
        summary={summaryData!}
        isLoading={isSummaryLoading}
      />

      <ProjectAISummaryCard project={project!} />

      <ProjectRecommendationsCard
        projectId={project!.id}
        isArchived={project!.archived}
      />

      <ProjectMemoriesCard
        projectId={project!.id}
        isArchived={project!.archived}
      />

      <ProjectTasks projectId={project!.id} />

      <EntityActivityTimeline projectId={project!.id} />

      <EditProjectDialog
        project={project!}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteProjectDialog
        project={project!}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => {
          setDeleteOpen(false);
          // Redirect safely to projects list after deletion
          navigate("/projects", { replace: true });
        }}
      />

      <ProjectCopilotSheet
        projectId={project!.id}
        open={copilotOpen}
        onOpenChange={setCopilotOpen}
      />
    </motion.div>
  );
}
