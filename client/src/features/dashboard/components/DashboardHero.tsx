import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { useCurrentUser } from "@/features/auth/hooks";
import {
  formatDashboardDate,
  getTimeOfDayGreeting,
} from "@/features/dashboard/utils/dashboard.utils";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext";

export function DashboardHero() {
  const { data: user } = useCurrentUser();
  const firstName = user?.name?.split(" ")[0];
  const { openCopilot } = useGlobalCopilot();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
    >
      <div>
        <p className="text-sm text-muted-foreground">
          {formatDashboardDate()}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {getTimeOfDayGreeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      <button
        type="button"
        onClick={() => openCopilot({ type: "workspace" })}
        className="flex items-center gap-2 self-start rounded-full border bg-card px-3.5 py-1.5 shadow-xs sm:self-auto hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group text-left"
        title="Open Workspace AI Copilot"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <Sparkles className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
        <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
          Ask AI about your workspace
        </span>
      </button>
    </motion.div>
  );
}
