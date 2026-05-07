"use client";

import { useSession } from "next-auth/react";
import StudyAssistant from "@/components/StudyAssistant";
import LandingPage from "@/components/LandingPage";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!session?.user) {
    return <LandingPage />;
  }

  return (
    <main>
      <StudyAssistant />
    </main>
  );
}
