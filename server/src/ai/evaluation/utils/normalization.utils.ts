/**
 * Normalizes text for deterministic keyword matching:
 * - Converts string to lowercase
 * - Trims leading/trailing whitespace
 * - Strips special punctuation while preserving alphanumerics, spaces, and hyphens
 * - Collapses internal whitespace sequences to single spaces
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Checks if normalized searchable content contains any of the normalized target keywords.
 */
export function containsKeyword(searchableText: string, keywords: string[]): boolean {
  const normalizedSearchable = normalizeText(searchableText);
  if (!normalizedSearchable || !keywords || keywords.length === 0) return false;

  return keywords.some((kw) => {
    const normalizedKw = normalizeText(kw);
    if (!normalizedKw) return false;
    return normalizedSearchable.includes(normalizedKw);
  });
}
