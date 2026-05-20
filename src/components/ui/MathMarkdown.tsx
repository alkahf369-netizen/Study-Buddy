"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type MathMarkdownProps = {
  content: string;
  /** If true, renders as inline span (for MCQ options). Default: false (block rendering). */
  inline?: boolean;
  className?: string;
};

export function MathMarkdown({ content, inline = false, className }: MathMarkdownProps) {
  if (inline) {
    // Lightweight inline mode: renders without wrapping <p> tags
    // Used for MCQ options and short text snippets
    return (
      <span className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            // Unwrap paragraphs for inline usage
            p: ({ children }) => <span>{children}</span>,
          }}
        >
          {content}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table: ({ children, ...props }) => (
            <div className="sa-table-wrap">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MathMarkdown;
