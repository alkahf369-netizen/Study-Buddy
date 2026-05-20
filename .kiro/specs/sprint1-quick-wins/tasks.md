# Implementation Plan: Sprint 1 — Quick Wins & Bug Fixes

## Overview

This plan wires the existing complexity/count UI controls to the backend as structured JSON fields, adds server-side validation and prompt construction, persists the new fields in the database, replaces the boilerplate README, and removes dead files. Tasks are ordered by dependency: schema → API → frontend → docs → cleanup.

## Tasks

- [x] 1. Add complexity and requestedCount fields to Prisma schema
  - [x] 1.1 Add `complexity String?` and `requestedCount Int?` fields to the `Quiz` model in `prisma/schema.prisma`
    - Add after the `originalText` field
    - Both fields are nullable for backward compatibility
    - _Requirements: 2.1, 2.2_
  - [x] 1.2 Run Prisma migration
    - Execute `npx prisma migrate dev --name add-quiz-complexity-count`
    - Verify the migration SQL adds the two nullable columns
    - _Requirements: 2.1, 2.2_

- [x] 2. Update the generate-quiz API route with validation, prompt construction, and persistence
  - [x] 2.1 Add input validation for complexity and count
    - Destructure `complexity`, `count`, `aiAutoCount` from request body in `src/app/api/generate-quiz/route.ts`
    - Validate `complexity` against allowed values `["recall", "apply", "analyze", "mastery"]`; return 400 if invalid
    - Validate `count` is an integer in [1, 50] when `aiAutoCount` is false; return 400 if invalid
    - Allow missing/undefined values to pass through (graceful defaults)
    - _Requirements: 1.5, 1.6_
  - [x] 2.2 Implement server-side prompt construction with complexity and count directives
    - Define `COMPLEXITY_PROMPTS` map with full instruction text for each level
    - Append complexity instruction to prompt when `complexity` is provided
    - Append `"Generate exactly ${count} MCQs."` when `aiAutoCount` is false and `count` is valid
    - Append auto-count instruction when `aiAutoCount` is true
    - Remove reliance on frontend-appended hint text
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 2.3 Persist complexity and requestedCount in the Quiz database record
    - Add `complexity: complexity || null` to `prisma.quiz.create` data
    - Add `requestedCount: (!aiAutoCount && count) ? count : null` to `prisma.quiz.create` data
    - Wire `userId: session?.user?.id || undefined` (already exists, verify it's present)
    - _Requirements: 2.3, 2.4_
  - [ ]* 2.4 Write property tests for prompt construction and validation
    - Use fast-check to test:
      - **Property 1: Complexity injection correctness** — for any valid complexity, prompt contains corresponding instruction
      - **Property 2: Count injection correctness** — for any count in [1,50] with aiAutoCount=false, prompt contains "Generate exactly N MCQs"
      - **Property 3: AI auto-count ignores explicit count** — for aiAutoCount=true, prompt has no numeric count directive
      - **Property 4: Invalid complexity rejection** — for any string not in valid set, API returns 400
      - **Property 5: Invalid count rejection** — for any non-integer or out-of-range value with aiAutoCount=false, API returns 400
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**

- [x] 3. Checkpoint — Verify backend changes
  - Ensure Prisma migration applied cleanly and `npx prisma generate` succeeds
  - Ensure `npm run build` passes with no type errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update StudyAssistant.jsx frontend to send structured fields
  - [x] 4.1 Update `postGenerateQuiz` to accept and send complexity, count, and aiAutoCount
    - Change signature to include `complexity`, `count`, `aiAutoCount` parameters
    - Include them in the `JSON.stringify` body sent to `/api/generate-quiz`
    - _Requirements: 1.1_
  - [x] 4.2 Update `startQuiz` to pass structured fields instead of appending hint text
    - Remove the `hints` array construction and `hintLine` concatenation (lines ~4087–4099)
    - Pass `complexity`, `count`, `aiAutoCount` directly to `postGenerateQuiz`
    - Keep `promptText` as clean user text (no appended metadata)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 5. Checkpoint — Verify end-to-end flow
  - Ensure `npm run build` passes with no errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Replace README.md with project documentation
  - [x] 6.1 Rewrite `README.md` with comprehensive project documentation
    - Include project description explaining Study Buddy's purpose
    - List tech stack: Next.js 16, Prisma ORM, SQLite, NextAuth v5, Tailwind CSS v4
    - Document all required environment variables with descriptions in a table
    - Provide step-by-step setup instructions (clone, install, env config, migrate, dev server)
    - Add brief project structure overview
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Delete dead files
  - [x] 7.1 Remove `nano_gpt_models.txt`, `models_output.json`, and `backend_for_emergent.md`
    - Delete all three files from the repository root
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 8. Final checkpoint — Verify clean build
  - Ensure `npm run build` passes with no errors
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The frontend change (task 4) depends on the backend (task 2) being complete first
