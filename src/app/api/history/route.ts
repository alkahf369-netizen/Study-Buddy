import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await prisma.quiz.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(history);
  } catch (error: any) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
