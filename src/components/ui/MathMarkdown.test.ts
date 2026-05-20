import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

/**
 * These tests verify the remark-math + rehype-katex plugin pipeline
 * that MathMarkdown.tsx uses. We test the pipeline directly to avoid
 * needing a full React/DOM testing setup.
 */

async function renderMarkdown(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(content);
  return String(result);
}

describe("MathMarkdown plugin pipeline", () => {
  it("6.3 - renders inline math ($E = mc^2$) with KaTeX", async () => {
    const html = await renderMarkdown("The equation $E = mc^2$ is famous.");
    // rehype-katex wraps inline math in a span with class "katex"
    expect(html).toContain('class="katex"');
    // Should NOT have katex-display (that's for block math)
    expect(html).not.toContain("katex-display");
  });

  it("6.4 - renders block math ($$...$$) with katex-display class", async () => {
    // Block math requires $$ on its own lines (CommonMark-style fenced math)
    const html = await renderMarkdown("$$\n\\int_0^1 x^2 dx\n$$");
    // rehype-katex wraps display/block math with class "katex-display"
    expect(html).toContain("katex-display");
    expect(html).toContain('class="katex"');
  });

  it("6.5 - dollar signs in code blocks are NOT interpreted as math", async () => {
    const html = await renderMarkdown("```\n$PATH is an env variable\n```");
    // Code blocks should NOT produce katex output
    expect(html).not.toContain('class="katex"');
    expect(html).not.toContain("katex-display");
    // The dollar sign should appear as literal text in a code element
    expect(html).toContain("$PATH");
    expect(html).toContain("<code>");
  });

  it("6.5 - dollar signs in inline code are NOT interpreted as math", async () => {
    const html = await renderMarkdown("Use `$HOME` to reference your home dir.");
    // Inline code should NOT produce katex output
    expect(html).not.toContain('class="katex"');
    // The dollar sign should appear as literal text
    expect(html).toContain("$HOME");
    expect(html).toContain("<code>");
  });
});
