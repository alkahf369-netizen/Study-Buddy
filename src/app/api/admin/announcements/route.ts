import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// GET — Admin: list all announcements (active + expired + disabled)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({ announcements });
}

// POST — Admin: create a new announcement
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { title, message, type, expiresAt, isActive } = await req.json();

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const validTypes = ['info', 'warning', 'maintenance'];
  const safeType = validTypes.includes(type) ? type : 'info';

  let expiresAtDate: Date | null = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (!isNaN(d.getTime())) expiresAtDate = d;
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      message: message.trim(),
      type: safeType,
      isActive: isActive !== false,
      expiresAt: expiresAtDate,
      createdById: admin.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({ success: true, announcement });
}
