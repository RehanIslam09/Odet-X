import React, { useState, useEffect } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils.js";

interface MarkdownRendererProps {
  content: string;
  interactiveTaskLists?: boolean;
  onTaskToggle?: (line: number) => void;
  variant?: "default" | "copilot";
  className?: string;
}

// A dedicated CopyButton component to keep state out of the main renderer
function CodeCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background z-10"
      aria-label="Copy code to clipboard"
      title="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// Extract raw text from React elements (children of `code`)
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
  if (React.isValidElement(children) && typeof children.props === 'object' && children.props !== null && 'children' in children.props) return extractTextFromChildren((children.props as { children: React.ReactNode }).children);
  return "";
}

export function MarkdownRenderer({
  content,
  interactiveTaskLists = false,
  onTaskToggle,
  variant = "default",
  className,
}: MarkdownRendererProps) {
  const isCopilot = variant === "copilot";

  return (
    <div
      className={cn(
        isCopilot
          ? "markdown-prose text-xs sm:text-sm leading-relaxed text-foreground/90 font-sans break-words"
          : "markdown-prose text-foreground/90 font-sans leading-7",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => {
          // Fallback to react-markdown's native secure transform (drops javascript: etc)
          const safeUrl = defaultUrlTransform(url);
          return safeUrl;
        }}
        components={{
          // 1. Disable images completely (prevents IP tracking, layout shifts)
          img: () => null,

          // 2. Ensure links are safe & styled
          a: ({ node: _node, href, children, ...props }) => {
            const linkClass = "text-primary hover:underline hover:text-primary/80 transition-colors font-medium break-all";

            if (!href) {
              return <a className={linkClass} {...props}>{children}</a>;
            }

            const isInternal = href.startsWith("/") || href.startsWith("#");

            if (isInternal) {
              return (
                <a href={href} className={linkClass} {...props}>
                  {children}
                </a>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                {...props}
              >
                {children}
              </a>
            );
          },

          // 3. Fenced code blocks with Copy Button
          pre: ({ children, node: _node }) => {
            let rawText = "";
            if (React.isValidElement(children) && children.type === "code" && typeof children.props === 'object' && children.props !== null && 'children' in children.props) {
              rawText = extractTextFromChildren((children.props as { children: React.ReactNode }).children);
              if (rawText.endsWith("\n")) {
                rawText = rawText.slice(0, -1);
              }
            }

            return (
              <div className={cn("relative group", isCopilot ? "my-3" : "my-6")}>
                {rawText && <CodeCopyButton text={rawText} />}
                <pre
                  className={cn(
                    "overflow-x-auto bg-muted/40 font-mono shadow-xs border border-border/60 rounded-lg",
                    isCopilot ? "p-3 text-xs" : "p-4 text-sm",
                  )}
                >
                  {children}
                </pre>
              </div>
            );
          },

          // 4. Inline code vs Code block content
          code: ({ node: _node, className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const isBlock = match || (typeof children === 'string' && children.includes('\n'));

            if (!isBlock) {
              return (
                <code
                  className="bg-muted/60 rounded-md px-1.5 py-0.5 font-mono text-[0.85em] border border-border/50 text-foreground/90 whitespace-pre-wrap break-words"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <code className={codeClassName} {...props}>{children}</code>;
          },

          // 5. Tables
          table: ({ children }) => (
            <div className="w-full overflow-x-auto my-4 rounded-lg border border-border/60 shadow-xs">
              <table className="min-w-full divide-y divide-border/60 bg-card text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 bg-muted/40 font-semibold text-left text-foreground/80 border-b border-border/60">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border/40 last:border-0 align-top">
              {children}
            </td>
          ),

          // 6. Headings
          h1: ({ children }) => (
            <h1
              className={cn(
                "font-bold tracking-tight text-foreground border-b border-border/40 pb-1",
                isCopilot ? "mt-4 mb-2 text-base" : "mt-8 mb-4 text-3xl pb-2",
              )}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={cn(
                "font-bold tracking-tight text-foreground border-b border-border/40 pb-1",
                isCopilot ? "mt-3 mb-1.5 text-sm" : "mt-8 mb-4 text-2xl pb-2",
              )}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={cn(
                "font-semibold tracking-tight text-foreground",
                isCopilot ? "mt-3 mb-1 text-xs" : "mt-6 mb-3 text-xl",
              )}
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              className={cn(
                "font-semibold tracking-tight text-foreground",
                isCopilot ? "mt-2 mb-1 text-xs" : "mt-6 mb-3 text-lg",
              )}
            >
              {children}
            </h4>
          ),

          // 7. Paragraphs
          p: ({ children }) => (
            <p className={cn("leading-relaxed last:mb-0", isCopilot ? "mb-2 text-xs sm:text-sm" : "mb-4 leading-7")}>
              {children}
            </p>
          ),

          // 8. Blockquotes
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "border-l-4 border-primary/40 bg-primary/5 italic text-muted-foreground rounded-r-lg",
                isCopilot ? "my-3 pl-3 py-1.5 text-xs" : "my-6 pl-4 py-2 text-sm",
              )}
            >
              {children}
            </blockquote>
          ),

          // 9. Lists and Task Lists
          ul: ({ children, className: ulClassName }) => {
            const isTaskList = ulClassName?.includes("contains-task-list");
            return (
              <ul
                className={cn(
                  isCopilot ? "mb-2.5 ml-4 space-y-1" : "mb-4 ml-6 space-y-2",
                  isTaskList ? "list-none ml-2" : "list-disc marker:text-muted-foreground",
                )}
              >
                {children}
              </ul>
            );
          },
          ol: ({ children }) => (
            <ol className={cn("list-decimal marker:text-muted-foreground", isCopilot ? "mb-2.5 ml-4 space-y-1" : "mb-4 ml-6 space-y-2")}>
              {children}
            </ol>
          ),
          li: ({ children, className: liClassName }) => {
            const isTaskListItem = liClassName?.includes("task-list-item");
            return (
              <li className={cn("leading-relaxed", isTaskListItem && "flex items-start gap-2 my-0.5")}>
                {children}
              </li>
            );
          },

          // 10. Checkboxes inside Task Lists
          input: ({ node, ...props }) => {
            if (props.type === "checkbox") {
              const lineNumber = node?.position?.start.line;

              return (
                <input
                  {...props}
                  disabled={!interactiveTaskLists}
                  className={cn(
                    "mt-1 h-3.5 w-3.5 shrink-0 rounded-xs border border-primary/50 text-primary shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    interactiveTaskLists && "cursor-pointer transition-colors",
                  )}
                  onChange={() => {
                    if (interactiveTaskLists && onTaskToggle && lineNumber) {
                      onTaskToggle(lineNumber);
                    }
                  }}
                />
              );
            }
            return <input {...props} />;
          },

          // 11. Horizontal Rule
          hr: () => <hr className={cn("border-t border-border/40", isCopilot ? "my-3" : "my-8")} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Memoize to prevent expensive re-parsing when parent re-renders unnecessarily
export const MemoizedMarkdownRenderer = React.memo(MarkdownRenderer);
