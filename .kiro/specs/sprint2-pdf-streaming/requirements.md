# Requirements Document

## Introduction

Sprint 2 enhances the Study Buddy quiz generation pipeline with two capabilities: robust PDF file upload handling (including server-side text extraction as a fallback for models that lack native PDF support) and streaming quiz generation via Server-Sent Events (SSE) so users see questions appear progressively instead of waiting for the full response.

## Glossary

- **Quiz_Generator**: The server-side API route (`/api/generate-quiz`) responsible for receiving user input, calling the AI model, parsing the response, and returning quiz questions.
- **MCQ_Composer**: The frontend component where users paste text or upload files and configure quiz generation parameters (complexity, count).
- **SSE_Stream**: A Server-Sent Events connection that delivers incremental data from server to client over a single HTTP response.
- **PDF_Extractor**: The server-side module that extracts text content from PDF files using the `pdf-parse` library when the AI model does not support native PDF input.
- **Quiz_Client**: The frontend logic (within `startQuiz`) that consumes the SSE stream and progressively renders quiz questions.
- **Document_Part**: An AI API message content part formatted for native document/PDF processing (as opposed to `image_url` format).
- **Streaming_Parser**: The server-side logic that accumulates AI model tokens and detects complete JSON question objects for incremental emission.

## Requirements

### Requirement 1: PDF MIME Type Detection and Routing

**User Story:** As a student, I want to upload a PDF file and have the system correctly identify it as a document (not an image), so that the AI model receives the file in the optimal format.

#### Acceptance Criteria

1. WHEN a file with `inlineData.mimeType` equal to `application/pdf` is included in the request, THE Quiz_Generator SHALL format the file as a Document_Part containing the base64-encoded file data and its mimeType, instead of an `image_url` part.
2. WHEN a file with an `inlineData.mimeType` starting with `image/` is included in the request, THE Quiz_Generator SHALL format the file as an `image_url` part using a data URI containing the base64-encoded data and mimeType.
3. THE Quiz_Generator SHALL determine the file format based solely on the `inlineData.mimeType` field of each file in the request payload.
4. IF a file's `inlineData.mimeType` is missing or does not match `application/pdf` or a type starting with `image/`, THEN THE Quiz_Generator SHALL reject that file with an error message indicating an unsupported file type.

### Requirement 2: Server-Side PDF Text Extraction (Fallback)

**User Story:** As a student, I want my PDF content to be processed even when the selected AI model does not support native PDF input, so that I can generate quizzes from any PDF regardless of model choice.

#### Acceptance Criteria

1. WHEN the Document_Part format fails (AI API returns an HTTP 4xx response containing an error message referencing unsupported content type or media type), THE Quiz_Generator SHALL perform exactly one retry of the request using text extracted by the PDF_Extractor in place of the Document_Part.
2. WHEN text extraction succeeds, THE Quiz_Generator SHALL include the extracted text appended after any user-provided text in the prompt context section.
3. IF the PDF file yields extracted text that is empty or contains only whitespace characters after trimming, THEN THE Quiz_Generator SHALL return an error response with HTTP status 422 and a message indicating that the PDF has no extractable text content.
4. IF the `pdf-parse` library throws an error during extraction, THEN THE Quiz_Generator SHALL return an error response with HTTP status 422 and a message indicating the PDF could not be processed.
5. THE PDF_Extractor SHALL decode the base64-encoded file data before passing it to the `pdf-parse` library.
6. WHEN multiple PDF files are included in a single request and the Document_Part format fails, THE Quiz_Generator SHALL extract text from each PDF file individually and concatenate the results separated by a newline before including them in the prompt.

### Requirement 3: File Size Validation

**User Story:** As a system operator, I want uploaded files to be rejected if they exceed 10 MB, so that the server is protected from excessively large payloads.

#### Acceptance Criteria

1. THE Quiz_Generator SHALL reject any request where a file's base64-decoded size exceeds 10 megabytes (10,485,760 bytes).
2. WHEN a file exceeds the size limit, THE Quiz_Generator SHALL return an error response with HTTP status 413 and a message indicating the maximum allowed file size.
3. WHEN the user selects a file whose raw size exceeds 10,485,760 bytes, THE MCQ_Composer SHALL display an inline error message adjacent to the file input indicating the maximum allowed file size of 10 MB, and SHALL NOT send the upload request.
4. WHEN the user selects a valid file (size ≤ 10,485,760 bytes) after a file size error was displayed, THE MCQ_Composer SHALL clear the previously displayed size error message.

### Requirement 4: SSE Streaming for Quiz Generation

**User Story:** As a student, I want to see quiz questions appear one by one as they are generated, so that I do not stare at a loading spinner for 20-30 seconds.

#### Acceptance Criteria

