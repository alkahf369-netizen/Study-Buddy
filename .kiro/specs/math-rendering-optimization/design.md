# Design Document: Math Rendering Optimization

## Overview

This design adds LaTeX/KaTeX math rendering support to the Study Buddy application by extending the existing react-markdown pipeline with `remark-math` and `rehype-katex` plugins, and creating a reusable `MathMarkdown` component that serves both the chat view and MCQ components.

## Architecture

### Plugin Pipeline

```
Raw Markdown String
  → remark-gfm (existing: tables, strikethrough, etc.)
  → remark-math (NEW: detects $...$ and $$...$$ delimiters, creates math AST nodes)
  → rehype-katex (NEW: converts math AST nodes into KaTeX-rendered HTML)
  → React DOM output
```

### Component Hierarchy

```
src/components/ui/MathMarkdown.tsx  (NEW — reusable component)
  ├── Used by: StudyAssistant.jsx → Chat message rendering
  ├── Used by: MCQCardUI.tsx → Question text, options, explanations
  └── Props: content (string), inline (boolean), className (string)
```

## Detailed Design

### 1. New Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `remark-math` | Remark plugin to parse `$...$` and `$$...$$` into math AST nodes | ^6.x |
| `rehype-katex` | Rehype plugin to render math nodes using KaTeX | ^7.x |
| `katex` | KaTeX library (peer dependency of rehype-katex, provides CSS + fonts) | ^0.16.x |

### 2. MathMarkdown Component (`src/components/ui/MathMarkdown.tsx`)

This is the central reusable component that replaces direct `<ReactMarkdown>` usage.

```typescript
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
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Unwrap paragraphs for inline usage
          p: ({ children }) => <span>{children}</span>,
        }}
        className={className}
      >
        {content}
      </ReactMarkdown>
    );
  }

  return (
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
      className={className}
    >
      {content}
    </ReactMarkdown>
  );
}

export default MathMarkdown;
```

### 3. KaTeX CSS Loading Strategy

KaTeX requires its CSS stylesheet for proper font rendering. The CSS will be imported globally in the application layout.

**File: `src/app/layout.tsx`** — Add a CSS import:

```typescript
import "katex/dist/katex.min.css";
```

This ensures:
- CSS loads once at application startup
- Fonts are available before any math renders
- No per-component CSS re-fetching
- No layout shift from late-loading styles

### 4. Integration Points

#### 4.1 Chat View (StudyAssistant.jsx)

Replace the current `<ReactMarkdown>` block in the assistant message rendering:

**Before:**
```jsx
<div className="sa-markdown overflow-hidden">
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      table: ({ children, ...props }) => (
        <div className="sa-table-wrap">
          <table {...props}>{children}</table>
        </div>
      ),
    }}
  >
    {displayContent}
  </ReactMarkdown>
</div>
```

**After:**
```jsx
<div className="sa-markdown overflow-hidden">
  <MathMarkdown content={displayContent} />
</div>
```

#### 4.2 MCQ Question Text (MCQCardUI.tsx)

Replace plain text rendering of `question.question`:

**Before:**
```tsx
<h3 className="...">{question.question}</h3>
```

**After:**
```tsx
<h3 className="...">
  <MathMarkdown content={question.question} inline />
</h3>
```

#### 4.3 MCQ Option Text (MCQCardUI.tsx)

Replace plain text rendering of option strings:

**Before:**
```tsx
<span className="flex-1 leading-snug">{option}</span>
```

**After:**
```tsx
<span className="flex-1 leading-snug">
  <MathMarkdown content={option} inline />
</span>
```

#### 4.4 MCQ Explanation Text (MCQCardUI.tsx)

Replace plain text rendering of explanations:

**Before:**
```tsx
<p className="mt-1 text-sm leading-relaxed text-amber-900">
  {question.explanation}
</p>
```

**After:**
```tsx
<div className="mt-1 text-sm leading-relaxed text-amber-900">
  <MathMarkdown content={question.explanation} inline />
</div>
```

