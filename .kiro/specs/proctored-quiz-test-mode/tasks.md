# Implementation Plan: Proctored Quiz Test Mode

## Overview

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

This plan follows a bottom-up order: persistence → pure logic → services → API routes → client primitives → pages → wiring. Property tests are placed close to their implementations and reference design Properties 1–16. The implementation language is TypeScript on Next.js 16 (App Router) with Prisma + SQLite, NextAuth v5, and `fast-check` + `vitest` for testing.

## Tasks

- [ ] 1. Add Prisma schema and run migration
  - [ ] 1.1 Add `TestSession` and `TestAttempt` models in `prisma/schema.prisma` and run migration
    - Add `TestSession { id, token@unique, quizId, ownerUserId, durationSeconds, status, expiresAt, createdAt, updatedAt, attempts }` with indexes `[quizId]`, `[ownerUserId]`, `[status, expiresAt]`
    - Add `TestAttempt { id, testSessionId, quizId, takerIdentifier, userId?, status, reason?, score?, percentage?, answers (default "{}"), startedAt, elapsedSeconds?, submittedAt?, createdAt }` with indexes `[testSessionId, takerIdentifier]` and `[testSessionId, status]`
    - Add cascade-delete relations `Quiz → TestSession → TestAttempt` and `User → TestSession (OwnedTestSessions)`, plus `User → TestAttempt (TestAttemptsByUser)` with `onDelete: SetNull`
    - Add back-relations on `Quiz` (`testSessions`, `testAttempts`) and `User` (`testSessions`, `testAttemptsAsUser`)
    - Run `$env:DATABASE_URL = "file:./dev.db"; npx prisma migrate dev --name add_test_mode`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [ ] 2. Shared types and Zod schemas
  - [ ] 2.1 Create `src/lib/test/types.ts` with shared types
    - `ViolationReason = 'tab_hidden' | 'window_blur' | 'fullscreen_exited' | 'app_backgrounded' | 'right_click' | 'clipboard_use'`
    - `SubmitReason = 'user_submitted' | 'time_expired' | ViolationReason`
    - `AttemptStatus = 'in_progress' | 'submitted' | 'disqualified'`
    - `SessionStatus = 'active' | 'expired'`
    - `AttemptResultPayload` (matching design wire shape with conditional `correctAnswer`/`explanation`)
    - `RunnerQuestion = { id, question, options }` (no `correctAnswer`/`explanation`)
    - _Requirements: 4.7, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 9.1, 14.4, 14.5_

  - [ ] 2.2 Create `src/lib/test/schemas.ts` with Zod validators
    - `validateDurationMinutes(value)` accepting integers in `[1, 240]`
    - `durationSecondsSchema` accepting integers in `[60, 14400]`
    - `createSessionRequestSchema` (`{ quizId: string.min(1), durationSeconds: int.min(60).max(14400) }`)
    - `answersUpdateSchema` (`{ answers: Record<string, string> }`)
    - `submitRequestSchema` (`{ answers, status: 'submitted'|'disqualified', reason: enum(SubmitReason) }`)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.1, 9.1_

  - [ ]* 2.3 Write property test for Duration validation
    - **Property 3: Duration validation and persistence**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    - File: `src/lib/test/__tests__/schemas.property.test.ts` using `fast-check` (≥100 runs)

