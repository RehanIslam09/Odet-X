import { useEffect } from "react";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";
import { ACCENT_COLORS } from "@/features/workspaces/components/CreateWorkspaceModal.js";

/**
 * Custom hook to dynamically apply workspace accent color theme to DOM root.
 * Phase 35 RC-05 (Production Blocker 4 Fix)
 */
export function useWorkspaceAccentApplier() {
  const { currentWorkspace } = useActiveWorkspace();

  useEffect(() => {
    const rawColor = currentWorkspace?.accentColor || currentWorkspace?.color || "indigo";
    const matched = ACCENT_COLORS.find((c) => c.id === rawColor || c.hex === rawColor) || ACCENT_COLORS[0];

    document.documentElement.setAttribute("data-accent", matched.id);
    document.documentElement.style.setProperty("--accent-primary-hex", matched.hex);
  }, [currentWorkspace?.accentColor, currentWorkspace?.color]);
}
