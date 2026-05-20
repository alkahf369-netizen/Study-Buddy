# Design Document: MCQ Exam Share Upgrade

## Overview

This design describes the implementation plan for unifying the MCQ card UI, adding in-tab exam mode, and replacing the "Start Test" button with a "Share with Friends" temporary link feature. The architecture leverages the existing Next.js App Router, Prisma schema, and component structure.

## Architecture

The system follows a component-based architecture where a single `MCQCardUI` component is shared across three contexts: the quiz generator page (practice mode), the in-tab exam mode, and the shared quiz view. The ExamTimer and ExamModeView components provide exam orchestration. The existing API routes are extended to support the unified UI data needs.

## Components and Interfaces

### MCQCardUI Component

**File:** `src/components/quiz/MCQCardUI.tsx`

```typescript
type MCQCardMode = "practice" | "exam" | "review";

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type MCQCardUIProps = {
  questions: QuizQuestion[];
  answers: Record<number, string>;
  onAnswer: (questionIndex: number, option: string) => void;
  mode: MCQCardMode;
};
```

**Behavior by mode:**
- `practice`: Shows correct/incorrect highlighting immediately after selection, displays explanation
- `exam`: Allows selection (highlighted as selected) but does NOT reveal correct answer or explanation
- `review`: Shows all correct answers and explanations (read-only, used for results display)

### ExamTimer Component

**File:** `src/components/quiz/ExamTimer.tsx`

```typescript
type ExamTimerProps = {
  durationSeconds: number;
  onExpire: () => void;
  startedAt?: Date; // defaults to mount time
};
```

- Starts counting down immediately on mount
- Displays MM:SS format
- Turns red when ≤ 60 seconds remain
- Calls `onExpire` when reaching zero

### ExamModeView Component

**File:** `src/components/quiz/ExamModeView.tsx`

```typescript
type ExamModeViewProps = {
  questions: QuizQuestion[];
  durationSeconds: number;
  onExit: () => void;
};
```

- Manages exam state (in_progress → submitted)
- Contains ExamTimer + MCQCardUI (exam mode)
- On submit/expire: switches to results view with MCQCardUI in review mode
- Shows score summary (X/Y correct, percentage)

### SharedQuizView Component

**File:** `src/components/quiz/SharedQuizView.tsx`

```typescript
type SharedQuizViewProps = {
  token: string;
};
```

Replaces the current `TestRunner` for the `/test/[token]` page. Uses the same `MCQCardUI` and `ExamTimer` components.

- Fetches session data from `/api/test-session/[token]`
- Renders MCQCardUI in exam mode with ExamTimer
- On submit: posts answers to `/api/test-attempt/[attemptId]/submit`, then shows results using MCQCardUI in review mode
- Handles expired/invalid states with appropriate messages

### ShareButton Integration (Modified SetupForm)

