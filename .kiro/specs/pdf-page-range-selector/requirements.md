# Requirements Document

## Introduction

The PDF Page Range Selector feature allows users to upload large PDF files and select a specific page range for quiz generation. Instead of processing the entire document, only the text from the selected pages is extracted and sent to the AI model. This enables working with larger PDFs while keeping AI context focused and relevant.

## Glossary

- **Page_Range_Selector**: The inline UI component displayed within the MCQ Composer after a PDF file is uploaded, allowing users to specify start and end page numbers for text extraction.
- **PDF_Extractor**: The server-side module (`pdf-extractor.ts`) responsible for parsing PDF files and extracting text content from specified pages using the `pdf-parse` library.
- **MCQ_Composer**: The quiz generation interface within the StudyAssistant component where users provide source material and configure quiz parameters.
- **File_Router**: The server-side module that validates uploaded files for size and type before processing.
- **Page_Count**: The total number of pages detected in an uploaded PDF file.
- **Extracted_Text_Preview**: A character count or word count indicator showing the approximate volume of text that will be extracted from the selected page range.

## Requirements

### Requirement 1: PDF Page Count Detection

**User Story:** As a student, I want the system to detect the total page count of my uploaded PDF, so that I know the valid range of pages I can select from.

#### Acceptance Criteria

1. WHEN a PDF file is uploaded in the MCQ_Composer, THE PDF_Extractor SHALL determine the total Page_Count of the file and return it as an integer to the client.
2. IF the PDF file is corrupted, unreadable, or password-protected, THEN THE PDF_Extractor SHALL return an error message indicating the file cannot be processed and the reason (e.g., corrupted data or password protection).
3. WHEN the Page_Count is determined, THE Page_Range_Selector SHALL display the total Page_Count to the user within 2 seconds of the upload completing.
4. IF the PDF file contains zero pages, THEN THE PDF_Extractor SHALL return an error message indicating the file has no extractable pages.

### Requirement 2: Page Range Selector UI

**User Story:** As a student, I want to specify which pages of my PDF to generate a quiz from, so that I can focus on the specific chapter or section I am studying.

#### Acceptance Criteria

1. WHEN a PDF file is successfully uploaded and its Page_Count is determined, THE MCQ_Composer SHALL display the Page_Range_Selector inline below the uploaded file indicator.
2. THE Page_Range_Selector SHALL provide input fields for a start page number and an end page number, each accepting only positive integer values between 1 and 10,000.
3. THE Page_Range_Selector SHALL default the start page to 1 and the end page to the total Page_Count.
4. THE Page_Range_Selector SHALL display the total Page_Count as a label (e.g., "of 42 pages") so the user understands the valid range.
5. WHEN the user modifies the start or end page values, THE Page_Range_Selector SHALL validate that the value is a positive integer, the start page is greater than or equal to 1, the end page is less than or equal to the Page_Count, and the start page is less than or equal to the end page, rejecting non-numeric characters, decimal values, and values outside the valid range.
6. IF the user enters an invalid page range, THEN THE Page_Range_Selector SHALL display an inline validation error message indicating the specific violation and disable the quiz generation button; WHEN the user corrects the values to a valid range, THE Page_Range_Selector SHALL remove the error message and re-enable the quiz generation button within 200 milliseconds of the input change.

### Requirement 3: Selective Page Text Extraction

**User Story:** As a student, I want only the text from my selected pages to be extracted, so that the AI generates a quiz focused on the material I am studying.

#### Acceptance Criteria

1. WHEN the user submits a quiz generation request with a page range, THE PDF_Extractor SHALL extract text only from the pages within the specified start and end page range (inclusive), where pages are numbered starting at 1.
2. THE PDF_Extractor SHALL concatenate extracted text from multiple pages in ascending page order, separated by a newline character.
3. IF the selected pages contain no extractable text, THEN THE PDF_Extractor SHALL return an error indicating that the selected pages have no text content.
4. WHEN text is successfully extracted from the selected pages, THE PDF_Extractor SHALL pass only that extracted text to the AI model for quiz generation.
5. IF the specified start page is greater than the end page, or either value is less than 1, THEN THE PDF_Extractor SHALL return an error indicating that the page range is invalid.
6. IF the specified start page or end page exceeds the total number of pages in the PDF, THEN THE PDF_Extractor SHALL return an error indicating that the requested pages are out of range and include the total page count of the document.

