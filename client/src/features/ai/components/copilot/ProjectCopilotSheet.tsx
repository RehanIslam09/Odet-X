import { useEffect } from "react";
import { useGlobalCopilot } from "@/features/ai/context/GlobalCopilotContext.js";

interface ProjectCopilotSheetProps {
  projectId: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectReference?: (type: "project" | "task" | "milestone", id: string) => void;
}

export function ProjectCopilotSheet({
  projectId,
  open,
}: ProjectCopilotSheetProps) {
  const { openCopilot, closeCopilot } = useGlobalCopilot();

  useEffect(() => {
    if (open) {
      openCopilot({ type: "project", projectId });
    } else {
      closeCopilot();
    }
    // Only synchronize when the parent open state or target projectId prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  return null;
}
