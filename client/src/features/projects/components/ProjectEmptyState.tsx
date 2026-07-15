import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ProjectEmptyStateProps {
  onCreateProject: () => void;
}

/**
 * Polished empty state for the projects dashboard.
 *
 * Shown when the user has no projects (or no projects matching current filters).
 * The copy speaks to the product's actual value proposition — not a generic
 * "nothing here" message.
 */
export function ProjectEmptyState({ onCreateProject }: ProjectEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 shadow-inner">
          <span className="text-5xl">🚀</span>
        </div>

        {/* Decorative sparkles */}
        <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      </div>

      {/* Headline */}
      <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
        Turn your next idea into an executable plan.
      </h2>

      {/* Subtext */}
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Create your first project. The AI will help you break it down into
        tasks, estimate timelines, and keep the team aligned — automatically.
      </p>

      {/* CTA */}
      <Button
        id="empty-state-create-project"
        size="lg"
        onClick={onCreateProject}
        className="gap-2 shadow-sm"
      >
        <span className="text-base">+</span>
        New Project
      </Button>
    </motion.div>
  );
}
