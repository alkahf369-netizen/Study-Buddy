import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Parse the JSON-stringified options field for each question
    const parsedQuiz = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: (() => {
          try {
            const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
      })),
    };

    return NextResponse.json({ quiz: parsedQuiz });
  } catch (error: any) {
    console.error("[get-quiz] Error fetching quiz:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
