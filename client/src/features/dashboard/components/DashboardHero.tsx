import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { useCurrentUser } from "@/features/auth/hooks";
import {
  formatDashboardDate,
  getTimeOfDayGreeting,
} from "@/features/dashboard/utils/dashboard.utils";

/**
 * Dashboard hero.
 *
 * The only job here is orientation — a greeting, today's date, and a quiet
 * signal that the workspace is being watched by AI. No stats: the Projects
 * page already answers "what data exists?", this page answers "what should
 * I work on right now?".
 */
export function DashboardHero() {
  const { data: user } = useCurrentUser();
  const firstName = user?.name?.split(" ")[0];

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

      <div className="flex items-center gap-2 self-start rounded-full border bg-card px-3 py-1.5 shadow-sm sm:self-auto">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          AI is watching your workspace
        </span>
      </div>
    </motion.div>
  );
}