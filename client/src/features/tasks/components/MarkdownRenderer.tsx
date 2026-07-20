import React from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => {
          // Fallback to react-markdown's native secure transform (drops javascript: etc)
          const safeUrl = defaultUrlTransform(url);
          return safeUrl;
        }}
        components={{
          // 1. Disable images completely for Phase 17 (prevents IP tracking, layout shifts)
          img: () => {
            return null; // Return nothing, explicitly preventing remote resource loading
          },
          
          // 2. Ensure links are safe
          a: ({ node: _node, href, children, ...props }) => {
            // If no href, or it's a local anchor, let it behave normally (though mostly we treat all as external)
            if (!href) {
              return <a {...props}>{children}</a>;
            }
            
            const isInternal = href.startsWith("/") || href.startsWith("#");

            if (isInternal) {
               return (
                <a href={href} {...props}>
                  {children}
                </a>
              );
            }

            // External link safety
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },

          // 3. Prevent horizontal scrolling issues on code blocks
          pre: ({ children }) => {
            return (
              <pre className="overflow-x-auto bg-muted/50 p-4 rounded-lg border">
                {children}
              </pre>
            );
          },
          
          // 4. Tables should also be scrollable to prevent mobile layout breakage
          table: ({ children }) => {
            return (
              <div className="w-full overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-border">
                  {children}
                </table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Memoize to prevent expensive re-parsing when parent re-renders unnecessarily
export const MemoizedMarkdownRenderer = React.memo(MarkdownRenderer);
