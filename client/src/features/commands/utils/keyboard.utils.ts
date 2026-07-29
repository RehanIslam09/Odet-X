/**
 * Keyboard Shortcut Utilities & Collision Protection
 * Phase 31 — Global Search & Command Palette
 * WP-05 — Command Palette Foundation
 */

/**
 * Evaluates whether global Cmd/Ctrl+K palette activation should be suppressed
 * based on event defaultPrevented status or target element attributes.
 *
 * Enforces Gate 1 INV-16 (Editor Shortcut Protection):
 * Global Cmd/Ctrl+K SHALL NOT hijack active text editor shortcuts
 * (specifically TaskNotesEditor.tsx in mode === "write").
 */
export function isGlobalCommandPaletteSuppressed(e: KeyboardEvent): boolean {
  if (e.defaultPrevented) {
    return true;
  }

  const target = e.target as HTMLElement | null;
  if (!target) {
    return false;
  }

  // 1. Check if target or ancestor explicitly suppresses global command palette
  if (typeof target.closest === "function") {
    if (target.closest('[data-suppress-global-command-palette="true"]')) {
      return true;
    }
  }

  // 2. Fallback check for TaskNotesEditor textarea by aria-label
  if (
    target.tagName === "TEXTAREA" &&
    target.getAttribute("aria-label") === "Task notes editor"
  ) {
    return true;
  }

  return false;
}
