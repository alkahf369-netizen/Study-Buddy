# Implementation Plan: PDF Page Range Selector

## Overview

This plan implements the PDF Page Range Selector feature for Study Buddy, enabling users to upload large PDFs and select specific pages for quiz generation. The implementation proceeds bottom-up: shared types and validation first, then backend extraction/API, then frontend component, and finally wiring everything together.

## Tasks

- [x] 1. Define shared types and page range validation
  - [x] 1.1 Add PageRange and PdfMetadata types to shared types module
    - Add `PageRange`, `PdfMetadataRequest`, and `PdfMetadataResponse` interfaces to `src/lib/quiz/types.ts`
    - _Requirements: 7.1, 7.2_

  - [x] 1.2 Create page range validation module
    - Create `src/lib/quiz/page-range-validator.ts` with `validatePageRange` function
    - Implement rules: startPage/endPage must be integers, startPage >= 1, endPage >= startPage, endPage <= totalPages (when provided)
    - Return `{ valid, error? }` result object
    - _Requirements: 2.5, 3.5, 3.6, 7.4, 7.5_

  - [ ]* 1.3 Write property test for page range validation
    - **Property 1: Page range validation correctness**
    - Generate random (startPage, endPage, totalPages) tuples and verify validation returns valid iff startPage >= 1 AND endPage >= startPage AND endPage <= totalPages; non-integer values always return invalid
    - **Validates: Requirements 2.2, 2.5, 3.5, 3.6, 7.4, 7.5**

- [x] 2. Enhance PDF extractor with page range support
  - [x] 2.1 Implement `getPageCount` function
    - Add `getPageCount(base64Data: string): Promise<number>` to `src/lib/quiz/pdf-extractor.ts`
    - Use `PDFParse` with `getText({ first: 1, last: 1 })` for efficiency, return `textResult.total`
    - Handle corrupted/password-protected PDFs with descriptive errors
    - Handle zero-page PDFs with specific error message
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 2.2 Implement `extractTextFromPdfRange` function
    - Add `extractTextFromPdfRange(base64Data, startPage, endPage): Promise<ExtractionResult>` to `src/lib/quiz/pdf-extractor.ts`
    - Use `PDFParse.getText({ first: startPage, last: endPage })` to extract text from specific pages
    - Validate page range using `validatePageRange` before extraction
    - Throw error if selected pages contain no extractable text
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x] 2.3 Implement `estimateCharCount` function
    - Add `estimateCharCount(base64Data, startPage, endPage): Promise<number>` to `src/lib/quiz/pdf-extractor.ts`
    - Reuse `extractTextFromPdfRange` internally, return text length
    - _Requirements: 5.1_

  - [ ]* 2.4 Write property test for page range extraction
    - **Property 3: Page range extraction returns correct pages**
    - Mock PDFParse to return per-page text; verify concatenation for random valid ranges matches expected page text joined by newlines
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.5 Write property test for page count detection
    - **Property 6: Page count detection returns total pages**
    - Mock PDFParse with random page counts; verify `getPageCount` returns the correct total
    - **Validates: Requirements 1.1**

- [x] 3. Enhance file router with conditional size limit
  - [x] 3.1 Modify `validateAndFormatFiles` to accept options parameter
    - Update `validateAndFormatFiles` signature to accept optional `{ hasPageRange?: boolean }` second parameter
    - When `hasPageRange` is true, apply 50 MB limit for PDF files; otherwise retain 10 MB limit
    - Image files always use 10 MB limit regardless of `hasPageRange`
    - Update error messages to reflect the applicable limit
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.2 Write property test for conditional file size limit
    - **Property 2: Conditional file size limit**
    - Generate random file sizes, MIME types, and hasPageRange flags; verify correct accept/reject behavior against the applicable limit
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 4. Checkpoint - Core backend logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create PDF metadata API endpoint
  - [x] 5.1 Create `/api/pdf-metadata` route
    - Create `src/app/api/pdf-metadata/route.ts` with POST handler
    - Accept `{ base64Data, mimeType, startPage?, endPage? }` in request body
    - Validate mimeType is `application/pdf`
    - Call `getPageCount` to get total pages
    - If startPage/endPage provided, validate range and call `estimateCharCount`
    - Return `{ pageCount, charCount? }` response
    - Handle errors with appropriate HTTP status codes (400, 422)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1_

  - [ ]* 5.2 Write unit tests for PDF metadata API
    - Test successful page count response
    - Test character estimation with valid range
    - Test error responses for corrupted PDF, invalid range, zero-page PDF
    - _Requirements: 1.1, 1.2, 1.4, 5.1_

