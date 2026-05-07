-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
