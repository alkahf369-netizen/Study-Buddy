# Implementation Plan: MCQ Exam Share Upgrade

## Overview

This plan implements the unified MCQ card UI, in-tab exam mode, and "Share with Friends" temporary link feature. Tasks are ordered by dependency — shared components first, then integration into existing pages.

## Tasks

- [x] 1. Create utility functions and write property tests
  - [x] 1.1 Create `calculateDuration` and `formatTime` utility functions in `src/lib/quiz/exam-utils.ts`. `calculateDuration(n)` returns `n * 60`. `formatTime(seconds)` returns zero-padded MM:SS string.
  - [ ]* 1.2 Write property test for `calculateDuration`: for any positive integer N, result equals N × 60 [PBT]
  - [ ]* 1.3 Write property test for `formatTime` round-trip: for any non-negative integer seconds, parsing the formatted MM:SS string back yields the original value [PBT]
  - [ ]* 1.4 Write property test for unanswered count: for any answers map and total question count, unanswered = total - Object.keys(answers).length [PBT]
  - [ ]* 1.5 Write property test for score calculation: for any user answers and correct answers arrays, score equals count of indices where values match [PBT]
  - [ ]* 1.6 Write property test for session expiration: for any creation time T and access time A, session is expired iff A > T + 3600000ms [PBT]
  - [ ]* 1.7 Write property test for token uniqueness: generating a batch of 100 tokens produces all distinct values [PBT]

- [x] 2. Create core UI components
  - [x] 2.1 Create MCQCardUI component (`src/components/quiz/MCQCardUI.tsx`) with `mode` prop supporting practice, exam, and review modes. Practice mode: Q badge numbering, 2x2 responsive option grid, green/red highlighting on answer, explanation display. Exam mode: selection highlighting only (no reveals). Review mode: all correct answers shown with explanations (read-only).
  - [x] 2.2 Create ExamTimer component (`src/components/quiz/ExamTimer.tsx`) with countdown from `durationSeconds`, MM:SS display format, red styling at ≤60s remaining, and `onExpire` callback at zero. Timer starts immediately on mount.

- [x] 3. Create exam mode and integrate components
  - [x] 3.1 Create ExamModeView component (`src/components/quiz/ExamModeView.tsx`) integrating ExamTimer + MCQCardUI in exam mode. Manages in_progress → submitted state. Shows confirmation dialog if unanswered questions exist on submit. Displays score summary and MCQCardUI in review mode after submission. Adds beforeunload warning during active exam.
  - [x] 3.2 Integrate MCQCardUI into StudyAssistant.jsx: replace inline MCQ card rendering with MCQCardUI component in practice mode. Ensure existing answer handling and streaming question display still work.
  - [x] 3.3 Modify GET `/api/test-session/[token]/route.ts` to return question text and options (without correctAnswer/explanation) in the response for MCQCardUI rendering.
  - [x] 3.4 Modify POST `/api/test-attempt/[attemptId]/submit/route.ts` to include full question data (correctAnswer and explanation) in the submit response for results display.
  - [x] 3.5 Modify POST `/api/test-session/route.ts`: make `durationSeconds` optional, default to `questionCount * 60` by counting quiz questions if not provided.

- [x] 4. Add exam mode and share buttons
  - [x] 4.1 Add "Exam Mode" button to StudyAssistant.jsx next to "New Quiz" button (visible after quiz generation). When clicked, render ExamModeView in place of practice view with duration = questions.length × 60. Wire exit callback to return to practice view.
  - [x] 4.2 Replace "Start Test" button with "Share with Friends" button in StudyAssistant.jsx. Add authentication check — show sign-in prompt if user is not authenticated.
  - [x] 4.3 Create SharedQuizView component (`src/components/quiz/SharedQuizView.tsx`): fetch session from `/api/test-session/[token]`, render MCQCardUI in exam mode with ExamTimer, handle answer tracking with debounced server save, implement submit flow showing results in review mode, handle expired/invalid states.

- [x] 5. Update SetupForm and shared quiz page
  - [x] 5.1 Modify SetupForm.tsx: remove duration input field, auto-calculate duration as `questions.length * 60`. Update heading to "Share with Friends" and description text. Keep link display and copy functionality.
  - [x] 5.2 Update `/test/[token]/page.tsx` to render SharedQuizView instead of TestRunner. Remove proctoring features (fullscreen, violation detection) from the shared quiz flow.

- [x] 6. End-to-end verification
  - [x] 6.1 End-to-end verification: generate quiz → take exam in-tab → share link → open shared link → take exam → view results. Verify expired link shows appropriate message.

## Notes

- The existing `TestRunner` and `ProctoringClient` components are preserved for potential future proctored exam use but are no longer used in the "Share with Friends" flow.
- The `TimerDisplay` component in `src/components/test/TimerDisplay.tsx` exists but is tightly coupled to the old TestRunner. The new `ExamTimer` is a clean implementation using the same countdown logic but with the unified styling.
- Property-based tests use `fast-check` (already in devDependencies) with `vitest`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 4, "tasks": ["5.1", "5.2"] },
    { "id": 5, "tasks": ["6.1"] }
  ]
}
```
