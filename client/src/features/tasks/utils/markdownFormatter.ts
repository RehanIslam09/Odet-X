export type MarkdownFormatType = 
  | "bold"
  | "italic"
  | "strikethrough"
  | "heading"
  | "blockquote"
  | "codeInline"
  | "codeBlock"
  | "link"
  | "list-bullet"
  | "list-number"
  | "list-task";

export function toggleTaskListItem(markdown: string, lineNumber: number): string {
  const lines = markdown.split('\n');
  const lineIndex = lineNumber - 1;
  if (lineIndex >= 0 && lineIndex < lines.length) {
    const targetLine = lines[lineIndex];
    // Match markdown list item with checkbox: optional whitespace, list marker, space, [ ] or [x]
    // Then require space and ANY text after it (so it's a real checkbox, not arbitrary [x])
    const match = /^(\s*[-*+]\s+)\[([ x])\](\s+)/i.exec(targetLine);
    if (match) {
      const isChecked = match[2].toLowerCase() === 'x';
      const newMarker = isChecked ? ' ' : 'x';
      lines[lineIndex] = targetLine.slice(0, match[1].length) + `[${newMarker}]` + targetLine.slice(match[1].length + 3);
    }
  }
  return lines.join('\n');
}

export interface FormatMarkdownParams {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  format: MarkdownFormatType;
}

export interface FormatMarkdownResult {
  // We keep value for testing/fallback
  value: string;
  // Parameters for document.execCommand('insertText')
  replacementText: string;
  targetStart: number;
  targetEnd: number;
  // Where the cursor/selection should end up
  newSelectionStart: number;
  newSelectionEnd: number;
}

