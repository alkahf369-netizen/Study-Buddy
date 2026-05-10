import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import McqClientView from "./McqClientView";

export default async function McqPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { questions: true },
  });

  if (!quiz) {
    notFound();
  }

  // Determine if it's already saved by this user
  const isOwner = session?.user?.id === quiz.userId;
  const isSaved = quiz.isSaved && isOwner;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <McqClientView 
        initialQuiz={quiz} 
        isSaved={isSaved} 
        isLoggedIn={!!session?.user?.id} 
      />
    </div>
  );
}
