import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * POST /api/admin/promote
 * Promotes the current user to admin role.
 * Requires ADMIN_SECRET in the request body to match the env var.
 * 
 * Usage: Send POST with { "secret": "<your ADMIN_SECRET env value>" }
 * Set ADMIN_SECRET in .env.local to a strong random string.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { secret } = await req.json();
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json({ error: 'ADMIN_SECRET not configured' }, { status: 500 });
    }

    if (secret !== adminSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: 'admin' }
    });

    return NextResponse.json({ success: true, message: 'You are now an admin.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
