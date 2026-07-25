import { SymbolicEntityMapItem } from "./copilot-context-builder.js";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface RawReferenceItem {
  type: string;
  ref: string;
}

export interface ResolvedReferenceItem {
  type: "task" | "milestone" | "project";
  id: string;
  label: string;
}

export interface CopilotReferenceResolverResult {
  references: ResolvedReferenceItem[];
  unmappedReferenceCount: number;
}

// ---------------------------------------------------------------------------
// Reference Resolver Implementation
// ---------------------------------------------------------------------------

/**
 * Pure domain utility to resolve AI-returned symbolic references into safe, server-authoritative entity references.
 *
 * Operational & Security Guarantees:
 * 1. Operates 100% in-memory against trusted server-generated `symbolicMap`. ZERO database queries.
 * 2. Strips unmapped references (e.g. `task_999`) and increments `unmappedReferenceCount`.
 * 3. Strips type mismatches (e.g. `ref: "task_1"` with `type: "milestone"`) and increments `unmappedReferenceCount`.
 * 4. Deduplicates valid references while preserving first occurrence order.
 * 5. Server-authoritative `id` and `label` are populated exclusively from `symbolicMap`. AI cannot override IDs or labels.
 * 6. Does not throw errors on invalid input — returns cleaned references array and count.
 */
export function resolveCopilotReferences(
  rawReferences: RawReferenceItem[] | undefined | null,
  symbolicMap: Record<string, SymbolicEntityMapItem>,
): CopilotReferenceResolverResult {
  if (!Array.isArray(rawReferences) || rawReferences.length === 0) {
    return {
      references: [],
      unmappedReferenceCount: 0,
    };
  }

  const resolved: ResolvedReferenceItem[] = [];
  const seenKeys = new Set<string>();
  let unmappedCount = 0;

  for (const item of rawReferences) {
    if (!item || typeof item.ref !== "string" || typeof item.type !== "string") {
      unmappedCount++;
      continue;
    }

    const trimmedRef = item.ref.trim();
    const mapEntry = symbolicMap[trimmedRef];

    // 1. Unmapped reference check
    if (!mapEntry) {
      unmappedCount++;
      continue;
    }

    // 2. Type mismatch check
    if (mapEntry.type !== item.type) {
      unmappedCount++;
      continue;
    }

    // 3. Deduplication check
    const dedupKey = `${mapEntry.type}:${mapEntry.id}`;
    if (seenKeys.has(dedupKey)) {
      continue; // Duplicate valid ref — skip silently without incrementing unmappedCount
    }

    seenKeys.add(dedupKey);
    resolved.push({
      type: mapEntry.type,
      id: mapEntry.id,
      label: mapEntry.label,
    });
  }

  return {
    references: resolved,
    unmappedReferenceCount: unmappedCount,
  };
}
