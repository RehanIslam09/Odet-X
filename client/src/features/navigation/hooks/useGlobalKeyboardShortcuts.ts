import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveWorkspace } from "@/features/workspaces/context/WorkspaceContext.js";

export function useGlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  const { currentWorkspace } = useActiveWorkspace();
  const pendingSequenceRef = useRef<string | null>(null);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          Boolean(target.isContentEditable) ||
          (typeof target.getAttribute === "function" && target.getAttribute("role") === "textbox"));

      if (isInput) return;

      const slug = currentWorkspace?.slug || "personal";

      // Two-key chord sequences (G + D, G + P, G + T, G + S)
      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        pendingSequenceRef.current = "g";
        if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = setTimeout(() => {
          pendingSequenceRef.current = null;
        }, 1000);
        return;
      }

      if (pendingSequenceRef.current === "g") {
        const key = e.key.toLowerCase();
        pendingSequenceRef.current = null;
        if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);

        if (key === "d") {
          e.preventDefault();
          navigate(`/w/${slug}/dashboard`);
          return;
        }
        if (key === "p") {
          e.preventDefault();
          navigate(`/w/${slug}/projects`);
          return;
        }
        if (key === "t") {
          e.preventDefault();
          navigate(`/w/${slug}/tasks`);
          return;
        }
        if (key === "s") {
          e.preventDefault();
          navigate(`/w/${slug}/settings`);
          return;
        }
      }

      // Single key '/' shortcut to focus command palette / search
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
    };
  }, [navigate, currentWorkspace]);
}
