import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// PATCH — Admin: edit announcement (toggle active, update fields)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  }

  const data: any = {};
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
  if (typeof body.message === 'string' && body.message.trim()) data.message = body.message.trim();
  if (typeof body.type === 'string' && ['info', 'warning', 'maintenance'].includes(body.type)) {
    data.type = body.type;
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null || body.expiresAt === '') {
      data.expiresAt = null;
    } else {
      const d = new Date(body.expiresAt);
      if (!isNaN(d.getTime())) data.expiresAt = d;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data,
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({ success: true, announcement: updated });
}

// DELETE — Admin: remove announcement
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  }

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