The existing `SetupForm` component will be modified:
- Rename the trigger button from "Start Test" to "Share with Friends"
- Remove the duration input (auto-calculate as `questions.length * 60` seconds)
- Keep the link display and copy functionality

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ StudyAssistant (Quiz Generator Page)                     │
│  ├── MCQCardUI (practice mode - shows answers)           │
│  ├── ExamModeView (in-tab exam)                          │
│  │    ├── ExamTimer                                      │
│  │    ├── MCQCardUI (exam mode - no reveals)             │
│  │    └── ExamResults (after submit)                     │
│  └── ShareButton → SetupForm (generates link)            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ /test/[token] (Shared Quiz Page - REDESIGNED)            │
│  ├── ExamTimer                                           │
│  ├── MCQCardUI (exam mode → review mode after submit)    │
│  └── ExamResults (after submit)                          │
└─────────────────────────────────────────────────────────┘
```

## Data Models

No schema changes required. The existing `TestSession` model already supports all needed functionality:

- **1-hour expiration**: `expiresAt` field (set to `now + 3600000ms` in `createSession`)
- **Duration tracking**: `durationSeconds` field
- **Token-based access**: `token` field (unique)
- **Attempt tracking**: `TestAttempt` relation

The `Quiz` and `QuizQuestion` models remain unchanged. The `createSession` service already implements the 1-hour expiry logic.

## API Changes

### Modified: POST `/api/test-session`

- Make `durationSeconds` optional in request body
- If not provided, calculate as `questionCount * 60` by counting quiz questions
- Add `questionCount` to the response

### Modified: GET `/api/test-session/[token]`

- Return question text and options (without `correctAnswer`/`explanation`) for MCQCardUI rendering
- This replaces the current approach where TestRunner fetches questions separately

### Modified: POST `/api/test-attempt/[attemptId]/submit`

- Include full question data (with `correctAnswer` and `explanation`) in the response
- This allows SharedQuizView to display results without an additional API call

## Error Handling

- **Invalid token**: SharedQuizView displays "Invalid test link" message with clear visual indicator
- **Expired link**: SharedQuizView displays "This link has expired" message with timestamp info
- **Network errors during answer save**: Answers are saved to localStorage as fallback, retried on next interaction
- **Timer desync**: Timer uses `startedAt` timestamp from server to calculate remaining time, preventing client clock drift
- **Unauthenticated share attempt**: Shows sign-in prompt instead of opening SetupForm
- **Auto-submit on timer expiry**: If network fails during auto-submit, retry with exponential backoff (max 3 attempts)

## Correctness Properties

### Property 1: Timer Duration Calculation

For any positive number of questions N, the calculated exam duration SHALL equal N × 60 seconds.

```
∀ n ∈ ℤ⁺: calculateDuration(n) = n * 60
```

**Validates: Requirements 2.3, 3.6, 5.2**

**Tested by:** Property-based test generating random positive integers and verifying the multiplication.

### Property 2: Timer Format Round-Trip

For any non-negative integer of seconds, the formatted timer string SHALL match the pattern `MM:SS` where MM is 0-padded minutes and SS is 0-padded seconds, and parsing back yields the original value.

```
∀ s ∈ ℕ: formatTime(s) matches /^\d{2,}:\d{2}$/
∀ s ∈ ℕ: parseMinutes(formatTime(s)) * 60 + parseSeconds(formatTime(s)) = s
```

**Validates: Requirements 2.5, 4.3**

**Tested by:** Property-based test with round-trip verification (format then parse back).

### Property 3: Share Link Token Uniqueness

For any batch of generated tokens, all tokens SHALL be distinct.

```
∀ tokens = [generateToken() for _ in 1..100]: |Set(tokens)| = |tokens|
```

**Validates: Requirements 3.2**

**Tested by:** Property-based test generating batches and verifying no duplicates.

### Property 4: Session Expiration Correctness

For any session created at time T, the session SHALL be considered expired for any access time > T + 3600000ms, and active for any access time ≤ T + 3600000ms.

```
∀ T, accessTime: isExpired(session(T), accessTime) ⟺ accessTime > T + 3600000
```

**Validates: Requirements 3.2, 3.5**

**Tested by:** Property-based test with random creation times and access times.

### Property 5: Unanswered Question Count

For any set of answers and total question count, the number of unanswered questions SHALL equal total minus the number of answered questions.

```
∀ answers, total: unansweredCount(answers, total) = total - |answers|
```

**Validates: Requirements 4.5**

**Tested by:** Property-based test with random answer maps and question counts.

### Property 6: Score Calculation Correctness

For any set of user answers and correct answers, the score SHALL equal the count of matching entries.

```
∀ userAnswers, correctAnswers: score = |{i : userAnswers[i] = correctAnswers[i]}|
```

**Validates: Requirements 2.6, 3.7**

**Tested by:** Property-based test with random answer sets.

## Testing Strategy

- **Property-based tests** (using `fast-check` + `vitest`): Timer duration calculation, formatTime round-trip, token uniqueness, session expiration logic, unanswered count, score calculation
- **Component tests**: MCQCardUI mode behavior verification, ExamTimer countdown accuracy, ExamModeView state transitions
- **Integration tests**: Share link creation flow, shared quiz view load and submit flow, expired link handling
- **Manual E2E test**: Full flow from quiz generation → exam mode → share → take shared quiz → view results

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/quiz/MCQCardUI.tsx` | Create | Reusable MCQ card component |
| `src/components/quiz/ExamTimer.tsx` | Create | Countdown timer component |
| `src/components/quiz/ExamModeView.tsx` | Create | In-tab exam mode wrapper |
| `src/components/quiz/SharedQuizView.tsx` | Create | New shared quiz page component |
| `src/components/StudyAssistant.jsx` | Modify | Replace inline MCQ cards with MCQCardUI, add Exam Mode button, rename Start Test to Share with Friends |
| `src/components/test/SetupForm.tsx` | Modify | Remove duration input, auto-calculate duration |
| `src/app/test/[token]/page.tsx` | Modify | Use SharedQuizView instead of TestRunner |
| `src/app/api/test-session/[token]/route.ts` | Modify | Return question data for unified UI |
| `src/app/api/test-attempt/[attemptId]/submit/route.ts` | Modify | Return full quiz data in response |
