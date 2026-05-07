import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const history = await prisma.quiz.findMany({
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
