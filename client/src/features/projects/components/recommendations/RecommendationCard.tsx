import { useState } from "react";
import { Sparkles, EyeOff, Lightbulb, Tag, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { RecommendationSeverityBadge } from "./RecommendationSeverityBadge";
import { DismissRecommendationDialog } from "./DismissRecommendationDialog";

import type {
  ProjectRecommendation,
  RelatedEntityRef,
} from "@/features/projects/types/project-recommendations.types";
import { SIGNAL_TYPE_LABELS } from "@/features/projects/types/project-recommendations.types";

export interface RecommendationCardProps {
  recommendation: ProjectRecommendation;
  projectName?: string;
  onDismissed?: () => void;
  showProjectBadge?: boolean;
  density?: "compact" | "detailed";
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onViewInsight?: () => void;
}

export function RecommendationCard({
  recommendation,
  projectName,
  onDismissed,
  showProjectBadge = false,
  density = "detailed",
  isExpanded = false,
  onToggleExpand,
  onViewInsight,
}: RecommendationCardProps) {
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);

  const signalLabel =
    SIGNAL_TYPE_LABELS[recommendation.type] || recommendation.type;

  // Extract project name from props or relatedEntities
  const projectEntity = recommendation.relatedEntities.find(
    (e: RelatedEntityRef) => e.type === "project",
  );
  const displayProjectName = projectName || projectEntity?.label;

  const formattedDate = recommendation.createdAt
    ? new Date(recommendation.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  // -------------------------------------------------------------------------
  // DENSITY: COMPACT (Dashboard Scan Mode)
  // -------------------------------------------------------------------------
  if (density === "compact") {
    return (
      <>
        <Card className="border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-border">
          <div className="flex flex-col gap-2">
            {/* Header: Signal Label + Project Badge + Severity */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="gap-1 text-[11px] font-normal px-2 py-0.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {signalLabel}
                </Badge>

                {showProjectBadge && displayProjectName && (
                  <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground max-w-[160px] truncate px-2 py-0.5">
                    {displayProjectName}
                  </Badge>
                )}
              </div>

              <RecommendationSeverityBadge severity={recommendation.severity} />
            </div>

            {/* Title */}
            <h4 className="text-sm font-semibold leading-snug text-foreground pt-0.5">
              {recommendation.title}
            </h4>

            {/* Short Explanation Preview (CSS line clamp) */}
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {recommendation.explanation}
            </p>

            {/* Compact Footer: View Insight Button */}
            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
              <span>{formattedDate ? `Generated ${formattedDate}` : ""}</span>

              {onViewInsight && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onViewInsight}
                  className="h-7 gap-1 px-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                  aria-label={`View details for insight: ${recommendation.title}`}
                >
                  View insight
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        <DismissRecommendationDialog
          recommendation={recommendation}
          open={dismissDialogOpen}
          onOpenChange={setDismissDialogOpen}
          onSuccess={onDismissed}
        />
      </>
    );
  }

  // -------------------------------------------------------------------------
  // DENSITY: DETAILED (All-Insights Sheet & Project Detail Page)
  // Supports optional progressive collapse/expansion
  // -------------------------------------------------------------------------
  const isExpandable = Boolean(onToggleExpand);
  const showFullDetails = !isExpandable || isExpanded;

  return (
    <>
      <Card className="flex flex-col justify-between border border-border/80 bg-card/60 shadow-sm backdrop-blur-sm transition-all hover:border-border">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs font-normal">
                <Sparkles className="h-3 w-3 text-primary" />
                {signalLabel}
              </Badge>

              {showProjectBadge && displayProjectName && (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground max-w-[200px] truncate">
                  {displayProjectName}
                </Badge>
              )}
            </div>

            <RecommendationSeverityBadge severity={recommendation.severity} />
          </div>

          <h4 className="pt-2 text-base font-semibold leading-snug text-foreground">
            {recommendation.title}
          </h4>
        </CardHeader>

        <CardContent className="p-4 pt-1 flex-1 flex flex-col gap-3">
          {/* Explanation text rendered strictly as plain text (XSS safe) */}
          <p className={`text-sm leading-relaxed text-muted-foreground whitespace-pre-line ${!showFullDetails ? "line-clamp-2" : ""}`}>
            {recommendation.explanation}
          </p>

          {/* Full details section when expanded */}
          {showFullDetails && (
            <>
              {/* Advisory Suggested Next Step */}
              {recommendation.suggestedNextStep && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/90">
                  <div className="flex items-center gap-1.5 font-medium text-primary pb-1">
                    <Lightbulb className="h-3.5 w-3.5" />
                    <span>Suggested next step</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-line">
                    {recommendation.suggestedNextStep}
                  </p>
                </div>
              )}

              {/* Related Entities (only render entity labels) */}
              {(() => {
                const nonProjectEntities = recommendation.relatedEntities.filter(
                  (e: RelatedEntityRef) => e.type !== "project" || !showProjectBadge,
                );

                if (nonProjectEntities.length === 0) return null;

                return (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mr-1">
                      <Tag className="h-3 w-3" />
                      Related:
                    </span>
                    {nonProjectEntities.map((entity: RelatedEntityRef, idx: number) => {
                      if (!entity.label) return null;
                      return (
                        <Badge
                          key={`${entity.type}-${entity.id}-${idx}`}
                          variant="outline"
                          className="bg-muted/40 text-[11px] font-normal text-muted-foreground max-w-[200px] truncate"
                          title={entity.label}
                        >
                          {entity.label}
                        </Badge>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{formattedDate ? `Generated ${formattedDate}` : ""}</span>

          <div className="flex items-center gap-2">
            {isExpandable && onToggleExpand && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                aria-expanded={isExpanded}
                className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <>
                    Show less
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Show details
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDismissDialogOpen(true)}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label={`Dismiss recommendation: ${recommendation.title}`}
            >
              <EyeOff className="h-3.5 w-3.5" />
              Dismiss
            </Button>
          </div>
        </CardFooter>
      </Card>

      <DismissRecommendationDialog
        recommendation={recommendation}
        open={dismissDialogOpen}
        onOpenChange={setDismissDialogOpen}
        onSuccess={onDismissed}
      />
    </>
  );
}
