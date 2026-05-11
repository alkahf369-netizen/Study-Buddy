import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import McqClientView from "./McqClientView";

export default async function McqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { questions: true },
  });

  if (!quiz) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <McqClientView initialQuiz={quiz} />
    </div>
  );
}
