"use client";

/**
 * Markdown renderer for Q-Bank content that contains real code (the Code
 * Diagnosis track). Runs the remark→rehype pipeline: GFM for tables/inline
 * code, rehype-highlight for syntax-highlighted fenced blocks. Presentational
 * and memoized — the highlight.js theme is imported once in globals.css.
 *
 * Scoped usage: existing prose tracks render as plain strings (unchanged); only
 * the diag track opts in, so markdown special characters elsewhere can't reflow.
 */

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
}

function MarkdownImpl({ children, className }: MarkdownProps) {
  return (
    <div className={cn("md", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
