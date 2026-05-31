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

// Custom image renderer (clean, no overlay buttons — download is in action bar)
function ImageWithDownload({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt || "Generated Image"}
      className="max-w-full rounded-xl border border-zinc-200 shadow-sm"
      style={{ maxHeight: "400px", objectFit: "contain", display: "block" }}
      {...props}
    />
  );
}

export function MathMarkdown({ content, inline = false, className }: MathMarkdownProps) {
  if (inline) {
    return (
      <span className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
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
          img: (props) => <ImageWithDownload {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MathMarkdown;
