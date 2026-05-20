# Requirements Document

## Introduction

The Proctored Quiz Test Mode feature adds a timed, anti-cheating "Test Mode" to existing Study Buddy quizzes. From a generated or saved quiz, the Quiz_Owner can launch a Test_Link by configuring a duration and generating a tokenized URL (Test_Link). The Test_Link can be opened by **any visitor** (anonymous or authenticated) and the same link supports **multiple independent Attempts** — each Test_Examinee gets their own countdown Timer that starts when they personally open the link. When the link is opened, the Test_Runner enters a full-screen, distraction-locked UI that runs the Timer and continuously monitors for proctoring violations such as tab switches, window blur, visibility changes, right-click, and copy/paste. On any violation the Test_Runner immediately ends the Attempt as Disqualified and submits the current answers. On Timer expiry the Test_Runner auto-submits. Completed Attempts are persisted via the Attempt_Service and a Result_View shows score, grade, correct answers, explanations, and disqualification reason (if any). The feature must work on both desktop and mobile browsers. The existing `/mcq/[id]` practice flow remains unchanged and is not subject to proctoring.

## Glossary

- **Quiz**: An existing record from the Quiz model in `prisma/schema.prisma`, identified by `quizId`, containing one or more QuizQuestion rows with `question`, `options`, `correctAnswer`, and `explanation`.
- **MCQ_Count**: The number of QuizQuestion rows associated with a Quiz.
- **Quiz_Owner**: An authenticated User who owns a Quiz (Quiz.userId equals the User.id) and is permitted to create a Test_Link for that Quiz.
- **Test_Link**: A tokenized, multi-use redirect URL of the form `/test/[token]` issued by the Session_Service that resolves to a Test_Session.
- **Test_Examinee**: Any human person (authenticated or anonymous) who consumes a Test_Link and takes the test in their browser. Multiple Test_Examinees may use the same Test_Link concurrently or sequentially before the Test_Link expires.
- **Test_Session**: A backend record representing one configured Test_Link, associated with a Quiz, a Duration, an issued Token, an `expiresAt` timestamp, and a `status` of one of `active` or `expired`. A Test_Session is a "test definition" that can spawn multiple Attempts.
- **Test_Attempt**: A backend record representing one specific Test_Examinee's run of a Test_Link. Each Test_Attempt has its own `startedAt`, `status`, answers, and elapsed time. Multiple Test_Attempts may exist for the same Test_Session.
- **Taker_Identifier**: An identifier used to associate Test_Attempts with a specific Test_Examinee for the purpose of preventing duplicate concurrent Attempts and resuming on reload. The Taker_Identifier is derived from the requester's IP address combined with a SHA-256 hash and a per-attempt browser fingerprint cookie. Authenticated requesters additionally include their `userId`.
- **Token**: An opaque, URL-safe, cryptographically random string of at least 32 bytes of entropy that identifies exactly one Test_Session.
- **Duration**: An integer number of seconds for which the Timer counts down, between 60 and 14400 inclusive (1 minute to 4 hours).
- **Default_Duration**: The Duration computed as `MCQ_Count * 60` seconds when the Quiz_Owner does not override it.
- **Timer**: The countdown component running in the Test_Runner UI that decrements from Duration to zero, computed per-Attempt.
- **Test_Runner**: The client-side component (page at `/test/[token]`) that renders the locked test UI, runs the Timer, presents MCQs, captures answers, and detects proctoring violations.
- **Proctoring_Violation**: Any of the following client-detected events while the Test_Runner is active: (a) the page's `document.visibilityState` becomes `hidden`, (b) the window receives a `blur` event, (c) the user exits browser fullscreen mode, (d) on mobile, the app is backgrounded as evidenced by `visibilitychange` to `hidden` or `pagehide`, (e) a `contextmenu` (right-click) event fires on the test container, (f) a `copy`, `cut`, or `paste` event fires on the test container.
- **Disqualified**: A terminal Test_Attempt status indicating the Attempt ended due to a Proctoring_Violation.
- **Session_Service**: The backend service responsible for creating Test_Sessions, issuing Tokens, validating Test_Links, and enforcing expiry semantics on the Test_Session.
- **Attempt_Service**: The backend service responsible for creating Test_Attempts, accepting answer submissions, and persisting Test_Attempt records.
- **Result_View**: The screen displayed after a Test_Attempt ends, showing score, grade, per-question correctness, explanations, and disqualification reason if applicable.
- **Setup_Form**: The UI surface where the Quiz_Owner configures Duration and creates a Test_Link.

