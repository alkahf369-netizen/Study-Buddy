# Tasks: Math Rendering Optimization

## Task 1: Install Dependencies

- [x] 1.1 Install `remark-math`, `rehype-katex`, and `katex` packages using npm
- [x] 1.2 Verify packages are added to `package.json` dependencies

## Task 2: Create MathMarkdown Component

- [x] 2.1 Create `src/components/ui/MathMarkdown.tsx` with the reusable component that accepts `content`, `inline`, and `className` props
- [x] 2.2 Implement block mode (default) with remarkGfm, remarkMath, rehypeKatex plugins and table wrapper component
- [x] 2.3 Implement inline mode that unwraps paragraph elements for use in MCQ options and short text

## Task 3: Load KaTeX CSS Globally

- [x] 3.1 Add `import "katex/dist/katex.min.css"` to `src/app/layout.tsx`
- [x] 3.2 Add KaTeX override styles to `src/app/globals.css` (`.katex-display` margins, overflow, font-size adjustments)
- [x] 3.3 Add `.katex-error` fallback styling in `globals.css` for invalid LaTeX expressions
- [x] 3.4 Add mobile-responsive math styles in the existing `@media (max-width: 640px)` block

## Task 4: Integrate MathMarkdown in Chat View

- [x] 4.1 Import `MathMarkdown` in `src/components/StudyAssistant.jsx`
- [x] 4.2 Replace the existing `<ReactMarkdown>` block in assistant message rendering with `<MathMarkdown content={displayContent} />`
- [x] 4.3 Remove the now-unused direct `import ReactMarkdown` and `import remarkGfm` if no other usage remains

## Task 5: Integrate MathMarkdown in MCQ Components

- [x] 5.1 Import `MathMarkdown` in `src/components/quiz/MCQCardUI.tsx`
- [x] 5.2 Replace `{question.question}` plain text with `<MathMarkdown content={question.question} inline />`
- [x] 5.3 Replace `{option}` plain text in option buttons with `<MathMarkdown content={option} inline />`
- [x] 5.4 Replace `{question.explanation}` plain text with `<MathMarkdown content={question.explanation} inline />`

## Task 6: Verify and Test

- [-] 6.1 Run `npm run build` to verify no TypeScript or build errors
- [~] 6.2 Verify that existing markdown features (tables, code blocks, bold, lists) still render correctly
- [~] 6.3 Test inline math rendering with sample content like `$E = mc^2$`
- [~] 6.4 Test block math rendering with sample content like `$$\int_0^1 x^2 dx$$`
- [~] 6.5 Test that dollar signs in code blocks are not interpreted as math delimiters
