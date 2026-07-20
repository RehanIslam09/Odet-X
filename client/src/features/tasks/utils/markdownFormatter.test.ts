import { describe, it, expect } from "vitest";
import { formatMarkdown, toggleTaskListItem } from "./markdownFormatter.js";

describe("markdownFormatter", () => {
  describe("inline wrapping (bold, italic, strikethrough, codeInline)", () => {
    it("wraps selected text with bold markers", () => {
      const result = formatMarkdown({
        value: "hello world",
        selectionStart: 6,
        selectionEnd: 11,
        format: "bold",
      });
      expect(result.value).toBe("hello **world**");
      expect(result.replacementText).toBe("**world**");
      expect(result.targetStart).toBe(6);
      expect(result.targetEnd).toBe(11);
      expect(result.newSelectionStart).toBe(8); 
      expect(result.newSelectionEnd).toBe(13); 
    });

    it("inserts bold markers and places cursor inside when no selection", () => {
      const result = formatMarkdown({
        value: "hello world",
        selectionStart: 6,
        selectionEnd: 6,
        format: "bold",
      });
      expect(result.value).toBe("hello ****world");
      expect(result.replacementText).toBe("****");
      expect(result.targetStart).toBe(6);
      expect(result.targetEnd).toBe(6);
      expect(result.newSelectionStart).toBe(8);
      expect(result.newSelectionEnd).toBe(8);
    });

    it("toggles bold off if selection includes markers", () => {
      const result = formatMarkdown({
        value: "hello **world**",
        selectionStart: 6,
        selectionEnd: 15,
        format: "bold",
      });
      expect(result.value).toBe("hello world");
      expect(result.replacementText).toBe("world");
      expect(result.targetStart).toBe(6);
      expect(result.targetEnd).toBe(15);
      expect(result.newSelectionStart).toBe(6);
      expect(result.newSelectionEnd).toBe(11);
    });

    it("toggles bold off if cursor is inside markers (surrounded)", () => {
      const result = formatMarkdown({
        value: "hello **world**",
        selectionStart: 8, // inside **world**
        selectionEnd: 13,
        format: "bold",
      });
      expect(result.value).toBe("hello world");
      expect(result.replacementText).toBe("world");
      expect(result.targetStart).toBe(6);
      expect(result.targetEnd).toBe(15);
      expect(result.newSelectionStart).toBe(6);
      expect(result.newSelectionEnd).toBe(11);
    });
  });

  describe("links", () => {
    it("wraps selected text as link text and selects URL portion", () => {
      const result = formatMarkdown({
        value: "check out OpenAI today",
        selectionStart: 10,
        selectionEnd: 16,
        format: "link",
      });
      expect(result.value).toBe("check out [OpenAI](url) today");
      expect(result.replacementText).toBe("[OpenAI](url)");
      expect(result.targetStart).toBe(10);
      expect(result.targetEnd).toBe(16);
      expect(result.newSelectionStart).toBe(19);
      expect(result.newSelectionEnd).toBe(22);
    });
  });

  describe("line prefixing (lists, blockquote)", () => {
    it("prefixes a single line bullet list", () => {
      const result = formatMarkdown({
        value: "apples\nbananas\ncherries",
        selectionStart: 7, 
        selectionEnd: 14, 
        format: "list-bullet",
      });
      expect(result.value).toBe("apples\n- bananas\ncherries");
      expect(result.replacementText).toBe("- bananas");
      expect(result.targetStart).toBe(7);
      expect(result.targetEnd).toBe(14);
      expect(result.newSelectionStart).toBe(7);
      expect(result.newSelectionEnd).toBe(16); 
    });

    it("toggles bullet list off if already present", () => {
      const result = formatMarkdown({
        value: "apples\n- bananas\ncherries",
        selectionStart: 7, 
        selectionEnd: 16, 
        format: "list-bullet",
      });
      expect(result.value).toBe("apples\nbananas\ncherries");
      expect(result.replacementText).toBe("bananas");
      expect(result.targetStart).toBe(7);
      expect(result.targetEnd).toBe(16);
      expect(result.newSelectionStart).toBe(7);
      expect(result.newSelectionEnd).toBe(14); 
    });

    it("swaps list prefix if changing from bullet to number", () => {
      const result = formatMarkdown({
        value: "apples\n- bananas\ncherries",
        selectionStart: 7, 
        selectionEnd: 16, 
        format: "list-number",
      });
      expect(result.value).toBe("apples\n1. bananas\ncherries");
      expect(result.replacementText).toBe("1. bananas");
    });
  });

  describe("heading", () => {
    it("prefixes heading to the current line", () => {
      const result = formatMarkdown({
        value: "title\nbody",
        selectionStart: 0,
        selectionEnd: 5,
        format: "heading",
      });
      expect(result.value).toBe("### title\nbody");
      expect(result.replacementText).toBe("### title");
      expect(result.newSelectionStart).toBe(0);
      expect(result.newSelectionEnd).toBe(9);
    });

    it("toggles heading off if already a heading", () => {
      const result = formatMarkdown({
        value: "### title\nbody",
        selectionStart: 0,
        selectionEnd: 9,
        format: "heading",
      });
      expect(result.value).toBe("title\nbody");
      expect(result.replacementText).toBe("title");
    });
  });

  describe("codeBlock", () => {
    it("wraps selection with code block markers", () => {
      const result = formatMarkdown({
        value: "const a = 1;",
        selectionStart: 0,
        selectionEnd: 12,
        format: "codeBlock",
      });
      expect(result.value).toBe("```\nconst a = 1;\n```");
      expect(result.replacementText).toBe("```\nconst a = 1;\n```");
    });

    it("toggles code block off if selected", () => {
      const result = formatMarkdown({
        value: "```\nconst a = 1;\n```",
        selectionStart: 4,
        selectionEnd: 16,
        format: "codeBlock",
      });
      expect(result.value).toBe("const a = 1;");
      expect(result.replacementText).toBe("const a = 1;");
      expect(result.targetStart).toBe(0);
      expect(result.targetEnd).toBe(20);
    });
  });

  describe("toggleTaskListItem", () => {
    it("toggles unchecked to checked", () => {
      const markdown = "- [ ] Task 1";
      const result = toggleTaskListItem(markdown, 1);
      expect(result).toBe("- [x] Task 1");
    });

    it("toggles checked to unchecked", () => {
      const markdown = "- [x] Task 1";
      const result = toggleTaskListItem(markdown, 1);
      expect(result).toBe("- [ ] Task 1");
    });

    it("toggles correct line when there are multiple checkboxes", () => {
      const markdown = "- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3";
      const result = toggleTaskListItem(markdown, 2);
      expect(result).toBe("- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3");
    });

    it("toggles correctly with nested lists and varying spaces", () => {
      const markdown = "  * [ ] Task 1\n    - [x] Task 2\n";
      const result = toggleTaskListItem(markdown, 2);
      expect(result).toBe("  * [ ] Task 1\n    - [ ] Task 2\n");
    });

    it("does nothing if line is not a valid task list item", () => {
      const markdown = "Just a normal line [ ]";
      const result = toggleTaskListItem(markdown, 1);
      expect(result).toBe(markdown);
    });

    it("does nothing if checkbox is missing text content after", () => {
      // The regex requires `\s+` after the `]`, ensuring it's an actual list item with text or at least a space
      const markdown = "- [ ]";
      const result = toggleTaskListItem(markdown, 1);
      expect(result).toBe(markdown); // Shouldn't match because no trailing space/text
    });
  });
});
