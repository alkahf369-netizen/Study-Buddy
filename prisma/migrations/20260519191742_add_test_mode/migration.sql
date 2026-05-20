-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestSession_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestSession_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testSessionId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "takerIdentifier" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "reason" TEXT,
    "score" INTEGER,
    "percentage" REAL,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elapsedSeconds" INTEGER,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestAttempt_testSessionId_fkey" FOREIGN KEY ("testSessionId") REFERENCES "TestSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TestSession_token_key" ON "TestSession"("token");

-- CreateIndex
CREATE INDEX "TestSession_quizId_idx" ON "TestSession"("quizId");

-- CreateIndex
CREATE INDEX "TestSession_ownerUserId_idx" ON "TestSession"("ownerUserId");

-- CreateIndex
CREATE INDEX "TestSession_status_expiresAt_idx" ON "TestSession"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "TestAttempt_testSessionId_takerIdentifier_idx" ON "TestAttempt"("testSessionId", "takerIdentifier");

-- CreateIndex
CREATE INDEX "TestAttempt_testSessionId_status_idx" ON "TestAttempt"("testSessionId", "status");
