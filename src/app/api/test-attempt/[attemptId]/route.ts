import { NextResponse } from 'next/server';
import { resolveTestContext } from '@/lib/test/request-context';
import { getAttemptForViewer } from '@/lib/test/attempt-service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const { takerIdentifier, userId } = await resolveTestContext();

    const result = await getAttemptForViewer({
      attemptId,
      takerIdentifier,
      viewerUserId: userId,
    });

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (result.kind === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error('[GET /api/test-attempt/[attemptId]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
