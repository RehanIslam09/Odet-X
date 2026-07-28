import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Compass,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { BriefInsight } from "@/features/dashboard/types/dashboard.types";

const insights: BriefInsight[] = [
  {
    id: "attention",
    icon: AlertTriangle,
    label: "Projects needing attention",
    description: "Flags projects that have gone quiet or are falling behind.",
  },
  {
    id: "due-today",
    icon: CalendarClock,
    label: "Tasks due today",
    description: "Pulled from every project once tasks are tracked.",
  },
  {
    id: "next-action",
    icon: Compass,
    label: "Suggested next action",
    description: "The single most useful thing to do next, decided for you.",
  },
  {
    id: "blockers",
    icon: ShieldAlert,
    label: "Potential blockers",
    description: "Dependencies or risks that could stall a project.",
  },
];

/**
 * AI Daily Brief.
 *
 * There's no AI backend generating insights yet, so this stays a labeled
 * "Preview" — it shows exactly what the card will surface without
 * fabricating numbers that don't exist.
 */
export function AIDailyBrief() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-auto flex-col rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Daily brief
          </h2>
        </div>
        <Badge variant="secondary" className="text-xs font-medium">
          Preview
        </Badge>
      </div>

      <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
        Once your projects have tasks and activity, this card will generate a
        short brief here every day, automatically.
      </p>

      <Separator className="mb-5" />

      <div className="flex flex-1 flex-col gap-4">
        {insights.map((insight) => (
          <div key={insight.id} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
              <insight.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground/90">
                {insight.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="mt-5 inline-flex w-full">
            <Button
              id="ai-daily-brief-ask-ai"
              variant="outline"
              disabled
              className="w-full gap-1.5 border-dashed text-muted-foreground"
            >
              Ask AI about your workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>The AI assistant is coming soon.</TooltipContent>
      </Tooltip>
    </motion.div>
  );
}