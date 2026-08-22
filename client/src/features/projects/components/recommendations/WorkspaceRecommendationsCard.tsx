import { useState } from "react";
import { Sparkles, AlertCircle, RotateCcw, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useWorkspaceRecommendations } from "@/features/projects/hooks/useProjectRecommendations";
import { RecommendationCard } from "./RecommendationCard";
import { WorkspaceRecommendationsSheet } from "./WorkspaceRecommendationsSheet";

export function WorkspaceRecommendationsCard() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);

  // Request top 3 active recommendations for compact Dashboard presentation
  const { data, isLoading, isError, refetch } = useWorkspaceRecommendations({
    page: 1,
    limit: 3,
    status: "ACTIVE",
  });

  const recommendations = data?.recommendations ?? [];
  const totalActive = data?.pagination?.total ?? 0;
  const showViewAll = totalActive > 3;

  const handleOpenSheet = (insightId: string | null = null) => {
    setSelectedInsightId(insightId);
    setSheetOpen(true);
  };

  return (
    <>
      <Card className="border border-border/60 bg-card shadow-2xs">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm font-semibold text-foreground leading-snug break-words">
                  Project Insights
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-normal break-words mt-0.5">
                  Proactive intelligence and advisory items across your active projects
                </CardDescription>
              </div>
            </div>

            {/* Header Action: View All X Insights (when total > 3) */}
            {!isLoading && !isError && showViewAll && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenSheet(null)}
                className="h-7 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 self-start sm:self-auto"
              >
                <span>View all {totalActive} insights</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 flex flex-col gap-3">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          )}

          {/* Error State */}
          {!isLoading && isError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-destructive">
              <AlertCircle className="h-6 w-6" />
              <div>
                <h4 className="font-semibold text-sm">Unable to load recommendations</h4>
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
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-medium text-foreground pt-1">No recommendations right now</h4>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                Your projects don't currently have any proactive issues that need attention. Check back later as project activity updates.
              </p>
            </div>
          )}

          {/* Compact Recommendation Cards List (Max 3 visible on Dashboard) */}
          {!isLoading && !isError && recommendations.length > 0 && (
            <div className="flex flex-col gap-3">
              {recommendations.slice(0, 3).map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  showProjectBadge={true}
                  density="compact"
                  onViewInsight={() => handleOpenSheet(rec.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspace Recommendations Sheet */}
      <WorkspaceRecommendationsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialExpandedId={selectedInsightId}
      />
    </>
  );
}