### Requirement 4: Increased File Size Limit for PDFs

**User Story:** As a student, I want to upload PDFs larger than 10 MB, so that I can use my full textbook or lecture notes without splitting them into smaller files.

#### Acceptance Criteria

1. WHEN a PDF file is uploaded with page range parameters present in the request payload, THE File_Router SHALL apply a maximum file size limit of 52,428,800 bytes (50 MB) instead of the standard 10,485,760 bytes (10 MB) limit.
2. THE File_Router SHALL retain the existing 10,485,760 bytes (10 MB) limit for image files and for PDF files uploaded without page range parameters in the request payload.
3. IF a PDF file with page range parameters exceeds 52,428,800 bytes (50 MB), THEN THE File_Router SHALL return a FileSizeError indicating the file exceeds the maximum allowed size of 50 MB for PDFs with page range selection, and SHALL include the actual decoded file size in the error message.
4. IF a PDF file without page range parameters exceeds 10,485,760 bytes (10 MB), THEN THE File_Router SHALL return a FileSizeError indicating the file exceeds the maximum allowed size of 10 MB, consistent with the existing behavior for non-page-range uploads.

### Requirement 5: Extracted Text Preview

**User Story:** As a student, I want to see an estimate of how much text will be extracted from my selected pages, so that I can judge whether the content is too much or too little for a good quiz.

#### Acceptance Criteria

1. WHEN the user selects a valid page range, THE Page_Range_Selector SHALL request a character count estimate from the server and display an Extracted_Text_Preview showing the estimated character count formatted as a rounded number (e.g., "~12,000 characters") within 3 seconds of the page range being confirmed valid.
2. WHILE the character count estimate is being retrieved, THE Page_Range_Selector SHALL display a loading indicator in the Extracted_Text_Preview area.
3. IF the estimated character count exceeds 100,000 characters, THEN THE Page_Range_Selector SHALL display a warning indicating the selection may be too large for optimal quiz generation.
4. IF the estimated character count is below 200 characters, THEN THE Page_Range_Selector SHALL display a warning indicating the selection may contain too little content for meaningful quiz generation.
5. IF the character count estimation request fails or does not respond within 5 seconds, THEN THE Page_Range_Selector SHALL display a message indicating the estimate is unavailable and SHALL NOT block quiz generation.

### Requirement 6: Non-PDF File Handling

**User Story:** As a student, I want the page range selector to only appear for PDF files, so that the interface remains clean when I upload images or other file types.

#### Acceptance Criteria

1. WHEN a file with a MIME type other than `application/pdf` is uploaded in the MCQ_Composer, THE MCQ_Composer SHALL NOT display a Page_Range_Selector for that file.
2. WHEN multiple files are uploaded and at least one has MIME type `application/pdf`, THE MCQ_Composer SHALL display a separate Page_Range_Selector instance for each PDF file and SHALL NOT display a Page_Range_Selector for any non-PDF file.
3. WHEN a PDF file is removed from the upload list and at least one other PDF file remains, THE MCQ_Composer SHALL hide only the Page_Range_Selector associated with the removed file.
4. WHEN the last PDF file is removed from the upload list while non-PDF files remain, THE MCQ_Composer SHALL hide all Page_Range_Selector instances so that no Page_Range_Selector is visible.

### Requirement 7: Page Range Persistence in Request

**User Story:** As a student, I want my selected page range to be sent along with the quiz generation request, so that the server extracts only the pages I chose.

#### Acceptance Criteria

1. WHEN the user submits a quiz generation request with a PDF that has a page range selected, THE MCQ_Composer SHALL include the start page and end page as integer values (1-indexed) in the request payload alongside the file data.
2. WHEN the server receives a PDF file payload with page range parameters where startPage and endPage are integers, startPage >= 1, and startPage <= endPage, THE generate-quiz API route SHALL pass the page range to the PDF_Extractor which extracts text only from pages startPage through endPage inclusive.
3. WHEN the server receives a PDF file payload without page range parameters, THE generate-quiz API route SHALL extract text from all pages (preserving existing behavior).
4. IF the server receives page range parameters where startPage < 1, startPage > endPage, or endPage exceeds the total page count of the PDF, THEN THE generate-quiz API route SHALL return an error response indicating the invalid page range and SHALL NOT proceed with text extraction.
5. IF the server receives page range parameters that are not integers, THEN THE generate-quiz API route SHALL return an error response indicating that page values must be integers.