- [ ] 3. Pure modules (token, taker-identifier, timer, score, classify-event, answers-reducer)
  - [ ] 3.1 Implement Token generator in `src/lib/test/token.ts`
    - `generateToken()` using `crypto.randomBytes(32).toString('base64url')`
    - _Requirements: 3.1, 3.4, 3.6_

  - [ ]* 3.2 Write property test for Token generator
    - **Property 1: Token generator — entropy, URL-safety, and distinctness**
    - **Validates: Requirements 3.1, 3.4, 3.6**
    - File: `src/lib/test/__tests__/token.property.test.ts`

  - [ ] 3.3 Implement Taker_Identifier hashing in `src/lib/test/taker-identifier.ts`
    - `computeTakerIdentifier({ ip, fingerprintCookie, userId })` returning lowercase hex of `sha256(ip + '|' + fp + '|' + (userId ?? ''))`
    - _Requirements: 4.4, 10.5_

  - [ ] 3.4 Implement Timer math in `src/lib/test/timer.ts`
    - `computeRemaining(durationSeconds, startedAtMs, nowMs) = max(0, durationSeconds - (nowMs - startedAtMs)/1000)`
    - _Requirements: 6.1, 6.3_

  - [ ]* 3.5 Write property test for Timer math
    - **Property 6: Timer monotonicity and server-authoritative remaining**
    - **Validates: Requirements 6.1, 6.3**
    - File: `src/lib/test/__tests__/timer.property.test.ts`

  - [ ] 3.6 Implement Score computation in `src/lib/test/score.ts`
    - `computeScore(answers, questions) → { score, percentage }` where `percentage = Math.round((score/n)*1000)/10`
    - Treat unanswered questions as 0; pure and deterministic
    - _Requirements: 8.4, 9.2_

  - [ ]* 3.7 Write property test for Score computation
    - **Property 12: Score computation correctness**
    - **Validates: Requirements 8.4, 9.2**
    - File: `src/lib/test/__tests__/score.property.test.ts`

  - [ ] 3.8 Implement event classifier in `src/lib/test/classify-event.ts`
    - `classifyEvent(eventType, snapshot) → ViolationReason | null` (total, pure)
    - Maps `visibilitychange` (hidden), `blur` (no focus), `pagehide`, `fullscreenchange` (exit while in_progress), `contextmenu`, `copy`/`cut`/`paste`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 3.9 Write property test for event classifier
    - **Property 10: Proctoring classification is total and pure**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**
    - File: `src/lib/test/__tests__/proctoring.property.test.ts`

  - [ ] 3.10 Implement answers reducer in `src/lib/test/answers-reducer.ts`
    - `applySelectOption(map, questionId, option)` — last-write-wins, returns new immutable map
    - _Requirements: 5.3_

  - [ ]* 3.11 Write property test for answers reducer
    - **Property 15: Single-selection invariant for the answer reducer**
    - **Validates: Requirements 5.3**
    - File: `src/lib/test/__tests__/answers-reducer.property.test.ts`

