import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET — Public: list currently active announcements (no auth required)
export async function GET() {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      expiresAt: true,
      createdAt: true,
      createdBy: { select: { name: true, image: true } },
    },
  });

  return NextResponse.json({ announcements });
}
