import { prisma } from '@/lib/prisma';
import { computeScore } from './score';
import type { AttemptResultPayload, SubmitReason } from './types';

/**
 * Saves partial answers for an in-progress attempt.
 * Merges new answers with existing ones (last-write-wins per key).
 */
export async function saveAnswers(input: {
  attemptId: string;
  takerIdentifier: string;
  partialAnswers: Record<string, string>;
}): Promise<{ kind: 'ok' } | { kind: 'gone' } | { kind: 'forbidden' }> {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: input.attemptId },
  });

  if (!attempt) {
    return { kind: 'gone' };
  }

  if (attempt.status !== 'in_progress') {
    return { kind: 'gone' };
  }

  if (attempt.takerIdentifier !== input.takerIdentifier) {
    return { kind: 'forbidden' };
  }

  const existingAnswers: Record<string, string> = JSON.parse(attempt.answers || '{}');
  const mergedAnswers = { ...existingAnswers, ...input.partialAnswers };

  await prisma.testAttempt.update({
    where: { id: input.attemptId },
    data: { answers: JSON.stringify(mergedAnswers) },
  });

  return { kind: 'ok' };
}

/**
 * Submits an attempt, computing the score and finalizing the attempt status.
 * If elapsed time exceeds duration + 5s grace, forces reason to 'time_expired'.
 */
export async function submitAttempt(input: {
  attemptId: string;
  takerIdentifier: string;
  status: 'submitted' | 'disqualified';
  reason: SubmitReason;
  answers: Record<string, string>;
  now?: Date;
}): Promise<
  | { kind: 'ok'; attempt: any }
  | { kind: 'gone' }
  | { kind: 'forbidden' }
> {
  const now = input.now ?? new Date();

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: input.attemptId },
    include: { testSession: true },
  });

  if (!attempt) {
    return { kind: 'gone' };
  }

  if (attempt.status !== 'in_progress') {
    return { kind: 'gone' };
  }

  if (attempt.takerIdentifier !== input.takerIdentifier) {
    return { kind: 'forbidden' };
  }

  const elapsedSeconds = Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000);

  // Force reason to time_expired if over duration + 5s grace
  let reason: SubmitReason = input.reason;
  if (elapsedSeconds > attempt.testSession.durationSeconds + 5) {
    reason = 'time_expired';
  }

  // Load quiz questions for scoring
  const questions = await prisma.quizQuestion.findMany({
    where: { quizId: attempt.quizId },
  });

  const { score, percentage } = computeScore(input.answers, questions);

  const updated = await prisma.testAttempt.update({
    where: { id: input.attemptId },
    data: {
      status: input.status,
      reason,
      score,
      percentage,
      answers: JSON.stringify(input.answers),
      elapsedSeconds,
      submittedAt: now,
    },
  });

  return { kind: 'ok', attempt: updated };
}

/**
 * Retrieves an attempt for viewing, with authorization checks.
 * The viewer must be either the taker or the session owner.
 * For terminal attempts (submitted/disqualified), includes correctAnswer and explanation.
 */
export async function getAttemptForViewer(input: {
  attemptId: string;
  takerIdentifier: string;
  viewerUserId: string | null;
}): Promise<
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'ok'; payload: AttemptResultPayload }
> {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: input.attemptId },
    include: {
      testSession: true,
      quiz: { include: { questions: true } },
    },
  });

  if (!attempt) {
    return { kind: 'not_found' };
  }

  // Authorization: taker or owner
  const isTaker = attempt.takerIdentifier === input.takerIdentifier;
  const isOwner = input.viewerUserId != null && attempt.testSession.ownerUserId === input.viewerUserId;

  if (!isTaker && !isOwner) {
    return { kind: 'forbidden' };
  }

  const answers: Record<string, string> = JSON.parse(attempt.answers || '{}');
  const isTerminal = attempt.status === 'submitted' || attempt.status === 'disqualified';

  const questions = attempt.quiz.questions.map((q) => {
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

    const base: {
      id: string;
      question: string;
      options: string[];
      correctAnswer?: string;
      explanation?: string;
      selected: string | null;
    } = {
      id: q.id,
      question: q.question,
      options,
      selected: answers[q.id] ?? null,
    };

    if (isTerminal) {
      base.correctAnswer = q.correctAnswer;
      base.explanation = q.explanation;
    }

    return base;
  });

  const payload: AttemptResultPayload = {
    attempt: {
      id: attempt.id,
      status: attempt.status as AttemptResultPayload['attempt']['status'],
      reason: attempt.reason,
      score: attempt.score,
      percentage: attempt.percentage,
      elapsedSeconds: attempt.elapsedSeconds,
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      startedAt: attempt.startedAt.toISOString(),
    },
    quiz: {
      id: attempt.quiz.id,
      title: attempt.quiz.title,
    },
    questions,
    isOwnerView: isOwner,
  };

  return { kind: 'ok', payload };
}
