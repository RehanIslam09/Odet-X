import { useState } from "react";
import { Bookmark, Brain, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { useProjectMemories } from "@/features/projects/hooks/useProjectMemories";
import type { ProjectMemory } from "@/features/projects/types/project-memory.types";
import { ProjectMemoryItem } from "@/features/projects/components/memories/ProjectMemoryItem";
import { CreateProjectMemoryDialog } from "@/features/projects/components/memories/CreateProjectMemoryDialog";
import { EditProjectMemoryDialog } from "@/features/projects/components/memories/EditProjectMemoryDialog";
import { DeleteProjectMemoryDialog } from "@/features/projects/components/memories/DeleteProjectMemoryDialog";

interface ProjectMemoriesCardProps {
  projectId: string;
  isArchived?: boolean;
}

export function ProjectMemoriesCard({
  projectId,
  isArchived = false,
}: ProjectMemoriesCardProps) {
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading, isError, refetch } = useProjectMemories(projectId, {
    page,
    limit,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [deletingMemory, setDeletingMemory] = useState<ProjectMemory | null>(null);

  const items = data?.items || [];
  const pagination = data?.pagination;

  // Dynamically resolve active editing memory document from query cache items list
  const activeEditingMemory = items.find((m) => m.id === editingMemoryId) || null;

  // Pagination recovery rule: If page > 1 becomes empty (e.g. last item deleted), adjust page during render
  if (data && items.length === 0 && page > 1) {
    setPage((p) => Math.max(1, p - 1));
  }

  return (
    <Card className="relative overflow-hidden border-border/80 bg-card shadow-xs">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold tracking-tight">
                Project Memories
              </CardTitle>
              <Badge variant="secondary" className="text-[11px] font-medium">
                Copilot Context
              </Badge>
              {isArchived && (
                <Badge variant="outline" className="text-[11px] font-normal">
                  Archived Project
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Memory
        </Button>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-4">
        {/* Context Guidance Banner */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Project memory gives Copilot persistent context about this project. Memories are added and managed by you.
        </p>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-3 py-1">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-6 text-center rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-xs text-destructive font-medium mb-2">
              Failed to load project memories.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-dashed border-border p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
              <Bookmark className="h-5 w-5 text-muted-foreground" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">
              No project memories yet
            </h4>
            <p className="max-w-md text-xs text-muted-foreground mb-4 leading-relaxed">
              Add important context, preferences, constraints, or decisions that Project Copilot should remember when helping with this project.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-2 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Memory
            </Button>
          </div>
        )}

        {/* Memories List */}
        {!isLoading && !isError && items.length > 0 && (
          <div className="space-y-3">
            {items.map((mem) => (
              <ProjectMemoryItem
                key={mem.id}
                memory={mem}
                onEdit={(m) => setEditingMemoryId(m.id)}
                onDelete={(m) => setDeletingMemory(m)}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && !isError && pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground border-t border-border/60">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} memories)
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2.5"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2.5"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <CreateProjectMemoryDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <EditProjectMemoryDialog
        projectId={projectId}
        memory={activeEditingMemory}
        open={Boolean(activeEditingMemory)}
        onOpenChange={(open) => {
          if (!open) setEditingMemoryId(null);
        }}
      />

      <DeleteProjectMemoryDialog
        projectId={projectId}
        memory={deletingMemory}
        open={Boolean(deletingMemory)}
        onOpenChange={(open) => {
          if (!open) setDeletingMemory(null);
        }}
      />
    </Card>
  );
}
