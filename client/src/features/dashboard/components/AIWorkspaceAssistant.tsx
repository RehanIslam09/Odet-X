import { useState } from "react";
import { Sparkles, AlertCircle, RotateCcw, ArrowRight, Compass } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext.js";
import { useWorkspaceRecommendations } from "@/features/projects/hooks/useProjectRecommendations.js";
import { RecommendationCard } from "@/features/projects/components/recommendations/RecommendationCard.js";
import { WorkspaceRecommendationsSheet } from "@/features/projects/components/recommendations/WorkspaceRecommendationsSheet.js";

/**
 * AIWorkspaceAssistant
 * Merged AI intelligence module answering "What should I know?"
 * Combines telemetry risk analysis, active blockers, and proactive recommendations into one unified card.
 */
export function AIWorkspaceAssistant() {
  const { openCopilot } = useGlobalCopilot();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useWorkspaceRecommendations({
    page: 1,
    limit: 3,
    status: "ACTIVE",
  });

  const recommendations = data?.recommendations ?? [];
  const totalActive = data?.pagination?.total ?? 0;

  const handleOpenSheet = (insightId: string | null = null) => {
    setSelectedInsightId(insightId);
    setSheetOpen(true);
  };

  return (
    <>
      <Card className="flex flex-col border-border/60 bg-card shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold text-foreground">
                  AI Workspace Assistant
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate">
                  Continuous risk telemetry & proactive recommendations
                </CardDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px] font-medium border-primary/30 text-primary shrink-0 px-2 py-0.5">
              Active Signals ({totalActive})
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 flex flex-col gap-3">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col gap-3.5 py-1">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          )}

          {/* Error State */}
          {!isLoading && isError && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div className="text-xs">
                <p className="font-medium">Unable to load AI signals</p>
                <p className="text-[11px] text-muted-foreground pt-0.5">
                  Telemetry connection error. Retry to refresh signals.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-7 text-xs gap-1.5 mt-1"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          )}

          {/* Optimal / Empty State */}
          {!isLoading && !isError && recommendations.length === 0 && (
            <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-muted/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                <Compass className="h-4 w-4" />
                <span>All Workflows Optimal</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No active blockers or risk flags detected across your active projects. Workspace telemetry is being continuously monitored.
              </p>
            </div>
          )}

          {/* Recommendations List (Top 3 active) */}
          {!isLoading && !isError && recommendations.length > 0 && (
            <div className="flex flex-col gap-2.5">
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

          {/* Bottom Action Row */}
          <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
            {totalActive > 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenSheet(null)}
                className="w-full justify-between h-7 text-xs text-muted-foreground hover:text-foreground px-2"
              >
                <span>View all {totalActive} proactive signals</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}

            <Button
              id="ai-assistant-ask-copilot"
              variant="outline"
              size="sm"
              className="w-full justify-center gap-1.5 h-8 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-xs font-medium cursor-pointer"
              onClick={() => openCopilot({ type: "workspace" })}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ask AI Copilot about your workspace</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <WorkspaceRecommendationsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialExpandedId={selectedInsightId}
      />
    </>
  );
}