## Requirements

### Requirement 1: Start Test entry point on a Quiz

**User Story:** As a Quiz_Owner, I want a "Start Test" action on a generated or saved quiz, so that I can create a proctored test link separate from practice mode.

#### Acceptance Criteria

1. WHERE a Quiz has at least one QuizQuestion, THE Study_Buddy_UI SHALL display a "Start Test" control on the Quiz's view.
2. WHEN the Quiz_Owner activates the "Start Test" control, THE Study_Buddy_UI SHALL open the Setup_Form for that Quiz.
3. IF the requesting user is not authenticated, THEN THE Study_Buddy_UI SHALL hide the "Start Test" control and THE Session_Service SHALL reject any direct API request to create a Test_Session with HTTP 401.
4. IF the requesting user is authenticated but is not the Quiz_Owner of the requested Quiz, THEN THE Session_Service SHALL reject the request to create a Test_Session with HTTP 403.
5. THE Study_Buddy_UI SHALL preserve the existing `/mcq/[id]` practice route and its behavior unchanged.

### Requirement 2: Configure test duration

**User Story:** As a Quiz_Owner, I want the test duration to default to one minute per MCQ but allow me to override it, so that I can match the test length to the difficulty.

#### Acceptance Criteria

1. WHEN the Setup_Form opens for a Quiz, THE Setup_Form SHALL pre-fill the Duration input with `MCQ_Count * 60` seconds expressed in minutes.
2. THE Setup_Form SHALL accept a Duration override expressed in whole minutes between 1 and 240 inclusive.
3. IF the Quiz_Owner submits a Duration outside the range 1 to 240 minutes, THEN THE Setup_Form SHALL reject the submission and display a validation message identifying the allowed range.
4. IF the Quiz_Owner submits a non-integer or non-numeric Duration, THEN THE Setup_Form SHALL reject the submission and display a validation message identifying the required format.
5. WHEN the Quiz_Owner submits a valid Duration, THE Session_Service SHALL persist the Duration on the Test_Session in seconds.

### Requirement 3: Issue tokenized Test_Link

**User Story:** As a Quiz_Owner, I want the backend to create a temporary tokenized link when I start a test, so that I can share the link and any visitor can take the test.

#### Acceptance Criteria

1. WHEN the Session_Service receives a valid create-session request, THE Session_Service SHALL generate a Token with at least 32 bytes of cryptographically secure random entropy encoded as URL-safe text.
2. THE Session_Service SHALL persist a Test_Session record containing the Token, the associated `quizId`, the requesting Quiz_Owner's `userId`, the Duration in seconds, an `expiresAt` timestamp set to creation time plus 60 minutes, a `status` of `active`, and a `createdAt` timestamp.
3. THE Session_Service SHALL return a Test_Link of the form `/test/{token}` to the Quiz_Owner in the create-session response.
4. THE Session_Service SHALL ensure each Token maps to exactly one Test_Session by enforcing a uniqueness constraint on the Token column.
5. WHEN a create-session request is processed, THE Session_Service SHALL NOT include the Quiz's `correctAnswer` values in the response.
6. WHERE a Quiz_Owner requests multiple Test_Sessions for the same Quiz, THE Session_Service SHALL issue distinct Tokens for each request.

### Requirement 4: Validate Test_Link on entry and start a per-Examinee Attempt

**User Story:** As any Test_Examinee, I want to open the Test_Link and start my own attempt with my own timer, so that multiple people can take the same test independently.

#### Acceptance Criteria

1. WHEN the Test_Runner loads `/test/{token}`, THE Session_Service SHALL look up the Test_Session by Token.
2. IF no Test_Session matches the Token, THEN THE Session_Service SHALL respond with HTTP 404 and THE Test_Runner SHALL display an "Invalid test link" message.
3. IF the current server time is after the Test_Session's `expiresAt`, THEN THE Session_Service SHALL transition the Test_Session `status` to `expired` if not already, and respond with HTTP 410, AND THE Test_Runner SHALL display a "This test link has expired" message.
4. WHEN the Test_Runner requests to start an Attempt for an `active` Test_Session, THE Session_Service SHALL compute the requester's Taker_Identifier and look for an existing `in_progress` Test_Attempt for the same `(token, takerIdentifier)` pair.
5. IF an `in_progress` Test_Attempt exists for the same `(token, takerIdentifier)` pair, THEN THE Session_Service SHALL return that existing Test_Attempt (resume case) including its original `startedAt`, the Quiz questions with their `options`, and the Attempt's persisted answers.
6. IF no `in_progress` Test_Attempt exists for the same `(token, takerIdentifier)` pair, THEN THE Attempt_Service SHALL create a new Test_Attempt with `status` of `in_progress`, a `startedAt` timestamp equal to the current server time, an empty answers map, and shall return that Test_Attempt along with the Quiz questions with their `options`.
7. THE Session_Service SHALL NOT include `correctAnswer` or `explanation` fields in the questions returned for an `in_progress` Attempt.
8. THE Session_Service SHALL allow anonymous (unauthenticated) requesters to start a Test_Attempt provided the Test_Session is `active`.

