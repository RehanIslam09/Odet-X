import { motion } from "framer-motion";
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import type { Project } from "@/features/projects/types/projects.types";
import { useGenerateProjectSummary } from "@/features/ai";

interface ProjectAISummaryCardProps {
  project: Project;
}

/**
 * Card component for displaying and generating AI Project Summaries.
 *
 * UX Behavior:
 * - Renders persisted `project.aiSummary` (`summary`, `highlights`, `risks`).
 * - Displays loading skeletons while summary generation is in-flight.
 * - Provides a "Regenerate Summary" or "Generate AI Summary" action.
 * - Gracefully handles projects with no generated summary yet.
 */
export function ProjectAISummaryCard({ project }: ProjectAISummaryCardProps) {
  const { mutate: generateSummary, isPending } = useGenerateProjectSummary(project.id);

  const aiSummary = project.aiSummary;
  const hasSummary = Boolean(aiSummary && aiSummary.summary);

  return (
    <Card className="relative overflow-hidden border-border/80 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">
              AI Project Summary
            </CardTitle>
          </div>
          {hasSummary && (
            <Badge variant="secondary" className="text-[11px] font-medium">
              AI Generated
            </Badge>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => generateSummary()}
          disabled={isPending}
          className="gap-2 shadow-sm"
        >
          {isPending ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Generating…
            </>
          ) : hasSummary ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Generate Summary
            </>
          )}
        </Button>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        {isPending ? (
          <div className="space-y-3 py-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <div className="mt-4 flex gap-4">
              <Skeleton className="h-16 flex-1 rounded-lg" />
              <Skeleton className="h-16 flex-1 rounded-lg" />
            </div>
          </div>
        ) : hasSummary && aiSummary ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Overview Summary */}
            <p className="text-sm leading-relaxed text-foreground/90">
              {aiSummary.summary}
            </p>

            {/* Key Highlights & Identified Risks */}
            {(aiSummary.highlights?.length > 0 || aiSummary.risks?.length > 0) && (
              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                {/* Highlights */}
                {aiSummary.highlights && aiSummary.highlights.length > 0 && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Key Highlights
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {aiSummary.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {aiSummary.risks && aiSummary.risks.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Identified Risks
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {aiSummary.risks.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="max-w-md text-xs text-muted-foreground">
              No AI summary generated for this project yet. Click &quot;Generate Summary&quot; to analyze active tasks and generate a project progress summary.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSummary()}
              disabled={isPending}
              className="mt-3 gap-2 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Generate AI Summary
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
