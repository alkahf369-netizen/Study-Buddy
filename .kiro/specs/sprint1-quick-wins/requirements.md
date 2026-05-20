# Requirements Document

## Introduction

Sprint 1 addresses the "fake UI" problem in the Study Buddy application. The UI currently collects quiz complexity level and question count from the user but never transmits these values to the backend API. This sprint wires those controls to the backend, persists the new fields in the database, replaces the boilerplate README with proper documentation, and removes dead files from the repository.

## Glossary

- **Quiz_Generation_API**: The `POST /api/generate-quiz` endpoint that accepts user content and returns AI-generated multiple-choice questions.
- **StudyAssistant_UI**: The main client-side component (`StudyAssistant.jsx`) containing the MCQ composer, chat interface, and settings.
- **Complexity_Level**: A difficulty tier for generated questions — one of `recall`, `apply`, `analyze`, or `mastery`.
- **Question_Count**: The number of MCQ questions the user requests (1–50).
- **AI_Auto_Count**: A boolean flag indicating the AI should determine the optimal number of questions based on source material depth.
- **Quiz_Model**: The Prisma database model representing a saved quiz record.
- **Prompt_Template**: The text instruction sent to the AI model that controls quiz generation behavior.

## Requirements

### Requirement 1: Wire Complexity and Count to Backend API

**User Story:** As a student, I want my selected complexity level and question count to influence the generated quiz, so that I receive questions at the appropriate difficulty and quantity.

#### Acceptance Criteria

1. WHEN the StudyAssistant_UI submits a quiz generation request, THE Quiz_Generation_API SHALL receive `complexity`, `count`, and `aiAutoCount` as structured fields in the JSON request body.
2. WHEN the Quiz_Generation_API receives a valid `complexity` value, THE Prompt_Template SHALL include the corresponding difficulty-level instruction for the AI model.
3. WHEN the Quiz_Generation_API receives `aiAutoCount` set to false and a valid `count` value, THE Prompt_Template SHALL instruct the AI model to generate exactly that number of questions.
4. WHEN the Quiz_Generation_API receives `aiAutoCount` set to true, THE Prompt_Template SHALL instruct the AI model to determine the optimal number of questions and SHALL ignore the `count` field.
5. IF the Quiz_Generation_API receives a `complexity` value that is not one of `recall`, `apply`, `analyze`, or `mastery`, THEN THE Quiz_Generation_API SHALL reject the request with a 400 status code and a descriptive error message.
6. IF the Quiz_Generation_API receives a `count` value outside the range 1–50, THEN THE Quiz_Generation_API SHALL reject the request with a 400 status code and a descriptive error message.

### Requirement 2: Persist Complexity and Count in Database

**User Story:** As a student, I want my quiz generation settings saved alongside the quiz, so that I can review what parameters produced each quiz.

#### Acceptance Criteria

1. THE Quiz_Model SHALL include a nullable `complexity` field of type String.
2. THE Quiz_Model SHALL include a nullable `requestedCount` field of type Int.
3. WHEN the Quiz_Generation_API successfully generates and saves a quiz, THE Quiz_Generation_API SHALL persist the `complexity` and `requestedCount` values in the Quiz record.
4. WHEN `complexity` or `count` are not provided in the request, THE Quiz_Generation_API SHALL store null for the corresponding database fields.

### Requirement 3: Replace README with Project Documentation

**User Story:** As a developer, I want a comprehensive README file, so that I can understand the project setup and contribute effectively.

#### Acceptance Criteria

1. THE README file SHALL contain a project description explaining the purpose of Study Buddy.
2. THE README file SHALL list the technology stack including Next.js 16, Prisma ORM, SQLite, NextAuth v5, and Tailwind CSS v4.
3. THE README file SHALL document all required environment variables with descriptions.
4. THE README file SHALL provide step-by-step setup instructions covering cloning, dependency installation, environment configuration, database migration, and development server startup.

### Requirement 4: Remove Dead Files

**User Story:** As a developer, I want unused files removed from the repository, so that the codebase remains clean and navigable.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE repository SHALL no longer contain the file `nano_gpt_models.txt`.
2. WHEN the cleanup is complete, THE repository SHALL no longer contain the file `models_output.json`.
3. WHEN the cleanup is complete, THE repository SHALL no longer contain the file `backend_for_emergent.md`.