- [x] 6. Modify generate-quiz route for page range support
  - [x] 6.1 Update generate-quiz route to handle page ranges
    - Modify `src/app/api/generate-quiz/route.ts` to accept `pageRanges` in request body
    - When `pageRanges` present, pass `{ hasPageRange: true }` to `validateAndFormatFiles`
    - For each PDF with a page range, use `extractTextFromPdfRange` instead of sending raw PDF to AI
    - Validate page ranges server-side using `validatePageRange`
    - Combine extracted text with user-provided text in the prompt
    - Preserve existing behavior when no page ranges provided
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 3.1, 3.4, 4.1_

  - [ ]* 6.2 Write unit tests for generate-quiz page range handling
    - Test request with page range extracts only specified pages
    - Test request without page range preserves existing behavior
    - Test invalid page range returns error
    - Test non-integer page values return error
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 7. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Build PageRangeSelector component
  - [x] 8.1 Create PageRangeSelector React component
    - Create `src/components/PageRangeSelector.tsx`
    - Accept props: `fileIndex`, `base64Data`, `onRangeChange`
    - On mount, fetch page count from `/api/pdf-metadata`
    - Render two number inputs (start page, end page) with "of N pages" label
    - Default start to 1, end to total page count
    - Implement inline validation with error messages
    - Disable quiz generation button on invalid range (communicate via `onRangeChange(fileIndex, null)`)
    - Show loading state while fetching page count
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 8.2 Add character count estimation with debounce
    - Implement 500ms debounced call to `/api/pdf-metadata` with startPage/endPage after valid range change
    - Display estimated character count formatted as "~12,000 characters"
    - Show loading indicator during estimation
    - Display "too large" warning when count > 100,000
    - Display "too little" warning when count < 200
    - Show "Estimate unavailable" on timeout (5s) or API error without blocking quiz generation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 8.3 Write property test for character count warning thresholds
    - **Property 4: Character count warning thresholds**
    - Generate random character count values; verify correct warning classification (too large > 100k, too little < 200, none otherwise)
    - **Validates: Requirements 5.3, 5.4**

  - [ ]* 8.4 Write property test for default page range initialization
    - **Property 7: Default page range initialization**
    - Generate random positive integer page counts; verify defaults initialize to (1, pageCount)
    - **Validates: Requirements 2.3**

- [x] 9. Integrate PageRangeSelector into MCQ Composer
  - [x] 9.1 Add PageRangeSelector to StudyAssistant component
    - Modify `src/components/StudyAssistant.jsx` to render `PageRangeSelector` for each uploaded PDF file
    - Only render for files with MIME type `application/pdf`
    - Track page ranges in component state keyed by file index
    - Remove selector when associated PDF is removed
    - Hide all selectors when last PDF is removed
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 9.2 Write property test for selector count
    - **Property 5: Selector count equals PDF file count**
    - Generate random file lists with varying MIME types; verify selector count equals number of PDF files
    - **Validates: Requirements 6.1, 6.2**

- [x] 10. Wire page ranges into quiz generation flow
  - [x] 10.1 Update useQuizStream hook to pass page ranges
    - Modify `src/hooks/useQuizStream.ts` to accept and include `pageRanges` in the request payload
    - Pass `pageRanges` as `Record<number, { startPage: number; endPage: number }>` keyed by file index
    - _Requirements: 7.1_

  - [x] 10.2 Connect MCQ Composer submit to include page ranges
    - Update the quiz generation submit handler in `StudyAssistant.jsx` to pass collected page ranges from state to `useQuizStream`
    - Only include page ranges for files that have a valid range set
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 11. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout, matching the existing codebase
- `fast-check` and `vitest` are already installed and configured

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "3.2"] },
    { "id": 3, "tasks": ["2.4", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3", "8.4"] },
    { "id": 7, "tasks": ["9.1", "10.1"] },
    { "id": 8, "tasks": ["9.2", "10.2"] }
  ]
}
```