- [ ] 4. Checkpoint - pure modules
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npx vitest --run` and verify pure-module property tests pass.

- [ ] 5. Service modules (session-service, attempt-service, request-context)
  - [ ] 5.1 Implement Session_Service in `src/lib/test/session-service.ts`
    - `createSession({ quizId, ownerUserId, durationSeconds, now })` → persists row with `expiresAt = now + 3600s`, `status='active'`
    - `getSessionByToken(token, now)` returning `{ kind: 'not_found' | 'expired' | 'active', session? }` with lazy `expired` transition when `now > expiresAt`
    - `startOrResumeAttempt({ token, takerIdentifier, userId, now })` returning resume vs new attempt; rejects on expired session
    - `serializeQuestionsForRunner(question)` whitelisting `{ id, question, options }` (drops `correctAnswer`/`explanation`)
    - `getAttemptsForOwner(testSessionId)` for the leaderboard route
    - Re-export `generateToken` and `computeTakerIdentifier` for routes that need them
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 9.5, 11.2, 11.3, 11.4, 12.1, 12.5_

  - [ ]* 5.2 Write property test for `createSession`
    - **Property 2: createSession round-trip and response safety**
    - **Validates: Requirements 3.2, 3.3, 3.5**
    - File: `src/lib/test/__tests__/session-service.property.test.ts` (uses per-test SQLite)

  - [ ]* 5.3 Write property test for `startOrResumeAttempt`
    - **Property 4: Single-attempt-per-taker-per-session deterministic resume**
    - **Validates: Requirements 4.4, 4.5, 4.6, 4.8, 9.5, 11.2, 12.1, 12.3**
    - File: `src/lib/test/__tests__/session-service.property.test.ts`

  - [ ]* 5.4 Write property test for `serializeQuestionsForRunner`
    - **Property 5: In-progress response omits answer keys**
    - **Validates: Requirements 4.7**
    - File: `src/lib/test/__tests__/session-service.property.test.ts`

  - [ ]* 5.5 Write property test for `getSessionByToken` expiry
    - **Property 16: Session expiry rule**
    - **Validates: Requirements 4.3, 11.3**
    - File: `src/lib/test/__tests__/session-service.property.test.ts`

  - [ ] 5.6 Implement Attempt_Service in `src/lib/test/attempt-service.ts`
    - `saveAnswers({ attemptId, takerIdentifier, partialAnswers, now })` — Taker_Identifier check, merge JSON answers, returns `ok | gone | forbidden`
    - `submitAttempt({ attemptId, takerIdentifier, status, reason, answers, now })` — terminal absorption (returns `gone`), time-expired override when `elapsed > duration + 5s`, computes score/percentage via `computeScore`, persists `submittedAt`/`elapsedSeconds`
    - `getAttemptForViewer({ attemptId, takerIdentifier, viewerUserId })` — auth check (taker match OR Quiz_Owner), returns `AttemptResultPayload`; omits `correctAnswer`/`explanation` when `status === 'in_progress'`
    - _Requirements: 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.6, 9.1, 9.2, 9.3, 9.4, 10.2, 10.3, 10.5, 10.6, 11.5, 12.4_

  - [ ]* 5.7 Write property test for submit acceptance and time-expired override
    - **Property 7: Submit acceptance and time-expired reason override**
    - **Validates: Requirements 6.4, 6.5, 9.1, 11.5, 12.4**
    - File: `src/lib/test/__tests__/attempt-service.property.test.ts`

  - [ ]* 5.8 Write property test for terminal absorption
    - **Property 8: Terminal absorption**
    - **Validates: Requirements 8.3, 9.4, 11.4**
    - File: `src/lib/test/__tests__/attempt-service.property.test.ts`

  - [ ]* 5.9 Write property test for per-Attempt independence
    - **Property 9: Per-Attempt independence**
    - **Validates: Requirements 6.6, 8.6, 11.1**
    - File: `src/lib/test/__tests__/attempt-service.property.test.ts`

  - [ ]* 5.10 Write property test for disqualification persistence
    - **Property 11: Disqualification persistence**
    - **Validates: Requirements 8.1, 8.2**
    - File: `src/lib/test/__tests__/attempt-service.property.test.ts`

  - [ ]* 5.11 Write property test for persistence round-trip
    - **Property 13: Persistence round-trip for submitted attempt**
    - **Validates: Requirements 9.3, 10.2, 10.3**
    - File: `src/lib/test/__tests__/attempt-service.property.test.ts`

  - [ ]* 5.12 Write property test for Result_View authorization
    - **Property 14: Result_View authorization**
    - **Validates: Requirements 10.5, 10.6**
    - File: `src/lib/test/__tests__/auth.property.test.ts`

  - [ ] 5.13 Implement request context helper in `src/lib/test/request-context.ts`
    - `getRequestIp(headers)` reading `x-forwarded-for` / `x-real-ip` chain
    - `readOrMintFingerprint(cookies)` returning the existing `sb_fp` cookie or minting a 32-byte base64url value with `httpOnly`, `sameSite='lax'`, `path='/test'`, `secure` in production, `maxAge: 24h`
    - _Requirements: 4.4, 4.8_

- [ ] 6. Checkpoint - services
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npx vitest --run` and verify all service property tests pass against the per-test SQLite DB.

