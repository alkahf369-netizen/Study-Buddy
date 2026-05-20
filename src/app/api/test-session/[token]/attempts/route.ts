import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getAttemptsForOwner } from '@/lib/test/session-service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    const testSession = await prisma.testSession.findUnique({
      where: { token },
    });

    if (!testSession) {
      return NextResponse.json({ error: 'Test session not found' }, { status: 404 });
    }

    if (testSession.ownerUserId !== authSession.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attempts = await getAttemptsForOwner(testSession.id);

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error('[GET /api/test-session/[token]/attempts] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
