import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// PATCH — Update user (role, ban status)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Prevent admin from demoting / banning themselves
  if (target.id === admin.id) {
    if (body.role === 'user' || body.isBanned === true) {
      return NextResponse.json(
        { error: 'You cannot demote or ban yourself' },
        { status: 400 }
      );
    }
  }

  const data: any = {};
  if (body.role === 'user' || body.role === 'admin') data.role = body.role;
  if (typeof body.isBanned === 'boolean') {
    data.isBanned = body.isBanned;
    // If banning, also kill all active sessions
    if (body.isBanned) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
    },
  });

  return NextResponse.json({ success: true, user: updated });
}

// DELETE — Permanently delete a user (cascade removes their data)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account from here' },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
