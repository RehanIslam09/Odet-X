import { Badge } from "@/components/ui/badge";
import type { ProjectRecommendationSeverity } from "@/features/projects/types/project-recommendations.types";
import { SEVERITY_LABELS } from "@/features/projects/types/project-recommendations.types";

interface RecommendationSeverityBadgeProps {
  severity: ProjectRecommendationSeverity;
  className?: string;
}

/**
 * Renders a visually distinguishable severity badge for recommendations.
 * Ensures accessibility by keeping human-readable text visible.
 */
export function RecommendationSeverityBadge({
  severity,
  className = "",
}: RecommendationSeverityBadgeProps) {
  const label = SEVERITY_LABELS[severity] || severity;

  let badgeVariantStyle = "bg-muted text-muted-foreground border-border";

  switch (severity) {
    case "CRITICAL":
      badgeVariantStyle =
        "bg-destructive/15 text-destructive border-destructive/30 font-semibold";
      break;
    case "HIGH":
      badgeVariantStyle =
        "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold";
      break;
    case "MEDIUM":
      badgeVariantStyle =
        "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium";
      break;
    case "LOW":
      badgeVariantStyle =
        "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30 font-normal";
      break;
  }

  return (
    <Badge
      variant="outline"
      className={`capitalize px-2 py-0.5 text-xs ${badgeVariantStyle} ${className}`}
    >
      {label}
    </Badge>
  );
}
