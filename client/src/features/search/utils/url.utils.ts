/**
 * Search Result Navigation & URL Safety Helpers
 * Phase 31 — Global Search & Command Palette
 * WP-06 — Global Search UX & Result Navigation
 */

/**
 * Defensive safety check ensuring search result navigation URL
 * is a valid internal relative application route.
 * Rejects external URLs, protocol relative URLs, or javascript: payloads.
 */
export function isSafeInternalUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }
  const trimmed = url.trim();

  // Must start with '/'
  if (!trimmed.startsWith("/")) {
    return false;
  }

  // Reject protocol-relative URLs (e.g. //evil.com)
  if (trimmed.startsWith("//")) {
    return false;
  }

  // Reject unsafe protocol schemes
  if (/^(javascript|data|vbscript|http|https):/i.test(trimmed)) {
    return false;
  }

  return true;
}