- [ ] 7. API routes (six endpoints)
  - [ ] 7.1 Implement `POST /api/test-session` in `src/app/api/test-session/route.ts`
    - Require NextAuth session (401), verify caller owns Quiz (403), Zod-validate body (400)
    - Call `createSession`, return `{ token, testLink: '/test/{token}', expiresAt, durationSeconds }` with HTTP 201
    - Never include `correctAnswer` in the response
    - _Requirements: 1.3, 1.4, 2.5, 3.1, 3.2, 3.3, 3.5, 3.6_

  - [ ] 7.2 Implement `GET /api/test-session/[token]` in `src/app/api/test-session/[token]/route.ts`
    - Read/mint `sb_fp` cookie via request-context helper, compute Taker_Identifier
    - Call `getSessionByToken`; respond 404 / 410 / continue
    - On `active`: call `startOrResumeAttempt`, load questions via `serializeQuestionsForRunner`
    - Return `{ session: { durationSeconds, status, expiresAt }, attempt: { id, startedAt, status }, questions, savedAnswers, isResume }`
    - Allow anonymous callers
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 11.4, 12.1, 12.5_

  - [ ] 7.3 Implement `GET /api/test-session/[token]/attempts` in `src/app/api/test-session/[token]/attempts/route.ts`
    - Owner-only (403 otherwise), return list of attempts sorted by `submittedAt` desc for the owner leaderboard
    - _Requirements: 10.5_

  - [ ] 7.4 Implement `POST /api/test-attempt/[attemptId]/answers` in `src/app/api/test-attempt/[attemptId]/answers/route.ts`
    - Resolve Taker_Identifier from cookie + IP + optional userId
    - Zod-validate body; call `saveAnswers` and map `gone` → 410, `forbidden` → 403
    - _Requirements: 8.3, 9.4, 12.2_

  - [ ] 7.5 Implement `POST /api/test-attempt/[attemptId]/submit` in `src/app/api/test-attempt/[attemptId]/submit/route.ts`
    - Resolve Taker_Identifier; Zod-validate body
    - Call `submitAttempt`; return final attempt summary with `score`, `percentage`, `elapsedSeconds`, `status`, `reason`
    - Map `gone` → 410, `forbidden` → 403
    - _Requirements: 6.4, 6.5, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 11.5, 12.4_

  - [ ] 7.6 Implement `GET /api/test-attempt/[attemptId]` in `src/app/api/test-attempt/[attemptId]/route.ts`
    - Resolve Taker_Identifier; read NextAuth session; call `getAttemptForViewer`
    - Map `forbidden` → 403, `not_found` → 404; return `AttemptResultPayload`
    - For terminal attempts, include `correctAnswer` and `explanation`; otherwise omit
    - _Requirements: 4.7, 10.2, 10.3, 10.5, 10.6_

  - [ ]* 7.7 Write integration tests for the six API routes
    - One example per status code per route (200/201, 400, 401, 403, 404, 410) using a temporary SQLite DB
    - Includes uniqueness check on `TestSession.token` (Prisma `P2002`)
    - File: `src/app/api/test-session/__tests__/routes.integration.test.ts` and `src/app/api/test-attempt/__tests__/routes.integration.test.ts`
    - _Requirements: 1.3, 1.4, 3.1, 3.4, 4.1, 4.2, 4.3, 4.7, 8.3, 9.4, 10.5, 10.6, 11.4, 14.1, 14.2_

- [ ] 8. Checkpoint - API routes
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` to confirm typecheck passes; run `npx vitest --run`.

- [ ] 9. Test-Runner chrome-free layout
  - [ ] 9.1 Create `src/app/test/[token]/layout.tsx`
    - Minimal layout that does NOT include the global `StudyAssistant` chrome (header/sidebar/footer)
    - Provide a top-level container with `data-test-runner-root` so click-interception logic can target it
    - _Requirements: 5.5, 5.6_

- [ ] 10. Client proctoring components
  - [ ] 10.1 Create `src/components/test/TimerDisplay.tsx`
    - Props: `{ startedAt, durationSeconds, onExpire }`
    - Uses `setInterval(_, 500)`; rounds display to whole seconds; calls `onExpire` exactly once when remaining ≤ 0
    - Uses `computeRemaining` from `src/lib/test/timer.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 10.2 Write render test for `TimerDisplay`
    - Use vitest fake timers to verify update cadence and single `onExpire` call
    - File: `src/components/test/__tests__/TimerDisplay.test.tsx`
    - _Requirements: 6.2_

  - [ ] 10.3 Create `src/components/test/ProctoringClient.tsx`
    - Props: `{ attemptId, containerRef, onViolation }`
    - Registers `visibilitychange`/`blur`/`pagehide`/`fullscreenchange` on document/window and `contextmenu`/`copy`/`cut`/`paste` on the test container
    - Calls `classifyEvent` from `src/lib/test/classify-event.ts`; on first non-null violation, calls `onViolation(reason)` exactly once via `hasViolatedRef`
    - `preventDefault` on `contextmenu`/`copy`/`cut`/`paste`
    - Cleans up listeners on unmount
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1_

  - [ ]* 10.4 Write render test for `ProctoringClient`
    - Verify single-fire on multiple consecutive violation events; verify `preventDefault` on contextmenu and clipboard events
    - File: `src/components/test/__tests__/ProctoringClient.test.tsx`
    - _Requirements: 7.1, 7.6, 7.7_

