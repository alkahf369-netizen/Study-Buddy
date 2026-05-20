import { NextResponse } from 'next/server';
import { resolveTestContext } from '@/lib/test/request-context';
import { startOrResumeAttempt } from '@/lib/test/session-service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { takerIdentifier, userId } = await resolveTestContext();

    const result = await startOrResumeAttempt({
      token,
      takerIdentifier,
      userId,
    });

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Invalid test link' }, { status: 404 });
    }

    if (result.kind === 'expired') {
      return NextResponse.json({ error: 'This test link has expired' }, { status: 410 });
    }

    return NextResponse.json({
      session: {
        durationSeconds: result.durationSeconds,
        status: 'active',
        expiresAt: result.expiresAt.toISOString(),
      },
      attempt: {
        id: result.attempt.id,
        startedAt: result.startedAt.toISOString(),
        status: result.attempt.status,
      },
      questions: result.questions,
      savedAnswers: result.savedAnswers,
      isResume: result.isResume,
    });
  } catch (error) {
    console.error('[GET /api/test-session/[token]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