### Requirement 5: Render locked Test_Runner UI

**User Story:** As a Test_Examinee, I want the test UI to be presented in a locked, distraction-free layout, so that I focus on the test and proctoring is enforced consistently.

#### Acceptance Criteria

1. WHEN the Test_Runner enters `in_progress` state, THE Test_Runner SHALL request browser fullscreen on the test container element.
2. THE Test_Runner SHALL display the current question, the question index, the total MCQ_Count, the remaining Timer value, and the answer options for the current question.
3. THE Test_Runner SHALL allow the Test_Examinee to select exactly one option per question and to navigate between questions using "Previous" and "Next" controls.
4. THE Test_Runner SHALL display a "Submit" control on the last question that finalizes the Attempt when activated.
5. THE Test_Runner SHALL hide site-wide navigation chrome (header links, sidebar, footer) for the duration of the Test_Attempt.
6. WHILE a Test_Attempt is `in_progress`, THE Test_Runner SHALL prevent navigation away from the test page via in-app links by intercepting click events on those links.

### Requirement 6: Per-Attempt Timer countdown and auto-submit

**User Story:** As a Test_Examinee, I want a visible countdown timer that starts when I open the link and auto-submits when it reaches zero, so that my test is bounded by my own personal Duration window.

#### Acceptance Criteria

1. WHEN the Session_Service returns an `in_progress` Test_Attempt to the Test_Runner, THE Test_Runner SHALL start the Timer at `Duration - (now - startedAt)` seconds where `now` is the current client time and `startedAt` is the server-provided timestamp for that Attempt.
2. THE Test_Runner SHALL update the displayed Timer value at least once every 1000 milliseconds.
3. THE Test_Runner SHALL compute remaining time based on the server-provided `startedAt` of the Attempt and the current client time so that page reloads preserve elapsed time within a tolerance of 2 seconds.
4. WHEN the Timer reaches zero, THE Test_Runner SHALL submit the current answers to the Attempt_Service with status `submitted` and reason `time_expired`.
5. WHEN the Attempt_Service receives a submission for a Test_Attempt whose server-side elapsed time exceeds the Duration by more than 5 seconds, THE Attempt_Service SHALL accept the submission but record the Test_Attempt with reason `time_expired`.
6. THE Timer for one Test_Examinee's Test_Attempt SHALL be independent of any other Test_Examinee's Timer for the same Test_Session.

### Requirement 7: Detect Proctoring_Violations on desktop and mobile

**User Story:** As a Quiz_Owner, I want the test runner to detect tab switches, window blur, app backgrounding, right-click, and clipboard activity, so that the Test_Examinee cannot consult outside resources or copy questions without being disqualified.

#### Acceptance Criteria

1. WHILE a Test_Attempt is `in_progress`, THE Test_Runner SHALL register listeners for the `visibilitychange`, `blur`, `pagehide`, `fullscreenchange`, `contextmenu`, `copy`, `cut`, and `paste` events on the appropriate browser objects.
2. WHEN the `document.visibilityState` becomes `hidden`, THE Test_Runner SHALL classify the event as a Proctoring_Violation with reason `tab_hidden`.
3. WHEN the window receives a `blur` event and `document.hasFocus()` returns false, THE Test_Runner SHALL classify the event as a Proctoring_Violation with reason `window_blur`.
4. WHEN the document exits fullscreen and the Test_Attempt is still `in_progress`, THE Test_Runner SHALL classify the event as a Proctoring_Violation with reason `fullscreen_exited`.
5. WHEN a `pagehide` event fires on a mobile browser while the Test_Attempt is `in_progress`, THE Test_Runner SHALL classify the event as a Proctoring_Violation with reason `app_backgrounded`.
6. WHEN a `contextmenu` event fires on the test container, THE Test_Runner SHALL prevent the default browser context menu and classify the event as a Proctoring_Violation with reason `right_click`.
7. WHEN a `copy`, `cut`, or `paste` event fires on the test container, THE Test_Runner SHALL prevent the default action and classify the event as a Proctoring_Violation with reason `clipboard_use`.
8. WHERE the runtime user agent indicates a mobile device, THE Test_Runner SHALL display a pre-test notice listing the proctoring rules and the consequence of disqualification before transitioning to `in_progress`.

