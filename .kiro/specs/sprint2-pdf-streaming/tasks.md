# Implementation Plan: Sprint 2 — PDF Upload & Quiz Streaming

## Overview

This plan implements PDF upload handling (MIME detection, text extraction fallback, size validation) and SSE-based quiz generation streaming with progressive client rendering. Tasks are ordered by dependency: shared utilities → server modules → route refactor → client hook → integration wiring.

## Tasks

- [x] 1. Install dependencies and set up test infrastructure
  - [x] 1.1 Install runtime and dev dependencies
    - Add `pdf-parse` as a runtime dependency
    - Add `fast-check`, `vitest`, `@types/pdf-parse` as dev dependencies
    - Add a `"test"` script to `package.json` (e.g., `vitest --run`)
    - _Requirements: 2.1, 2.5_
  - [x] 1.2 Create shared TypeScript interfaces for quiz streaming
    - Create `src/lib/quiz/types.ts` with interfaces: `FilePayload`, `DocumentPart`, `ImageUrlPart`, `FormattedFilePart`, `QuizQuestion`, `QuestionEvent`, `DoneEvent`, `ErrorEvent`, `SSEEventType`
    - Match the interface definitions from the design document exactly
    - _Requirements: 1.1, 1.2, 4.2, 4.3, 4.4_

- [x] 2. Implement File Router module
  - [x] 2.1 Create `src/lib/quiz/file-router.ts` with file validation and formatting
    - Implement `formatFilePart(file: FilePayload): FormattedFilePart` that routes by `inlineData.mimeType`
    - For `application/pdf` → produce `DocumentPart` with base64 data and mimeType
    - For `image/*` → produce `ImageUrlPart` with `data:mimeType;base64,data` URL
    - For missing/other mimeType → throw error indicating unsupported file type
    - Implement `validateAndFormatFiles(files: FilePayload[]): FormattedFilePart[]` that validates size (≤10,485,760 bytes decoded) and formats each file
    - Reject files exceeding 10 MB with a descriptive error (HTTP 413 semantics)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2_
  - [ ]* 2.2 Write property test: File routing by MIME type (Property 1)
    - **Property 1: File routing by MIME type**
    - For any file with mimeType `application/pdf` → produces DocumentPart
    - For any file with mimeType starting with `image/` → produces ImageUrlPart
    - For any other/missing mimeType → throws unsupported error
    - Test file: `src/lib/quiz/__tests__/file-router.property.test.ts`
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  - [ ]* 2.3 Write property test: File size validation boundary (Property 5)
    - **Property 5: File size validation boundary**
    - For any base64 payload, accept if decoded size ≤ 10,485,760 bytes, reject otherwise
    - Test boundary conditions around the 10 MB limit
    - Test file: `src/lib/quiz/__tests__/file-router.property.test.ts`
    - **Validates: Requirements 3.1, 3.2**

- [x] 3. Implement PDF Extractor module
  - [x] 3.1 Create `src/lib/quiz/pdf-extractor.ts` with text extraction logic
    - Implement `extractTextFromPdf(base64Data: string): Promise<ExtractionResult>` that decodes base64 and calls `pdf-parse`
    - Implement `extractTextFromMultiplePdfs(files: FilePayload[]): Promise<string>` that extracts from each PDF and joins with newline
    - Validate extracted text is non-empty after trimming; throw error for whitespace-only results
    - Wrap `pdf-parse` errors with descriptive message (HTTP 422 semantics)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_
  - [ ]* 3.2 Write property test: Whitespace-only extraction rejection (Property 3)
    - **Property 3: Whitespace-only extraction rejection**
    - For any string composed entirely of whitespace characters, validation rejects it
    - Test file: `src/lib/quiz/__tests__/pdf-extractor.property.test.ts`
    - **Validates: Requirements 2.3**
  - [ ]* 3.3 Write property test: Base64 decode and multi-PDF concatenation (Property 4)
    - **Property 4: Base64 decode round-trip and multi-PDF concatenation**
    - For any array of PDF payloads, concatenated result equals individual extractions joined by newline in order
    - Test file: `src/lib/quiz/__tests__/pdf-extractor.property.test.ts`
    - **Validates: Requirements 2.5, 2.6**
  - [ ]* 3.4 Write property test: Extracted text ordering in prompt (Property 2)
    - **Property 2: Extracted text ordering in prompt**
    - For any user text and extracted text, final prompt has user text before extracted text
    - Test file: `src/lib/quiz/__tests__/pdf-extractor.property.test.ts`
    - **Validates: Requirements 2.2**

