import { useState } from "react";
import { Sparkles, AlertCircle, RotateCcw, Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

import { useWorkspaceRecommendations } from "@/features/projects/hooks/useProjectRecommendations";
import { RecommendationCard } from "./RecommendationCard";
import type { ProjectRecommendation } from "@/features/projects/types/project-recommendations.types";

interface WorkspaceRecommendationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialExpandedId?: string | null;
}

export function WorkspaceRecommendationsSheet({
  open,
  onOpenChange,
  initialExpandedId = null,
}: WorkspaceRecommendationsSheetProps) {
  const [page, setPage] = useState(1);
  const limit = 10;

  // State derived tracking for sheet open and expansion synchronization
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialId, setPrevInitialId] = useState(initialExpandedId);
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId);

  // Sync expandedId when open or initialExpandedId prop changes during render
  if (open !== prevOpen || initialExpandedId !== prevInitialId) {
    setPrevOpen(open);
    setPrevInitialId(initialExpandedId);
    if (open) {
      setExpandedId(initialExpandedId);
    }
  }

  // Accumulated items for progressive "Load More" pagination
  const [accumulatedItems, setAccumulatedItems] = useState<ProjectRecommendation[]>([]);

  const { data, isLoading, isError, isFetching, refetch } = useWorkspaceRecommendations({
    page,
    limit,
    status: "ACTIVE",
  });

  // Render-phase state adjustment for query data accumulation
  const [prevData, setPrevData] = useState(data?.recommendations);
  const [prevPage, setPrevPage] = useState(page);

  if (data?.recommendations && (data.recommendations !== prevData || page !== prevPage)) {
    setPrevData(data.recommendations);
    setPrevPage(page);
    if (page === 1) {
      setAccumulatedItems(data.recommendations);
    } else {
      setAccumulatedItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = data.recommendations.filter((item) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }

  // Reset pagination state when sheet closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPage(1);
      setAccumulatedItems([]);
      setExpandedId(null);
    }
    onOpenChange(newOpen);
  };

  const displayItems = page === 1 && accumulatedItems.length === 0 ? (data?.recommendations ?? []) : accumulatedItems;
  const totalActive = data?.pagination?.total ?? 0;
  const hasMore = displayItems.length < totalActive;

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleItemDismissed = (dismissedId: string) => {
    setAccumulatedItems((prev) => prev.filter((item) => item.id !== dismissedId));
    if (expandedId === dismissedId) {
      setExpandedId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full overflow-hidden border-l border-border bg-background"
      >
        {/* Header */}
        <SheetHeader className="p-4 sm:p-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base sm:text-lg font-semibold leading-none truncate">
                Project Insights
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1 truncate">
                {totalActive > 0
                  ? `${totalActive} active proactive insight${totalActive === 1 ? "" : "s"} across your workspace`
                  : "All proactive intelligence and advisory items across your active projects"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {/* Loading State (Page 1) */}
          {isLoading && page === 1 && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading insights feed...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && isError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-destructive">
              <AlertCircle className="h-6 w-6" />
              <div>
                <h4 className="font-semibold text-sm">Unable to load insights</h4>
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
          {!isLoading && !isError && displayItems.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-8 text-center my-auto">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-medium text-foreground pt-1">No recommendations right now</h4>
              <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                Your projects don't currently have any proactive issues that need attention. Check back later as project activity updates.
              </p>
            </div>
          )}

          {/* Recommendations List */}
          {!isError && displayItems.length > 0 && (
            <div className="flex flex-col gap-4">
              {displayItems.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  showProjectBadge={true}
                  density="detailed"
                  isExpanded={expandedId === rec.id}
                  onToggleExpand={() => handleToggleExpand(rec.id)}
                  onDismissed={() => handleItemDismissed(rec.id)}
                />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-2 pb-4 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={isFetching}
                    className="w-full sm:w-auto gap-2 text-xs h-9 px-6"
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      <>
                        Load more insights ({displayItems.length} of {totalActive})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