### Requirement 8: Disqualify on Proctoring_Violation

**User Story:** As a Quiz_Owner, I want any single proctoring violation to immediately end that Test_Attempt as disqualified, so that the integrity of the test is preserved.

#### Acceptance Criteria

1. WHEN the Test_Runner classifies an event as a Proctoring_Violation, THE Test_Runner SHALL stop the Timer and submit the current answers to the Attempt_Service with status `disqualified` and the corresponding reason.
2. WHEN the Attempt_Service receives a submission with status `disqualified`, THE Attempt_Service SHALL persist the Test_Attempt with status `disqualified`, the supplied reason, the elapsed time, and the answers received so far.
3. WHEN a Test_Attempt transitions to `disqualified`, THE Attempt_Service SHALL prevent any further submissions for that Test_Attempt by returning HTTP 410 to subsequent submission requests.
4. IF a Proctoring_Violation occurs before the Test_Examinee has answered any question, THEN THE Attempt_Service SHALL persist a Test_Attempt with zero answers and a score of zero.
5. WHEN the Test_Runner has submitted a `disqualified` Test_Attempt, THE Test_Runner SHALL display the Result_View with a clearly labeled disqualification banner and the reason.
6. THE disqualification of one Test_Examinee's Test_Attempt SHALL NOT affect any other Test_Examinee's Test_Attempt for the same Test_Session.

### Requirement 9: Submit completed Test_Attempt and compute score

**User Story:** As a Test_Examinee, I want my submission to be scored and saved, so that I can review my performance.

#### Acceptance Criteria

1. WHEN the Test_Examinee activates the "Submit" control, THE Test_Runner SHALL send the current answers to the Attempt_Service with status `submitted` and reason `user_submitted`.
2. WHEN the Attempt_Service receives a `submitted` Test_Attempt, THE Attempt_Service SHALL compare each answer against the QuizQuestion `correctAnswer` and compute a score equal to the count of correct answers and a percentage equal to `score / MCQ_Count * 100` rounded to one decimal place.
3. THE Attempt_Service SHALL persist the Test_Attempt with `quizId`, `testSessionId`, `takerIdentifier`, `userId` (nullable for anonymous takers), `status`, `reason`, `score`, `percentage`, `answers` (as a JSON string mapping `quizQuestionId` to selected option), `elapsedSeconds`, `createdAt`, and `submittedAt`.
4. THE Attempt_Service SHALL reject any submission for a Test_Attempt whose current `status` is not `in_progress` with HTTP 410.
5. THE Attempt_Service SHALL allow the same Taker_Identifier to start a new Test_Attempt for the same Test_Link only if the previous Test_Attempt for that Taker_Identifier is in a terminal state (`submitted`, `disqualified`, or `time_expired`) AND the Test_Session is still `active`.

### Requirement 10: Result_View after the test

**User Story:** As a Test_Examinee, I want to see my score, the correct answers, and explanations after the test ends, so that I can learn from the result.

#### Acceptance Criteria

1. WHEN a Test_Attempt has been persisted, THE Test_Runner SHALL navigate to the Result_View for that Test_Attempt.
2. THE Result_View SHALL display the score, the percentage, the elapsed time, and the Test_Attempt status.
3. THE Result_View SHALL display each question with the Test_Examinee's selected option, the correct option, and the explanation from the corresponding QuizQuestion.
4. WHERE the Test_Attempt status is `disqualified`, THE Result_View SHALL display a disqualification banner with the disqualification reason.
5. THE Result_View SHALL be accessible to the Test_Examinee whose Taker_Identifier matches the Test_Attempt's Taker_Identifier (verified via the same hashing scheme), AND ALSO to the Quiz_Owner that owns the Test_Session.
6. IF a different Taker_Identifier requests the Result_View for a Test_Attempt that is not theirs and is not the Quiz_Owner, THEN THE Attempt_Service SHALL respond with HTTP 403.

### Requirement 11: Multi-use Test_Link with per-Examinee independence

**User Story:** As a Quiz_Owner, I want the same test link to support multiple Test_Examinees independently so different students can take the test on their own time.

#### Acceptance Criteria

