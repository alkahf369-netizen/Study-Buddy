import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. You must be logged in to save a quiz." }, { status: 401 });
    }

    const { title } = await req.json();

    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: {
        title: title || quiz.title,
        isSaved: true,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ quiz: updatedQuiz });
  } catch (error: any) {
    console.error("[save-quiz] Error saving quiz:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