- [x] 4. Implement Streaming Parser module
  - [x] 4.1 Create `src/lib/quiz/streaming-parser.ts` with token accumulation and question extraction
    - Implement `StreamingParser` class with `push(token)`, `end()`, and `getBufferSize()` methods
    - Strip markdown code fences (` ```json `, ` ```JSON `, ` ``` `) before parsing
    - Detect complete question objects (with question, options, correctAnswer, explanation fields) and emit via `onQuestion` callback
    - Track sequential index starting at 0
    - Handle buffer overflow (>512 KB) by emitting error
    - On `end()`: flush remaining buffer, emit `onDone` with collected questions and warnings for skipped malformed objects
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 4.8_
  - [ ]* 4.2 Write property test: Streaming parser equivalence to batch parsing (Property 6)
    - **Property 6: Streaming parser equivalence to batch parsing**
    - For any valid JSON array of questions, splitting into arbitrary token chunks and feeding through parser produces same results as JSON.parse
    - Test file: `src/lib/quiz/__tests__/streaming-parser.property.test.ts`
    - **Validates: Requirements 7.1, 7.2, 7.6**
  - [ ]* 4.3 Write property test: Markdown fence stripping (Property 7)
    - **Property 7: Markdown fence stripping preserves content**
    - For any valid JSON array wrapped in markdown fences, parser produces same questions as unwrapped JSON
    - Test file: `src/lib/quiz/__tests__/streaming-parser.property.test.ts`
    - **Validates: Requirements 7.3**
  - [ ]* 4.4 Write property test: Malformed question resilience (Property 8)
    - **Property 8: Malformed question resilience**
    - For any mix of K valid and M malformed questions, parser emits exactly K valid questions and reports M skipped
    - Test file: `src/lib/quiz/__tests__/streaming-parser.property.test.ts`
    - **Validates: Requirements 4.8**
  - [ ]* 4.5 Write property test: SSE question event sequential indexing (Property 10)
    - **Property 10: SSE question event sequential indexing**
    - For any N questions emitted, indices are sequential from 0 to N-1
    - Test file: `src/lib/quiz/__tests__/streaming-parser.property.test.ts`
    - **Validates: Requirements 4.2**

- [x] 5. Checkpoint — Verify library modules
  - Ensure all tests pass (`npm test`), ask the user if questions arise.

- [x] 6. Refactor generate-quiz route for SSE streaming with PDF support
  - [x] 6.1 Update `src/app/api/generate-quiz/route.ts` with file validation and PDF routing
    - Import and use `validateAndFormatFiles` from file-router for file payload processing
    - Replace existing inline `image_url` formatting with the file router output
    - Add file size validation before processing (return 413 for oversized files)
    - Add mimeType validation (return 400 for unsupported types)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2_
  - [x] 6.2 Add PDF fallback retry logic to the generate-quiz route
    - After initial AI API call, if response is 4xx with content-type/media-type error message, trigger fallback
    - Use `extractTextFromMultiplePdfs` to get text from PDF files
    - Append extracted text after user-provided text in prompt
    - Retry the AI request exactly once with text-only content
    - Return 422 for empty extraction or pdf-parse errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 6.3 Convert route response from JSON to SSE streaming
    - Change response content type to `text/event-stream`
    - Set headers: `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`
    - Call AI API with `stream: true` parameter
    - Instantiate `StreamingParser` with callbacks that write SSE events to the response stream
    - Emit `event: question` with `{index, data}` for each parsed question
    - Emit `event: done` with `{id, totalCount, incomplete, warnings?, fallbackData?}` after stream ends
    - Emit `event: error` with `{message}` on failures during streaming
    - Implement 30-second inactivity timeout that emits error event and closes stream
    - Handle client disconnect by aborting upstream AI request via AbortController
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  - [x] 6.4 Implement quiz persistence after stream completion
    - Collect all parsed questions during streaming
    - After stream ends, persist quiz with title (max 50 chars), originalText, complexity, requestedCount, and all questions
    - Include saved quiz ID in `done` event; if DB save fails, include full quiz data with null ID
    - Handle partial streams: persist only successfully received questions, mark incomplete in `done` event
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 6.5 Write property test: Quiz persistence completeness (Property 9)
    - **Property 9: Quiz persistence completeness**
    - For any N parsed questions (N ≥ 1), persisted Quiz has exactly N QuizQuestion records with matching field values, and title ≤ 50 chars
    - Test file: `src/lib/quiz/__tests__/persistence.property.test.ts`
    - **Validates: Requirements 6.1, 6.4**

- [x] 7. Checkpoint — Verify streaming route
  - Ensure `npm run build` passes with no type errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement client-side useQuizStream hook
  - [x] 8.1 Create `src/hooks/useQuizStream.ts` React hook
    - Implement `useQuizStream` hook that manages SSE connection via `EventSource` or `fetch` with ReadableStream
    - Expose: `questions`, `isStreaming`, `error`, `totalCount`, `quizId`, `startStream`, `abort`
    - On `question` event: parse payload, append to questions state within 100ms
    - On `done` event: set final state (quizId, totalCount), stop streaming indicator
    - On `error` event: set error message, close connection, stop streaming
    - Implement 30-second connection timeout (no events received → show connection failure)
    - Clean up EventSource/AbortController on unmount
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.8_
  - [ ]* 8.2 Write unit tests for useQuizStream hook
    - Test progressive question accumulation
    - Test error state transitions
    - Test connection timeout handling
    - Test abort/cleanup behavior
    - Test zero-questions done event → error display
    - _Requirements: 5.1, 5.2, 5.6, 5.7, 5.8_

- [x] 9. Update frontend MCQ Composer for PDF upload and streaming
  - [x] 9.1 Add client-side file size validation to MCQ Composer
    - In the file upload handler within `StudyAssistant.jsx`, check raw file size against 10,485,760 bytes
    - Display inline error message adjacent to file input when file exceeds 10 MB
    - Clear error message when a valid file is selected after a size error
    - Prevent upload request from being sent for oversized files
    - _Requirements: 3.3, 3.4_
  - [x] 9.2 Integrate `useQuizStream` hook into quiz generation flow
    - Replace the existing `postGenerateQuiz` fetch call in `startQuiz` with `useQuizStream.startStream`
    - Render questions progressively as they arrive from the stream
    - Add CSS transition animation (fade-in) for new questions, 200-400ms duration
    - Show progress indicator with question count while streaming
    - Remove progress indicator and show full interactive quiz on `done` event
    - Handle error events by displaying error message and showing any received questions in interactive state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 10. Checkpoint — Verify full integration
  - Ensure `npm run build` passes with no errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Final wiring and edge case handling
  - [x] 11.1 Wire fallback data recovery on client when DB save fails
    - When `done` event has `id: null` and `fallbackData` is present, use fallbackData to display the quiz
    - Show a non-blocking warning that the quiz could not be saved to history
    - _Requirements: 6.3_
  - [x] 11.2 Handle partial stream and incomplete quiz display
    - When `done` event has `incomplete: true`, display received questions in interactive state
    - Show indicator that the quiz is incomplete (e.g., "X of Y questions generated")
    - When connection is lost mid-stream, display any received questions as interactive
    - _Requirements: 5.7, 6.4_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure `npm run build` passes with no errors
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (10 properties total)
- Unit tests validate specific examples and edge cases
- The streaming parser is a pure module with no I/O — ideal for property-based testing
- Pre-stream errors (validation, extraction) return standard JSON responses; in-stream errors use SSE error events
- No Prisma schema changes are needed — existing Quiz/QuizQuestion models support the streaming flow

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "4.2", "4.3", "4.4", "4.5"] },
    { "id": 3, "tasks": ["6.1", "6.2"] },
    { "id": 4, "tasks": ["6.3", "6.4"] },
    { "id": 5, "tasks": ["6.5", "8.1"] },
    { "id": 6, "tasks": ["8.2", "9.1", "9.2"] },
    { "id": 7, "tasks": ["11.1", "11.2"] }
  ]
}
```
