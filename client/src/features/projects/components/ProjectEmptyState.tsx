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
      {/* Icon */}
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 shadow-2xs">
        <Sparkles className="h-10 w-10 text-primary" />
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