- [ ] 11. Test_Runner page
  - [ ] 11.1 Create `src/app/test/[token]/page.tsx` server shell + `src/components/test/TestRunner.tsx` client component
    - Server shell renders `<TestRunner token={token} />` with no global chrome
    - State machine: `Loading → (Notice for mobile UA) → RequestFullscreen → InProgress → Submitting → Result-redirect`, plus `Invalid` (404) and `Expired` (410)
    - Calls `GET /api/test-session/[token]` on mount; handles 404 (invalid link), 410 (expired link), 200 (start or resume)
    - On mobile UA (`/Android|iPhone|iPad|iPod|Mobile/i`), show pre-test notice screen before transitioning to `InProgress`
    - Fullscreen fallback: skip request when `typeof document.documentElement.requestFullscreen !== 'function'` and continue with all other proctoring active
    - In-app navigation interception: capture-phase click handler on the layout container that calls `preventDefault` for in-app `<a>` clicks while `InProgress`
    - Renders current question, index/total, options, Prev/Next, Submit on last question, and `<TimerDisplay>`
    - Renders `<ProctoringClient>` as a sibling; on violation, stop timer and `POST /submit` with `status='disqualified'` and the violation reason, then route to Result_View
    - On answer change: debounce 250 ms then `POST /api/test-attempt/[attemptId]/answers` with `keepalive: true` AND mirror to `localStorage` keyed by `(token, takerIdentifier)`; retry with backoff 250/500/1000 ms
    - On reload/resume: restore answers from server-provided `savedAnswers`; if server-computed remaining ≤ 0 then immediately `POST /submit` with `reason='time_expired'`
    - On Submit click: `POST /submit` with `status='submitted'`, `reason='user_submitted'`; route to `/test/[token]/result/[attemptId]`
    - On timer expiry: auto-submit with `reason='time_expired'`
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.6, 6.1, 6.2, 6.3, 6.4, 7.8, 8.1, 8.5, 9.1, 10.1, 12.1, 12.2, 12.3, 12.4, 12.5, 13.3, 13.4, 13.5_

  - [ ]* 11.2 Write render tests for `TestRunner`
    - Mobile UA renders pre-test notice; non-mobile skips it
    - Fullscreen-API-missing path proceeds without throwing
    - Reload path with non-zero remaining time does NOT trigger a violation (Requirement 12.5)
    - File: `src/components/test/__tests__/TestRunner.test.tsx`
    - _Requirements: 7.8, 12.5, 13.3, 13.5_