1. THE Quiz_Generator SHALL respond with a `text/event-stream` content type and stream quiz data incrementally using Server-Sent Events.
2. WHEN the AI model produces a complete question object (containing question, options, correctAnswer, and explanation fields), THE Quiz_Generator SHALL emit an SSE event with event type `question` containing that question's JSON and a sequence index starting at 0.
3. WHEN all questions have been streamed, THE Quiz_Generator SHALL emit a final SSE event with event type `done` containing the total question count and the saved quiz ID (or null if persistence failed), then close the connection.
4. IF the AI model returns an error during streaming, THEN THE Quiz_Generator SHALL emit an SSE event with event type `error` containing a message that identifies the failure reason (e.g., model unavailable, token limit exceeded, malformed response) and close the connection.
5. THE Quiz_Generator SHALL set `Cache-Control: no-cache, no-transform` and `Connection: keep-alive` headers on the SSE response.
6. IF no SSE event is emitted for 30 seconds during an active stream, THEN THE Quiz_Generator SHALL emit an SSE event with event type `error` containing a timeout indication and close the connection.
7. IF the client disconnects before the stream completes, THEN THE Quiz_Generator SHALL abort the upstream AI request within 5 seconds and release all associated resources.
8. IF the AI model produces a malformed question object that cannot be parsed during streaming, THEN THE Quiz_Generator SHALL skip that question, continue streaming subsequent valid questions, and include a `warnings` field in the `done` event indicating the number of skipped questions.

### Requirement 5: Progressive Quiz Rendering

**User Story:** As a student, I want each quiz question to appear on screen with an animation as it arrives from the stream, so that the experience feels responsive and engaging.

#### Acceptance Criteria

1. WHEN quiz generation is initiated, THE Quiz_Client SHALL establish an SSE connection to the Quiz_Generator endpoint within 10 seconds.
2. WHEN an SSE event with event type `question` is received, THE Quiz_Client SHALL parse the event payload and append the question to the displayed quiz within 100 milliseconds of receipt.
3. WHEN a new question is appended to the displayed quiz, THE Quiz_Client SHALL render it with a CSS transition animation (fade-in or slide-in) lasting between 200 and 400 milliseconds.
4. WHILE the SSE connection is open and at least one `question` event has been received, THE Quiz_Client SHALL display a progress indicator showing the count of questions received so far.
5. WHEN the `done` event is received, THE Quiz_Client SHALL remove the progress indicator and display the full quiz in its final interactive state where the user can select answers, submit responses, and view explanations.
6. IF an SSE event with event type `error` is received, THEN THE Quiz_Client SHALL display the error message content from the event payload to the user, close the SSE connection, and stop waiting for additional questions.
7. IF the SSE connection is lost or no event is received within 30 seconds, THEN THE Quiz_Client SHALL display an error message indicating a connection failure and present any questions already received in their interactive state.
8. IF the `done` event is received and zero questions were delivered during the stream, THEN THE Quiz_Client SHALL display an error message indicating that no questions could be generated.

### Requirement 6: Backward-Compatible Quiz Persistence

**User Story:** As a student, I want my streamed quizzes to be saved to the database with the same structure as before, so that I can review them later from my quiz history.

#### Acceptance Criteria

1. WHEN all questions in the quiz have been streamed and parsed without error, THE Quiz_Generator SHALL persist the quiz to the database with the fields: title (maximum 50 characters, derived from the source text), originalText, complexity, requestedCount, and all associated questions (each with question, options, correctAnswer, and explanation).
2. WHEN the quiz is saved successfully, THE Quiz_Generator SHALL include the saved quiz ID in the `done` event payload.
3. IF the database save fails, THEN THE Quiz_Generator SHALL include the complete quiz data (title, originalText, complexity, requestedCount, and all questions with their options, correctAnswer, and explanation) in the `done` event with a null ID, so the user does not lose generated quiz content.
4. IF the stream ends before all requested questions have been delivered (partial stream), THEN THE Quiz_Generator SHALL persist only the questions that were successfully received and parsed, and SHALL indicate in the `done` event that the quiz is incomplete.

### Requirement 7: Streaming JSON Parser

**User Story:** As a developer, I want the streaming parser to handle partial JSON from the AI model reliably, so that questions are emitted as soon as they are complete without data corruption.

#### Acceptance Criteria

1. WHEN a text token is received from the AI model's streamed response, THE Streaming_Parser SHALL append it to an internal buffer and attempt to extract complete question objects after each append.
2. WHEN a complete JSON object for a question (containing the four required fields: "question", "options", "correctAnswer", and "explanation") is detected in the buffer, THE Streaming_Parser SHALL emit it as an SSE event and remove the consumed portion from the buffer.
3. THE Streaming_Parser SHALL strip markdown code fences (` ```json `, ` ```JSON `, and ` ``` `) and surrounding whitespace from the AI response before attempting JSON extraction.
4. IF the AI model's stream ends and the buffer contains a non-empty string that cannot be parsed as a valid question object, THEN THE Streaming_Parser SHALL emit an error SSE event indicating incomplete or malformed data and discard the unparseable buffer content.
5. IF the buffer exceeds 512 KB without yielding a complete question object, THEN THE Streaming_Parser SHALL emit an error SSE event indicating a buffer overflow condition and stop processing.
6. WHEN all streamed tokens have been received and parsed, THE Streaming_Parser SHALL have emitted question objects in the same order and with field values identical (deep equality) to those produced by non-streamed JSON parsing of the complete AI response.
