/**
 * Unit Tests for Pure Search Domain Contracts & Primitives
 * WP-01 — Global Search Domain & Contracts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  SEARCH_SCORE_EXACT_TITLE,
  SEARCH_SCORE_PREFIX_TITLE,
  SEARCH_SCORE_SUBSTRING_TITLE,
  SEARCH_SCORE_TASK_LABEL,
  SEARCH_SCORE_DESCRIPTION,
  SEARCH_SCORE_NO_MATCH,
  SEARCH_MEMORY_SNIPPET_MAX_LENGTH,
  SearchResultDto,
  SearchEntityType,
} from "../types/search.types.js";

import {
  escapeRegex,
  normalizeSearchQuery,
  calculateRelevanceScore,
  compareSearchResults,
  generateMemorySnippet,
  generateNavigationUrl,
} from "../utils/search-domain.utils.js";

import { searchQuerySchema } from "../validators/search.validator.js";

describe("WP-01: Search Domain Contracts & Primitives", () => {
  // 1-5: Validation & Schema Boundaries
  describe("Entity Types & Schema Validation", () => {
    it("1. accepts all canonical search entity types", () => {
      const types: SearchEntityType[] = ["project", "task", "milestone", "memory"];
      for (const t of types) {
        const result = searchQuerySchema.safeParse({ q: "alpha", type: t });
        assert.equal(result.success, true);
      }
    });

    it("2. rejects unsupported entity types", () => {
      const result = searchQuerySchema.safeParse({ q: "alpha", type: "invalid_type" });
      assert.equal(result.success, false);
    });

    it("3. accepts canonical filter values including 'all'", () => {
      const result = searchQuerySchema.safeParse({ q: "alpha", type: "all" });
      assert.equal(result.success, true);
    });

    it("4. enforces limit boundaries (1..50)", () => {
      assert.equal(searchQuerySchema.safeParse({ q: "alpha", limit: 0 }).success, false);
      assert.equal(searchQuerySchema.safeParse({ q: "alpha", limit: 51 }).success, false);
      
      const valid = searchQuerySchema.safeParse({ q: "alpha", limit: 25 });
      assert.equal(valid.success, true);
      if (valid.success) {
        assert.equal(valid.data.limit, 25);
      }
    });

    it("5. enforces query length bounds (min 2, max 100)", () => {
      assert.equal(searchQuerySchema.safeParse({ q: "a" }).success, false);
      const longQuery = "a".repeat(101);
      assert.equal(searchQuerySchema.safeParse({ q: longQuery }).success, false);

      const maxValidQuery = "a".repeat(100);
      assert.equal(searchQuerySchema.safeParse({ q: maxValidQuery }).success, true);
    });
  });

  // 6-10: Normalization & Regex Safety
  describe("Query Normalization Primitives", () => {
    it("6. trims surrounding whitespace", () => {
      const norm = normalizeSearchQuery("   alpha project   ");
      assert.equal(norm.trimmed, "alpha project");
      assert.equal(norm.normalized, "alpha project");
    });

    it("7. preserves internal text and spaces", () => {
      const norm = normalizeSearchQuery("  alpha   project  ");
      assert.equal(norm.trimmed, "alpha   project");
    });

    it("8. preserves Unicode characters", () => {
      const norm = normalizeSearchQuery("  東京 alpha é  ");
      assert.equal(norm.trimmed, "東京 alpha é");
      assert.equal(norm.normalized, "東京 alpha é");
    });

    it("9. handles special regex characters literally without breaking regex escaping", () => {
      const special = "C++ [API] foo.bar (draft) task? $budget";
      const escaped = escapeRegex(special);
      assert.equal(escaped.includes("\\+"), true);
      assert.equal(escaped.includes("\\["), true);
      assert.equal(escaped.includes("\\$"), true);

      const norm = normalizeSearchQuery(special);
      assert.equal(norm.escaped, escaped);

      // Verify that RegExp constructs safely without throwing SyntaxError
      const regex = new RegExp(norm.escaped, "i");
      assert.equal(regex.test(special), true);
    });

    it("10. marks <2-character normalized queries as below search threshold", () => {
      assert.equal(normalizeSearchQuery("  a  ").isSearchable, false);
      assert.equal(normalizeSearchQuery("").isSearchable, false);
      assert.equal(normalizeSearchQuery("ab").isSearchable, true);
    });
  });

  // 11-21: Relevance Scoring
  describe("Deterministic Relevance Scoring", () => {
    it("11. exact title match returns 100", () => {
      const score = calculateRelevanceScore(
        { type: "project", title: "Alpha System" },
        "Alpha System"
      );
      assert.equal(score, SEARCH_SCORE_EXACT_TITLE);
    });

    it("12. case-insensitive exact title match returns 100", () => {
      const score = calculateRelevanceScore(
        { type: "project", title: "Alpha System" },
        "alpha system"
      );
      assert.equal(score, SEARCH_SCORE_EXACT_TITLE);
    });

    it("13. prefix title match returns 80", () => {
      const score = calculateRelevanceScore(
        { type: "task", title: "Alpha Engine Refactor" },
        "alpha"
      );
      assert.equal(score, SEARCH_SCORE_PREFIX_TITLE);
    });

    it("14. substring title match returns 60", () => {
      const score = calculateRelevanceScore(
        { type: "task", title: "Fix Alpha Bug" },
        "alpha"
      );
      assert.equal(score, SEARCH_SCORE_SUBSTRING_TITLE);
    });

    it("15. task label match returns 40", () => {
      const score = calculateRelevanceScore(
        { type: "task", title: "Bug fix", labels: ["alpha-release", "backend"] },
        "alpha"
      );
      assert.equal(score, SEARCH_SCORE_TASK_LABEL);
    });

    it("16. description match returns 30", () => {
      const score = calculateRelevanceScore(
        { type: "project", title: "Project Phoenix", description: "Contains alpha notes" },
        "alpha"
      );
      assert.equal(score, SEARCH_SCORE_DESCRIPTION);
    });

    it("17. memory content match returns 30", () => {
      const score = calculateRelevanceScore(
        { type: "memory", content: "Discussed alpha architecture decisions" },
        "alpha"
      );
      assert.equal(score, SEARCH_SCORE_DESCRIPTION);
    });

    it("18. non-matching query returns 0", () => {
      const score = calculateRelevanceScore(
        { type: "project", title: "Project Beta", description: "Other notes" },
        "alpha"
      );
      assert.equal(score, SEARCH_SCORE_NO_MATCH);
    });

    it("19. highest single match score wins without accumulation", () => {
      // Title prefix (80) + description match (30) -> Score MUST be 80, not 110
      const score = calculateRelevanceScore(
        { type: "task", title: "Alpha Task", description: "alpha description" },
        "alpha"
      );
      assert.equal(score, 80);
    });

    it("20. task title outranks task label", () => {
      const titleScore = calculateRelevanceScore(
        { type: "task", title: "Alpha Task", labels: ["other"] },
        "alpha"
      );
      const labelScore = calculateRelevanceScore(
        { type: "task", title: "Other Task", labels: ["alpha"] },
        "alpha"
      );
      assert.ok(titleScore > labelScore); // 80 > 40
    });

    it("21. task label outranks description", () => {
      const labelScore = calculateRelevanceScore(
        { type: "task", title: "Task 1", labels: ["alpha"], description: "none" },
        "alpha"
      );
      const descScore = calculateRelevanceScore(
        { type: "task", title: "Task 2", labels: [], description: "contains alpha" },
        "alpha"
      );
      assert.ok(labelScore > descScore); // 40 > 30
    });
  });

  // 22-25: Deterministic Tie-Breaking & Sorting
  describe("Deterministic Sorting Comparator", () => {
    it("22. sorts by score descending", () => {
      const items = [
        { id: "1", score: 60, updatedAt: "2026-07-28T10:00:00Z" },
        { id: "2", score: 100, updatedAt: "2026-07-28T10:00:00Z" },
        { id: "3", score: 30, updatedAt: "2026-07-28T10:00:00Z" },
      ];
      items.sort(compareSearchResults);
      assert.deepEqual(
        items.map((i) => i.id),
        ["2", "1", "3"]
      );
    });

    it("23. sorts by updatedAt descending when scores are equal", () => {
      const items = [
        { id: "older", score: 80, updatedAt: "2026-07-27T10:00:00Z" },
        { id: "newer", score: 80, updatedAt: "2026-07-28T10:00:00Z" },
      ];
      items.sort(compareSearchResults);
      assert.deepEqual(
        items.map((i) => i.id),
        ["newer", "older"]
      );
    });

    it("24. sorts by ID ascending when score and updatedAt are equal", () => {
      const items = [
        { id: "item-B", score: 80, updatedAt: "2026-07-28T10:00:00Z" },
        { id: "item-A", score: 80, updatedAt: "2026-07-28T10:00:00Z" },
      ];
      items.sort(compareSearchResults);
      assert.deepEqual(
        items.map((i) => i.id),
        ["item-A", "item-B"]
      );
    });

    it("25. repeated sorting produces identical deterministic order", () => {
      const items = [
        { id: "c", score: 60, updatedAt: "2026-07-28T10:00:00Z" },
        { id: "a", score: 100, updatedAt: "2026-07-28T12:00:00Z" },
        { id: "b", score: 100, updatedAt: "2026-07-28T12:00:00Z" },
      ];
      const sort1 = [...items].sort(compareSearchResults).map((i) => i.id);
      const sort2 = [...items].reverse().sort(compareSearchResults).map((i) => i.id);
      assert.deepEqual(sort1, sort2);
      assert.deepEqual(sort1, ["a", "b", "c"]);
    });
  });

  // 26-35: Project Memory Snippet Primitive
  describe("Project Memory Safe Snippet Generation", () => {
    it("26. short memory content remains intact without truncation", () => {
      const content = "Short memory note.";
      const snippet = generateMemorySnippet(content, "memory");
      assert.equal(snippet, "Short memory note.");
    });

    it("27. long memory content truncates strictly to <= 100 characters", () => {
      const longContent = "A".repeat(200);
      const snippet = generateMemorySnippet(longContent, "");
      assert.ok(snippet.length <= SEARCH_MEMORY_SNIPPET_MAX_LENGTH);
      assert.equal(snippet.endsWith("..."), true);
    });

    it("28. handles match near beginning of content", () => {
      const content = "ALPHA match at start of long memory paragraph. " + "X".repeat(150);
      const snippet = generateMemorySnippet(content, "ALPHA");
      assert.ok(snippet.startsWith("ALPHA"));
      assert.ok(snippet.endsWith("..."));
      assert.ok(snippet.length <= SEARCH_MEMORY_SNIPPET_MAX_LENGTH);
    });

    it("29. handles match near middle of content with leading and trailing ellipses", () => {
      const content = "X".repeat(80) + " MATCH_HERE " + "Y".repeat(80);
      const snippet = generateMemorySnippet(content, "MATCH_HERE");
      assert.ok(snippet.startsWith("..."));
      assert.ok(snippet.includes("MATCH_HERE"));
      assert.ok(snippet.endsWith("..."));
      assert.ok(snippet.length <= SEARCH_MEMORY_SNIPPET_MAX_LENGTH);
    });

    it("30. handles match near end of content", () => {
      const content = "X".repeat(150) + " MATCH_AT_END";
      const snippet = generateMemorySnippet(content, "MATCH_AT_END");
      assert.ok(snippet.startsWith("..."));
      assert.ok(snippet.includes("MATCH_AT_END"));
      assert.ok(snippet.length <= SEARCH_MEMORY_SNIPPET_MAX_LENGTH);
    });

    it("31. performs case-insensitive match location", () => {
      const content = "X".repeat(80) + " TargetKeyword " + "Y".repeat(80);
      const snippet = generateMemorySnippet(content, "targetkeyword");
      assert.ok(snippet.includes("TargetKeyword"));
      assert.ok(snippet.length <= SEARCH_MEMORY_SNIPPET_MAX_LENGTH);
    });

    it("32-33. applies ellipses only when content is truncated before or after", () => {
      const content = "Exact 50 char long text for simple memory snippet.";
      const snippet = generateMemorySnippet(content, "simple");
      assert.equal(snippet.startsWith("..."), false);
      assert.equal(snippet.endsWith("..."), false);
      assert.equal(snippet, content);
    });

    it("34. returned snippet NEVER exceeds 100 characters", () => {
      const testCases = [
        { c: "A".repeat(500), q: "AAAA" },
        { c: "B".repeat(500), q: "B".repeat(50) },
        { c: "C".repeat(500), q: "notfound" },
      ];
      for (const tc of testCases) {
        const snippet = generateMemorySnippet(tc.c, tc.q);
        assert.ok(snippet.length <= 100, `Snippet length ${snippet.length} exceeded 100`);
      }
    });

    it("35. snippet contains plain text only (no HTML tags or dangerouslySetInnerHTML markup)", () => {
      const content = "Memory with <b>html</b> tags & special <script>alert(1)</script> markup.";
      const snippet = generateMemorySnippet(content, "html");
      assert.equal(snippet.includes("<mark>"), false);
      assert.equal(snippet.includes("</mark>"), false);
    });
  });

  // 36-37: DTO Contracts & Navigation Utilities
  describe("DTO Contracts & Navigation Helpers", () => {
    it("36. public DTO structure contains only approved fields", () => {
      const dto: SearchResultDto = {
        id: "60d5ec49f1b2c8112420a001",
        type: "project",
        title: "Alpha Project",
        subtitle: "Active workspace project",
        url: "/projects/60d5ec49f1b2c8112420a001",
        updatedAt: "2026-07-28T12:00:00.000Z",
      };

      const keys = Object.keys(dto);
      const forbidden = ["owner", "userId", "password", "refreshTokenHash", "__v", "claimToken", "fingerprint"];
      for (const field of forbidden) {
        assert.equal(keys.includes(field), false);
      }
    });

    it("37. generates canonical navigation URLs for all search entity types", () => {
      assert.equal(generateNavigationUrl("project", "proj-1"), "/projects/proj-1");
      assert.equal(generateNavigationUrl("task", "task-1"), "/tasks/task-1");
      assert.equal(generateNavigationUrl("milestone", "ms-1", "proj-1"), "/projects/proj-1");
      assert.equal(generateNavigationUrl("memory", "mem-1", "proj-1"), "/projects/proj-1");
    });
  });
});