- [ ] 12. Checkpoint - test runner
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` and `npx vitest --run`.

- [ ] 13. Setup_Form
  - [ ] 13.1 Create `src/components/test/SetupForm.tsx`
    - Props: `{ quizId, mcqCount, onCreated }`
    - Pre-fill Duration input with `mcqCount` minutes; client-side validate `[1, 240]` integers via `validateDurationMinutes`
    - On submit: `POST /api/test-session` with `{ quizId, durationSeconds: minutes * 60 }`
    - Surface 401 ("Please sign in"), 403 ("You don't own this quiz"), and validation errors inline
    - On 201: display the returned Test_Link with copy-to-clipboard button
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.3_

  - [ ]* 13.2 Write render tests for `SetupForm`
    - Out-of-range duration shows validation message; valid submit calls API and renders link
    - File: `src/components/test/__tests__/SetupForm.test.tsx`
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4_

- [ ] 14. Result_View and owner leaderboard
  - [ ] 14.1 Create `src/app/test/[token]/result/[attemptId]/page.tsx` and `src/components/test/ResultView.tsx`
    - Server component fetches the result via `getAttemptForViewer` (server-side using request cookies), passing the resolved Taker_Identifier and viewer userId
    - Renders `<ResultView />` with score `X / MCQ_Count`, percentage to one decimal place, elapsed time, status badge
    - Renders each question card with the Test_Examinee's selected option, the correct option, and the explanation
    - Renders a disqualification banner with the reason when `status === 'disqualified'`
    - When the viewer is the Quiz_Owner (`isOwnerView === true`), additionally fetches `/api/test-session/[token]/attempts` and renders a leaderboard table sorted by `submittedAt` desc
    - On 403, render a 403 fallback page (no `correctAnswer` leaked)
    - _Requirements: 8.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 14.2 Write render tests for `ResultView`
    - Disqualification banner rendered for disqualified status with reason
    - Owner view renders leaderboard; non-owner view does not
    - File: `src/components/test/__tests__/ResultView.test.tsx`
    - _Requirements: 8.5, 10.4, 10.5_

- [ ] 15. Wire Start Test entry point into the existing Quiz view
  - [ ] 15.1 Add a "Start Test" control to the existing Quiz view component that opens `<SetupForm>` in a modal
    - Show the control only when the viewer is the authenticated Quiz_Owner AND the Quiz has at least one `QuizQuestion`
    - Hide for unauthenticated viewers and for non-owners
    - Pass `quizId` and `mcqCount` to `SetupForm`; on `onCreated(link)`, display the link with copy-to-clipboard
    - Do NOT modify `/mcq/[id]` or its components
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 16. Final checkpoint - integration
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npm run build` and `npx vitest --run` to verify all property, unit, and integration tests pass and the project type-checks.

## Notes

- Tasks marked with `*` are optional test sub-tasks and may be skipped for a faster MVP; core implementation sub-tasks must always be implemented.
- Each task references specific requirements for traceability.
- All 16 correctness properties from the design are covered exactly once and annotated with their property number and requirement clauses.
- Property tests use `fast-check` with at least 100 runs, in line with the design's testing strategy.
- Service-level property tests use a per-test SQLite file created in `beforeEach` and dropped in `afterEach`.
- The Prisma migration command for Windows PowerShell sets `DATABASE_URL` inline, per project conventions.
- The `/mcq/[id]` practice flow is preserved unchanged.
- The `sb_fp` fingerprint cookie is minted on the first `GET /api/test-session/[token]` and used by all `POST /api/test-attempt/...` routes for Taker_Identifier verification.
- The mobile UA notice and Fullscreen-API fallback are exercised in the `TestRunner` render tests.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1", "3.3", "3.4", "3.6", "3.8", "3.10"] },
    { "id": 3, "tasks": ["3.2", "3.5", "3.7", "3.9", "3.11"] },
    { "id": 4, "tasks": ["5.1", "5.6", "5.13", "9.1", "10.1", "10.3"] },
    { "id": 5, "tasks": ["5.2", "5.7", "5.12", "10.2", "10.4"] },
    { "id": 6, "tasks": ["5.3", "5.8"] },
    { "id": 7, "tasks": ["5.4", "5.9"] },
    { "id": 8, "tasks": ["5.5", "5.10"] },
    { "id": 9, "tasks": ["5.11"] },
    { "id": 10, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 11, "tasks": ["7.7"] },
    { "id": 12, "tasks": ["11.1"] },
    { "id": 13, "tasks": ["11.2"] },
    { "id": 14, "tasks": ["13.1", "14.1"] },
    { "id": 15, "tasks": ["13.2", "14.2"] },
    { "id": 16, "tasks": ["15.1"] }
  ]
}
```
