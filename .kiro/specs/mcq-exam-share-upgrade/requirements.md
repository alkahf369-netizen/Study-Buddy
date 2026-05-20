# Requirements Document

## Introduction

This feature upgrades the MCQ quiz system with three key improvements: (1) a unified card-based MCQ UI used consistently across both the quiz generation view and the shared quiz link view, (2) an in-tab exam mode that allows the quiz creator to take the exam immediately after generation without navigating away, and (3) a "Share with Friends" button that replaces the current "Start Test" button and generates a temporary 1-hour shareable link for other users to access the quiz.

## Glossary

- **Quiz_Generator**: The main StudyAssistant component that generates MCQ questions from user-provided text or files and displays them in a card-based scrollable layout
- **Exam_Mode**: An in-tab timed exam experience that starts automatically after MCQ generation, allowing the quiz creator to answer questions under time pressure without navigating to a different page
- **Share_Link_Service**: The backend service responsible for creating temporary shareable quiz links with a 1-hour expiration window
- **MCQ_Card_UI**: The unified card-based question display component featuring numbered questions (Q1, Q2...), a 2x2 option grid layout, green/red answer highlighting, and post-answer explanations
- **Shared_Quiz_View**: The page rendered when a user opens a shared temporary link, displaying the quiz using the same MCQ_Card_UI component
- **Timer_Component**: A countdown timer that starts automatically when exam mode begins and tracks remaining time
- **Quiz_Creator**: The authenticated user who generated the quiz and can take the exam in-tab or share it with others
- **Quiz_Taker**: Any user (authenticated or anonymous) who accesses the quiz via a temporary shared link

## Requirements

### Requirement 1: Unified MCQ Card UI Component

**User Story:** As a developer, I want a single reusable MCQ card UI component, so that the same visual experience is used across quiz generation, in-tab exam mode, and shared quiz views.

#### Acceptance Criteria

1. THE MCQ_Card_UI SHALL render each question as a card with a numbered badge (Q1, Q2, Q3...), the question text, and a 2x2 grid of options
2. WHEN a Quiz_Taker selects an option in practice mode, THE MCQ_Card_UI SHALL highlight the correct answer with a green border and background, and highlight an incorrect selection with a red border and background
3. WHEN a Quiz_Taker selects an option in practice mode, THE MCQ_Card_UI SHALL display the explanation text below the question card
4. WHILE the MCQ_Card_UI is in exam mode, THE MCQ_Card_UI SHALL allow option selection without revealing correct answers or explanations until submission
5. THE MCQ_Card_UI SHALL display all questions in a vertically scrollable list
6. THE MCQ_Card_UI SHALL render options in a responsive grid layout with 2 columns on screens wider than 640px and 1 column on smaller screens

### Requirement 2: In-Tab Exam Mode for Quiz Creator

**User Story:** As a Quiz_Creator, I want to take an exam immediately after MCQ generation in the same tab, so that I can test myself without navigating to a different page.

#### Acceptance Criteria

1. WHEN MCQ generation completes, THE Quiz_Generator SHALL display an "Exam Mode" button alongside the existing "New Quiz" and "Share with Friends" buttons
2. WHEN the Quiz_Creator clicks the "Exam Mode" button, THE Exam_Mode SHALL activate in the same tab, replacing the practice view with the exam view
3. WHEN Exam_Mode activates, THE Timer_Component SHALL start counting down automatically based on a default duration of 1 minute per question
4. WHILE Exam_Mode is active, THE MCQ_Card_UI SHALL operate in exam mode (no answer reveals, no explanations shown during the exam)
5. WHILE Exam_Mode is active, THE Timer_Component SHALL display the remaining time in MM:SS format at the top of the exam view
6. WHEN the Quiz_Creator clicks a "Submit" button, THE Exam_Mode SHALL end and display the results showing score, correct answers, and explanations for each question
7. WHEN the Timer_Component reaches zero, THE Exam_Mode SHALL auto-submit the current answers and display results
8. IF the Quiz_Creator attempts to navigate away while Exam_Mode is active, THEN THE Exam_Mode SHALL display a confirmation dialog warning that progress will be lost

### Requirement 3: Share with Friends (Temporary Link)

**User Story:** As a Quiz_Creator, I want to share a temporary link with friends so they can take the same quiz, with the link automatically expiring after 1 hour.

#### Acceptance Criteria

1. WHEN MCQ generation completes, THE Quiz_Generator SHALL display a "Share with Friends" button in place of the current "Start Test" button
2. WHEN the Quiz_Creator clicks "Share with Friends", THE Share_Link_Service SHALL generate a unique temporary link with a 1-hour expiration from the time of creation
3. WHEN the temporary link is generated, THE Quiz_Generator SHALL display the link in a copyable text field with a "Copy" button
4. WHEN a Quiz_Taker opens a valid (non-expired) shared link, THE Shared_Quiz_View SHALL render the quiz using the MCQ_Card_UI component in exam mode with an automatic timer
5. WHEN a Quiz_Taker opens an expired shared link, THE Shared_Quiz_View SHALL display a clear message indicating the link has expired
6. THE Share_Link_Service SHALL set the exam duration to 1 minute per question when creating the shared link
7. WHEN a Quiz_Taker submits answers via the shared link, THE Shared_Quiz_View SHALL display results showing score, correct answers, and explanations
8. THE Share_Link_Service SHALL require the Quiz_Creator to be authenticated before generating a shared link
9. IF an unauthenticated user clicks "Share with Friends", THEN THE Quiz_Generator SHALL display a prompt to sign in

### Requirement 4: Shared Quiz View Uses Unified UI

**User Story:** As a Quiz_Taker, I want the shared quiz link to display the same card-based UI as the quiz generation page, so that the experience is consistent and familiar.

#### Acceptance Criteria

1. WHEN a Quiz_Taker opens a shared link, THE Shared_Quiz_View SHALL render questions using the MCQ_Card_UI component with the same card layout, numbering, and grid options as the Quiz_Generator view
2. WHEN Exam_Mode ends (via submission or timer expiry) in the Shared_Quiz_View, THE Shared_Quiz_View SHALL display results using the MCQ_Card_UI in practice mode showing correct answers and explanations
3. THE Shared_Quiz_View SHALL display a Timer_Component at the top of the page showing remaining time in MM:SS format
4. THE Shared_Quiz_View SHALL display a "Submit" button that allows the Quiz_Taker to submit answers before the timer expires
5. IF the Quiz_Taker has not answered all questions when submitting, THEN THE Shared_Quiz_View SHALL display a confirmation dialog showing the number of unanswered questions

### Requirement 5: Timer Auto-Start Behavior

**User Story:** As a Quiz_Taker, I want the timer to start automatically when I open the exam, so that I can begin answering immediately without extra steps.

#### Acceptance Criteria

1. WHEN Exam_Mode activates (either in-tab or via shared link), THE Timer_Component SHALL start counting down immediately without requiring user interaction
2. THE Timer_Component SHALL calculate the default duration as the number of questions multiplied by 60 seconds
3. WHILE the timer is running, THE Timer_Component SHALL update the displayed time every second
4. WHEN the remaining time reaches 60 seconds, THE Timer_Component SHALL visually indicate urgency by changing the timer text color to red
5. WHEN the remaining time reaches zero, THE Timer_Component SHALL trigger automatic submission of current answers
