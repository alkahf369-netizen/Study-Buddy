import { NextResponse } from 'next/server';
import { resolveTestContext } from '@/lib/test/request-context';
import { submitRequestSchema } from '@/lib/test/schemas';
import { submitAttempt } from '@/lib/test/attempt-service';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const { takerIdentifier } = await resolveTestContext();

    const body = await req.json();
    const parsed = submitRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request body' }, { status: 400 });
    }

    const result = await submitAttempt({
      attemptId,
      takerIdentifier,
      status: parsed.data.status,
      reason: parsed.data.reason,
      answers: parsed.data.answers,
    });

    if (result.kind === 'gone') {
      return NextResponse.json({ error: 'Attempt is no longer active' }, { status: 410 });
    }

    if (result.kind === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch full question data for results display
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: { quizId: result.attempt.quizId },
    });

    const questions = quizQuestions.map((q) => {
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
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    });

    return NextResponse.json({
      attempt: {
        id: result.attempt.id,
        status: result.attempt.status,
        reason: result.attempt.reason,
        score: result.attempt.score,
        percentage: result.attempt.percentage,
        elapsedSeconds: result.attempt.elapsedSeconds,
      },
      questions,
    });
  } catch (error) {
    console.error('[POST /api/test-attempt/[attemptId]/submit] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