1. THE Test_Link SHALL allow concurrent Test_Attempts from distinct Taker_Identifiers up until the Test_Session's `expiresAt` is reached.
2. WHEN a Test_Examinee opens a Test_Link 10 minutes after another Test_Examinee, THE Session_Service SHALL create a new Test_Attempt with `startedAt` set to the second Test_Examinee's open time, independent of the first Test_Attempt.
3. THE Test_Session `status` SHALL transition to `expired` only when the current server time exceeds `expiresAt`, regardless of how many Test_Attempts have been created or completed.
4. WHILE the Test_Session `status` is `expired`, THE Session_Service SHALL reject any new Test_Attempt creation requests for that Token with HTTP 410.
5. WHILE the Test_Session `status` is `expired`, THE Attempt_Service SHALL still accept submissions for Test_Attempts that were already `in_progress` when expiry occurred, provided the Attempt's own elapsed time has not exceeded the Duration plus a 5-second tolerance.

### Requirement 12: Page reload and disconnect resilience

**User Story:** As a Test_Examinee, I want a brief network blip or accidental reload not to cost me my entire test, so that the rules disqualify me only for actual cheating events.

#### Acceptance Criteria

1. WHEN the Test_Runner mounts on `/test/{token}` and an `in_progress` Test_Attempt already exists for the requester's Taker_Identifier, THE Session_Service SHALL return that Test_Attempt's questions, persisted answers, and original `startedAt` so that the Test_Runner can resume.
2. THE Test_Runner SHALL persist the Test_Examinee's in-progress answers to the backend at least once per answered question via an answers-update endpoint, AND additionally persist them to local storage keyed by Token and Taker_Identifier as a client-side fallback.
3. WHEN the Test_Runner resumes after a reload, THE Test_Runner SHALL restore the persisted answers and recompute the remaining Timer value from the server-provided `startedAt` and Duration.
4. IF the server-computed remaining time is less than or equal to zero on resume, THEN THE Test_Runner SHALL submit the restored answers to the Attempt_Service with reason `time_expired`.
5. THE Session_Service SHALL NOT classify a page reload, by itself, as a Proctoring_Violation.

### Requirement 13: Cross-platform support

**User Story:** As a Test_Examinee on either desktop or mobile, I want the test mode to function on my device, so that I am not blocked from taking the test.

#### Acceptance Criteria

1. THE Test_Runner SHALL render and function on the latest two stable major versions of Chrome, Edge, Firefox, and Safari on desktop.
2. THE Test_Runner SHALL render and function on the latest two stable major versions of Chrome on Android and Safari on iOS.
3. WHERE the runtime browser does not support the Fullscreen API, THE Test_Runner SHALL continue without fullscreen and SHALL still enforce visibility, blur, pagehide, contextmenu, and clipboard based proctoring.
4. THE Test_Runner SHALL adapt the layout to viewport widths between 320 pixels and 1920 pixels without horizontal scrolling of the question text.
5. WHERE the device is identified as mobile via `navigator.userAgent`, THE Test_Runner SHALL display a notice that switching apps will result in disqualification before transitioning to `in_progress`.

### Requirement 14: Persistence schema for Test_Session and Test_Attempt

**User Story:** As a developer, I want clear backend models for Test_Session and Test_Attempt, so that the feature is implementable in Prisma alongside existing models.

#### Acceptance Criteria

1. THE Persistence_Layer SHALL define a `TestSession` model with fields `id`, `token` (unique), `quizId`, `ownerUserId`, `durationSeconds`, `status`, `expiresAt`, `createdAt`, and `updatedAt`.
2. THE Persistence_Layer SHALL define a `TestAttempt` model with fields `id`, `testSessionId`, `quizId`, `takerIdentifier`, `userId` (nullable), `status`, `reason` (nullable), `score` (nullable), `percentage` (nullable), `answers` (default empty JSON object), `startedAt`, `elapsedSeconds` (nullable), `submittedAt` (nullable), and `createdAt`.
3. THE Persistence_Layer SHALL relate `TestSession.quizId` to `Quiz.id` and `TestAttempt.testSessionId` to `TestSession.id` with cascade delete from Quiz to TestSession to TestAttempt.
4. THE Persistence_Layer SHALL constrain `TestSession.status` to one of `active` or `expired`.
5. THE Persistence_Layer SHALL constrain `TestAttempt.status` to one of `in_progress`, `submitted`, or `disqualified`.
6. THE Persistence_Layer SHALL apply a non-unique index on `TestAttempt(testSessionId, takerIdentifier)` to enable efficient resume-lookup.