### 5. Error Handling

The `rehype-katex` plugin has built-in error handling. When it encounters invalid LaTeX:
- It renders the raw source text wrapped in a styled `<span>` with class `katex-error`
- It does NOT throw or crash the component
- The error text is displayed in red by default via KaTeX CSS

Custom CSS override for softer error display:

```css
/* In globals.css */
.katex-error {
  color: #71717a; /* zinc-500 — show as muted text instead of red */
  font-family: monospace;
  font-size: 0.9em;
}
```

### 6. Dollar Sign Disambiguation

The `remark-math` plugin handles disambiguation between math delimiters and literal dollar signs:
- Code blocks (`` `$PATH` `` and ` ```...``` `) are NOT processed — dollar signs inside code remain literal
- Escaped dollar signs (`\$`) render as literal `$` characters
- Single `$` without a closing `$` on the same line is treated as literal text

No additional configuration is needed for this behavior.

### 7. CSS Additions for Math Styling

Add to `globals.css` within the `.sa-markdown` scope:

```css
/* Math rendering — KaTeX overrides */
.sa-markdown .katex-display {
  margin: 1em 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5em 0;
}

.sa-markdown .katex {
  font-size: 1.1em;
}

/* Ensure math in MCQ cards doesn't overflow */
.katex-display {
  overflow-x: auto;
  overflow-y: hidden;
}

/* Mobile adjustments for math */
@media (max-width: 640px) {
  .sa-markdown .katex {
    font-size: 1em;
  }
  .sa-markdown .katex-display {
    font-size: 0.95em;
  }
}
```

### 8. Supported Math Notation Coverage

KaTeX supports the full range of LaTeX math notation required:

| Category | Examples | KaTeX Support |
|----------|----------|---------------|
| Trigonometry | `\sin`, `\cos`, `\tan`, `\arcsin` | ✓ Built-in operators |
| Vectors | `\vec{v}`, `\mathbf{F}`, `\cdot`, `\times` | ✓ Full support |
| Matrices | `\begin{pmatrix}`, `\begin{bmatrix}`, `\begin{vmatrix}` | ✓ All environments |
| Fractions | `\frac{a}{b}`, nested fractions | ✓ Full support |
| Integrals | `\int`, `\iint`, `\oint`, limits | ✓ Full support |
| Summations | `\sum_{i=0}^{n}`, `\prod`, `\lim` | ✓ Full support |
| Greek letters | `\alpha`, `\beta`, `\theta`, `\Sigma` | ✓ All letters |
| Alignment | `\begin{aligned}`, `\begin{cases}` | ✓ Full support |
| Chemistry | `\ce{}` (via mhchem extension) | ✗ Not included by default |

**Note:** For chemistry notation (`\ce{H2O}`), KaTeX does not include the mhchem extension by default. Standard subscript/superscript notation (`H_2O`, `CO_2`) works without extensions. If full chemical equation support is needed later, the `katex` package supports loading the mhchem extension.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `remark-math`, `rehype-katex`, `katex` dependencies |
| `src/components/ui/MathMarkdown.tsx` | Create | New reusable math-aware markdown component |
| `src/app/layout.tsx` | Modify | Add `import "katex/dist/katex.min.css"` |
| `src/app/globals.css` | Modify | Add KaTeX override styles and error styling |
| `src/components/StudyAssistant.jsx` | Modify | Replace `<ReactMarkdown>` with `<MathMarkdown>` |
| `src/components/quiz/MCQCardUI.tsx` | Modify | Use `<MathMarkdown inline>` for question, options, explanation |

## Testing Strategy

- Verify inline math (`$E = mc^2$`) renders as typeset math in chat
- Verify block math (`$$\int_0^1 x^2 dx$$`) renders centered in chat
- Verify math in MCQ questions, options, and explanations renders correctly
- Verify code blocks with `$` are not affected
- Verify existing markdown features (tables, bold, code, lists) still work
- Verify invalid LaTeX shows fallback text without crashing
- Verify mobile responsiveness of math expressions
