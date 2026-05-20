import { prisma } from '@/lib/prisma';
import { generateToken } from './token';
import type { RunnerQuestion } from './types';

/**
 * Creates a new TestSession for a quiz, generating a unique token and test link.
 * The session expires 60 minutes after creation.
 */
export async function createSession(input: {
  quizId: string;
  ownerUserId: string;
  durationSeconds: number;
  now?: Date;
}): Promise<{ id: string; token: string; testLink: string; expiresAt: Date; durationSeconds: number }> {
  const now = input.now ?? new Date();
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + 3600000); // 60 min

  const session = await prisma.testSession.create({
    data: {
      token,
      quizId: input.quizId,
      ownerUserId: input.ownerUserId,
      durationSeconds: input.durationSeconds,
      status: 'active',
      expiresAt,
    },
  });

  const testLink = `/test/${token}`;

  return {
    id: session.id,
    token,
    testLink,
    expiresAt,
    durationSeconds: input.durationSeconds,
  };
}

/**
 * Looks up a TestSession by its token.
 * If the session is past its expiresAt and still marked active, it transitions to expired.
 */
export async function getSessionByToken(token: string, now?: Date): Promise<
  | { kind: 'not_found' }
  | { kind: 'expired'; session: any }
  | { kind: 'active'; session: any }
> {
  const currentTime = now ?? new Date();

  const session = await prisma.testSession.findUnique({
    where: { token },
  });

  if (!session) {
    return { kind: 'not_found' };
  }

  if (currentTime > session.expiresAt && session.status === 'active') {
    const updated = await prisma.testSession.update({
      where: { id: session.id },
      data: { status: 'expired' },
    });
    return { kind: 'expired', session: updated };
  }

  if (session.status === 'expired') {
    return { kind: 'expired', session };
  }

  return { kind: 'active', session };
}

/**
 * Starts a new attempt or resumes an existing in-progress attempt for a taker.
 */
export async function startOrResumeAttempt(input: {
  token: string;
  takerIdentifier: string;
  userId: string | null;
  now?: Date;
}): Promise<
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'ok'; attempt: any; questions: RunnerQuestion[]; savedAnswers: Record<string, string>; isResume: boolean; durationSeconds: number; startedAt: Date; expiresAt: Date }
> {
  const now = input.now ?? new Date();
  const sessionResult = await getSessionByToken(input.token, now);

  if (sessionResult.kind === 'not_found') {
    return { kind: 'not_found' };
  }

  if (sessionResult.kind === 'expired') {
    return { kind: 'expired' };
  }

  const session = sessionResult.session;

  // Check for existing in-progress attempt
  const existingAttempt = await prisma.testAttempt.findFirst({
    where: {
      testSessionId: session.id,
      takerIdentifier: input.takerIdentifier,
      status: 'in_progress',
    },
  });

  if (existingAttempt) {
    // Resume: load quiz questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: session.quizId },
      include: { questions: true },
    });

    const questions = serializeQuestionsForRunner(quiz?.questions ?? []);
    const savedAnswers: Record<string, string> = JSON.parse(existingAttempt.answers || '{}');

    return {
      kind: 'ok',
      attempt: existingAttempt,
      questions,
      savedAnswers,
      isResume: true,
      durationSeconds: session.durationSeconds,
      startedAt: existingAttempt.startedAt,
      expiresAt: session.expiresAt,
    };
  }

  // Create new attempt
  const quiz = await prisma.quiz.findUnique({
    where: { id: session.quizId },
    include: { questions: true },
  });

  const newAttempt = await prisma.testAttempt.create({
    data: {
      testSessionId: session.id,
      quizId: session.quizId,
      takerIdentifier: input.takerIdentifier,
      userId: input.userId,
      status: 'in_progress',
      answers: '{}',
      startedAt: now,
    },
  });

  const questions = serializeQuestionsForRunner(quiz?.questions ?? []);

  return {
    kind: 'ok',
    attempt: newAttempt,
    questions,
    savedAnswers: {},
    isResume: false,
    durationSeconds: session.durationSeconds,
    startedAt: now,
    expiresAt: session.expiresAt,
  };
}

/**
 * Serializes quiz questions for the test runner, stripping correctAnswer and explanation.
 */
export function serializeQuestionsForRunner(
  questions: Array<{ id: string; question: string; options: string; correctAnswer: string; explanation: string }>
): RunnerQuestion[] {
  return questions.map((q) => {
    let options: string[];
    if (Array.isArray(q.options)) {
      options = q.options;
    } else {
      try {
        options = JSON.parse(q.options);
      } catch {
        options = [];
      }
    }
    return {
      id: q.id,
      question: q.question,
      options,
    };
  });
}

/**
 * Returns all attempts for a given test session, ordered by submittedAt descending.
 */
export async function getAttemptsForOwner(testSessionId: string): Promise<any[]> {
  return prisma.testAttempt.findMany({
    where: { testSessionId },
    orderBy: { submittedAt: 'desc' },
  });
}
