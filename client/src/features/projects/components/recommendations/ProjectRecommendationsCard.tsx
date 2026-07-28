import { useState } from "react";
import { Sparkles, AlertCircle, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useProjectRecommendations } from "@/features/projects/hooks/useProjectRecommendations";
import { RecommendationCard } from "./RecommendationCard";

interface ProjectRecommendationsCardProps {
  projectId: string;
  isArchived?: boolean;
}

export function ProjectRecommendationsCard({
  projectId,
  isArchived = false,
}: ProjectRecommendationsCardProps) {
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data, isLoading, isError, refetch } = useProjectRecommendations(
    projectId,
    { page, limit, status: "ACTIVE" },
  );

  const recommendations = data?.recommendations ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 5, totalPages: 1 };

  const handleDismissed = () => {
    // Handle pagination recovery if last item on page > 1 is dismissed
    if (recommendations.length === 1 && page > 1) {
      setPage((prev) => Math.max(1, prev - 1));
    }
  };

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Project Recommendations</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Proactive intelligence items requiring attention for this project
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0 flex flex-col gap-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-destructive">
            <AlertCircle className="h-6 w-6" />
            <div>
              <h4 className="font-semibold">Unable to load recommendations</h4>
              <p className="text-xs text-muted-foreground pt-1">
                An error occurred fetching project recommendations. Please try again.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && recommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-medium text-foreground pt-1">
              No active recommendations for this project
            </h4>
            <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
              {isArchived
                ? "This project is archived and has no active recommendations."
                : "Recommendations will appear here automatically when proactive conditions are detected."}
            </p>
          </div>
        )}

        {/* Recommendation Cards List */}
        {!isLoading && !isError && recommendations.length > 0 && (
          <div className="flex flex-col gap-4">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                showProjectBadge={false}
                onDismissed={handleDismissed}
              />
            ))}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-8 gap-1 px-2 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="h-8 gap-1 px-2 text-xs"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
