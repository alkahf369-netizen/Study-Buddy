import { NextResponse } from 'next/server';
import { resolveTestContext } from '@/lib/test/request-context';
import { answersUpdateSchema } from '@/lib/test/schemas';
import { saveAnswers } from '@/lib/test/attempt-service';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const { takerIdentifier } = await resolveTestContext();

    const body = await req.json();
    const parsed = answersUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request body' }, { status: 400 });
    }

    const result = await saveAnswers({
      attemptId,
      takerIdentifier,
      partialAnswers: parsed.data.answers,
    });

    if (result.kind === 'gone') {
      return NextResponse.json({ error: 'Attempt is no longer active' }, { status: 410 });
    }

    if (result.kind === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/test-attempt/[attemptId]/answers] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