export function formatMarkdown({
  value,
  selectionStart,
  selectionEnd,
  format,
}: FormatMarkdownParams): FormatMarkdownResult {
  const selectedText = value.slice(selectionStart, selectionEnd);
  const beforeText = value.slice(0, selectionStart);
  const afterText = value.slice(selectionEnd);

  // Helper for inline wrapping formats (bold, italic, strikethrough, codeInline)
  const applyInlineWrap = (prefix: string, suffix: string): FormatMarkdownResult => {
    // 1. Check if the selection itself INCLUDES the markers at the boundaries
    if (selectedText.length >= prefix.length + suffix.length && 
        selectedText.startsWith(prefix) && 
        selectedText.endsWith(suffix)) {
      const unwrapped = selectedText.slice(prefix.length, -suffix.length);
      return {
        value: `${beforeText}${unwrapped}${afterText}`,
        replacementText: unwrapped,
        targetStart: selectionStart,
        targetEnd: selectionEnd,
        newSelectionStart: selectionStart,
        newSelectionEnd: selectionStart + unwrapped.length,
      };
    }
    
    // 2. Check if the selection is SURROUNDED by the markers
    if (beforeText.endsWith(prefix) && afterText.startsWith(suffix)) {
      return {
        value: `${beforeText.slice(0, -prefix.length)}${selectedText}${afterText.slice(suffix.length)}`,
        replacementText: selectedText,
        targetStart: selectionStart - prefix.length,
        targetEnd: selectionEnd + suffix.length,
        newSelectionStart: selectionStart - prefix.length,
        newSelectionEnd: selectionStart - prefix.length + selectedText.length,
      };
    }

    // 3. Otherwise, apply the wrap
    if (selectedText) {
      return {
        value: `${beforeText}${prefix}${selectedText}${suffix}${afterText}`,
        replacementText: `${prefix}${selectedText}${suffix}`,
        targetStart: selectionStart,
        targetEnd: selectionEnd,
        newSelectionStart: selectionStart + prefix.length,
        newSelectionEnd: selectionEnd + prefix.length,
      };
    } else {
      return {
        value: `${beforeText}${prefix}${suffix}${afterText}`,
        replacementText: `${prefix}${suffix}`,
        targetStart: selectionStart,
        targetEnd: selectionEnd,
        newSelectionStart: selectionStart + prefix.length,
        newSelectionEnd: selectionStart + prefix.length,
      };
    }
  };

  // Helper for line-by-line prefix formats (lists, blockquotes)
  const applyLinePrefix = (prefixGenerator: (index: number) => string, removeMatcher?: RegExp): FormatMarkdownResult => {
    const startOfLine = beforeText.lastIndexOf("\n") + 1;
    let endOfLine = afterText.indexOf("\n");
    if (endOfLine === -1) {
      endOfLine = afterText.length;
    }
    const endOfLineGlobal = selectionEnd + endOfLine;

    const blockBefore = value.slice(0, startOfLine);
    const blockSelected = value.slice(startOfLine, endOfLineGlobal);
    const blockAfter = value.slice(endOfLineGlobal);

    const lines = blockSelected.split("\n");
    
    // Check if ALL lines already match the prefix format. If so, toggle it off.
    const allMatch = removeMatcher ? lines.every(line => removeMatcher.test(line) || line.trim() === "") : false;

    const newLines = lines.map((line, index) => {
      if (line.trim() === "") return line; // don't prefix empty lines inside blocks
      
      if (allMatch && removeMatcher) {
        return line.replace(removeMatcher, "");
      } else {
        // If we're adding a prefix, we should optionally remove existing list prefixes first to prevent `- 1. Task`
        let cleanLine = line;
        const genericListMatcher = /^(\s*)([-*+]|\d+\.)\s+(\[ \]\s+|\[x\]\s+)?/;
        if (genericListMatcher.test(cleanLine)) {
            cleanLine = cleanLine.replace(genericListMatcher, "$1");
        }
        // Blockquotes toggle independently, but we could remove them too. Let's keep it simple.
        if (format === "blockquote" && cleanLine.startsWith("> ")) {
           cleanLine = cleanLine.slice(2);
        }

        const prefix = prefixGenerator(index);
        return `${prefix}${cleanLine}`;
      }
    });

    const newBlockSelected = newLines.join("\n");
    const newValue = `${blockBefore}${newBlockSelected}${blockAfter}`;

    return {
      value: newValue,
      replacementText: newBlockSelected,
      targetStart: startOfLine,
      targetEnd: endOfLineGlobal,
      newSelectionStart: startOfLine,
      newSelectionEnd: startOfLine + newBlockSelected.length,
    };
  };

  switch (format) {
    case "bold":
      return applyInlineWrap("**", "**");
    
    case "italic":
      return applyInlineWrap("_", "_");
    
    case "strikethrough":
      return applyInlineWrap("~~", "~~");
    
    case "codeInline":
      return applyInlineWrap("`", "`");
      
    case "link":
      if (selectedText) {
        return {
          value: `${beforeText}[${selectedText}](url)${afterText}`,
          replacementText: `[${selectedText}](url)`,
          targetStart: selectionStart,
          targetEnd: selectionEnd,
          newSelectionStart: selectionEnd + 3, 
          newSelectionEnd: selectionEnd + 6,
        };
      } else {
        return {
          value: `${beforeText}[]()${afterText}`,
          replacementText: `[]()`,
          targetStart: selectionStart,
          targetEnd: selectionEnd,
          newSelectionStart: selectionStart + 1,
          newSelectionEnd: selectionStart + 1,
        };
      }

    case "heading": {
      const startOfLine = beforeText.lastIndexOf("\n") + 1;
      let endOfLine = afterText.indexOf("\n");
      if (endOfLine === -1) {
        endOfLine = afterText.length;
      }
      const endOfLineGlobal = selectionEnd + endOfLine;

      const lineText = value.slice(startOfLine, endOfLineGlobal);
      
      let newText: string;
      const headingMatch = lineText.match(/^(#{1,6})\s/);
      
      if (headingMatch) {
        // Toggle off if it's already a heading
        newText = lineText.slice(headingMatch[0].length);
      } else {
        // Add heading
        newText = `### ${lineText}`;
      }

      return {
        value: `${value.slice(0, startOfLine)}${newText}${value.slice(endOfLineGlobal)}`,
        replacementText: newText,
        targetStart: startOfLine,
        targetEnd: endOfLineGlobal,
        newSelectionStart: startOfLine,
        newSelectionEnd: startOfLine + newText.length,
      };
    }

    case "blockquote":
      return applyLinePrefix(() => "> ", /^> /);
      
    case "list-bullet":
      return applyLinePrefix(() => "- ", /^-\s/);
      
    case "list-number":
      return applyLinePrefix((index) => `${index + 1}. `, /^\d+\.\s/);
      
    case "list-task":
      return applyLinePrefix(() => "- [ ] ", /^-\s\[[ x]\]\s/);

    case "codeBlock": {
      if (selectedText) {
        // Toggle check: is it already a code block?
        if (beforeText.endsWith("```\n") && afterText.startsWith("\n```")) {
           return {
             value: `${beforeText.slice(0, -4)}${selectedText}${afterText.slice(4)}`,
             replacementText: selectedText,
             targetStart: selectionStart - 4,
             targetEnd: selectionEnd + 4,
             newSelectionStart: selectionStart - 4,
             newSelectionEnd: selectionStart - 4 + selectedText.length,
           };
        }

        const prefix = beforeText.endsWith("\n") || beforeText === "" ? "```\n" : "\n```\n";
        const suffix = afterText.startsWith("\n") || afterText === "" ? "\n```" : "\n```\n";
        
        return {
          value: `${beforeText}${prefix}${selectedText}${suffix}${afterText}`,
          replacementText: `${prefix}${selectedText}${suffix}`,
          targetStart: selectionStart,
          targetEnd: selectionEnd,
          newSelectionStart: selectionStart + prefix.length,
          newSelectionEnd: selectionEnd + prefix.length,
        };
      } else {
        const prefix = beforeText.endsWith("\n") || beforeText === "" ? "```\n" : "\n```\n";
        const suffix = "\n```\n";
        return {
          value: `${beforeText}${prefix}${suffix}${afterText}`,
          replacementText: `${prefix}${suffix}`,
          targetStart: selectionStart,
          targetEnd: selectionEnd,
          newSelectionStart: selectionStart + prefix.length,
          newSelectionEnd: selectionStart + prefix.length,
        };
      }
    }

    default:
      return { 
        value, 
        replacementText: "", 
        targetStart: selectionStart, 
        targetEnd: selectionEnd, 
        newSelectionStart: selectionStart, 
        newSelectionEnd: selectionEnd 
      };
  }
}
