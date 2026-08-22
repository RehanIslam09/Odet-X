import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Compass,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import { Separator } from "@/components/ui/separator.js";

import type { BriefInsight } from "@/features/dashboard/types/dashboard.types.js";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext.js";

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
    description: "Pulled from active projects in the current workspace.",
  },
  {
    id: "next-action",
    icon: Compass,
    label: "Suggested next action",
    description: "Prioritized recommendations produced by the AI Engine.",
  },
  {
    id: "blockers",
    icon: ShieldAlert,
    label: "Potential blockers",
    description: "Dependencies or risk factors that could stall project progress.",
  },
];

export function AIDailyBrief() {
  const { openCopilot } = useGlobalCopilot();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-auto flex-col rounded-xl border border-border/60 bg-card p-4 sm:p-5 shadow-2xs"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground truncate">
            Daily brief
          </h2>
        </div>
        <Badge variant="outline" className="text-[10px] font-medium border-primary/30 text-primary shrink-0">
          AI Engine Active
        </Badge>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-muted-foreground break-words">
        Workspace telemetry is analyzed continuously by the Proactive Signal Engine to surface risk factors and task priorities.
      </p>

      <Separator className="mb-4" />

      <div className="flex flex-1 flex-col gap-3.5">
        {insights.map((insight) => (
          <div key={insight.id} className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60 border border-border/30">
              <insight.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground/90 truncate">
                {insight.label}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 w-full">
        <Button
          id="ai-daily-brief-ask-ai"
          variant="outline"
          className="w-full gap-1.5 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          onClick={() => openCopilot({ type: "workspace" })}
        >
          <span>Ask AI Copilot about your workspace</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
