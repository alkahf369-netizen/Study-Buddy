import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createSessionRequestSchema } from '@/lib/test/schemas';
import { createSession } from '@/lib/test/session-service';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSessionRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request body' }, { status: 400 });
    }

    const { quizId, durationSeconds: providedDuration } = parsed.data;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    if (quiz.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If durationSeconds not provided, calculate as questionCount * 60
    let durationSeconds = providedDuration;
    if (durationSeconds === undefined) {
      const questionCount = await prisma.quizQuestion.count({
        where: { quizId },
      });
      durationSeconds = questionCount * 60;
    }

    const result = await createSession({
      quizId,
      ownerUserId: session.user.id,
      durationSeconds,
    });

    return NextResponse.json(
      {
        token: result.token,
        testLink: result.testLink,
        expiresAt: result.expiresAt.toISOString(),
        durationSeconds: result.durationSeconds,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/test-session] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
