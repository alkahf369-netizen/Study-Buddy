"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ExamTimer from "@/components/quiz/ExamTimer";
import { MCQCardUI, type QuizQuestion } from "@/components/quiz/MCQCardUI";
import { calculateUnanswered, calculateScore } from "@/lib/quiz/exam-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SharedQuizViewProps = {
  token: string;
};

type ViewState = "loading" | "expired" | "invalid" | "active" | "submitted";

type SessionData = {
  durationSeconds: number;
  status: string;
  expiresAt: string;
};

type AttemptData = {
  id: string;
  startedAt: string;
  status: string;
};

type ServerQuestion = {
  id: string;
  question: string;
  options: string[];
};

type FullQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

const DEBOUNCE_MS = 2000;

export default function SharedQuizView({ token }: SharedQuizViewProps) {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [questions, setQuestions] = useState<ServerQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [score, setScore] = useState(0);
  const [reviewQuestions, setReviewQuestions] = useState<QuizQuestion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce save refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAnswersRef = useRef<Record<string, string>>({});
  const isSavingRef = useRef(false);

  // beforeunload warning during active exam
  useEffect(() => {
    if (viewState !== "active") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [viewState]);

  // Fetch session data on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/test-session/${token}`);

        if (res.status === 404) {
          setViewState("invalid");
          return;
        }

        if (res.status === 410) {
          setViewState("expired");
          return;
        }

        if (!res.ok) {
          setViewState("invalid");
          return;
        }

        const data = await res.json();

        setSession(data.session);
        setAttempt(data.attempt);
        setQuestions(data.questions);

        // Restore saved answers if resuming
        if (data.savedAnswers && Object.keys(data.savedAnswers).length > 0) {
          const restored: Record<number, string> = {};
          // savedAnswers is Record<string, string> keyed by question id
          data.questions.forEach((q: ServerQuestion, index: number) => {
            if (data.savedAnswers[q.id]) {
              restored[index] = data.savedAnswers[q.id];
            }
          });
          setAnswers(restored);
          pendingAnswersRef.current = data.savedAnswers;
        }

        setViewState("active");
      } catch {
        setViewState("invalid");
      }
    }

    fetchSession();
  }, [token]);

  // Save answers to server (debounced)
  const saveAnswersToServer = useCallback(async () => {
    if (!attempt || isSavingRef.current) return;

    const answersToSave = { ...pendingAnswersRef.current };
    if (Object.keys(answersToSave).length === 0) return;

    isSavingRef.current = true;
    try {
      await fetch(`/api/test-attempt/${attempt.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersToSave }),
      });
    } catch (error) {
      console.error("Failed to save answers:", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [attempt]);

  const debouncedSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveAnswersToServer();
    }, DEBOUNCE_MS);
  }, [saveAnswersToServer]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleAnswer = useCallback(
    (questionIndex: number, option: string) => {
      if (viewState !== "active") return;

      setAnswers((prev) => {
        const updated = { ...prev, [questionIndex]: option };
        return updated;
      });

      // Update pending answers with question ID as key
      if (questions[questionIndex]) {
        pendingAnswersRef.current = {
          ...pendingAnswersRef.current,
          [questions[questionIndex].id]: option,
        };
        debouncedSave();
      }
    },
    [viewState, questions, debouncedSave]
  );

  const submitExam = useCallback(
    async (reason: "user_submitted" | "time_expired" = "user_submitted") => {
      if (!attempt || isSubmitting) return;

      setIsSubmitting(true);
      setShowConfirmDialog(false);

      // Cancel any pending debounced save
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Build final answers map keyed by question ID
      const finalAnswers: Record<string, string> = {};
      questions.forEach((q, index) => {
        if (answers[index]) {
          finalAnswers[q.id] = answers[index];
        }
      });

      try {
        const res = await fetch(`/api/test-attempt/${attempt.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: finalAnswers,
            status: "submitted",
            reason,
          }),
        });

        if (!res.ok) {
          console.error("Submit failed:", res.status);
          setIsSubmitting(false);
          return;
        }

        const data = await res.json();

        // Build review questions from the response
        const fullQuestions: QuizQuestion[] = (data.questions as FullQuestion[]).map(
          (q) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })
        );

        setReviewQuestions(fullQuestions);

        // Calculate score from response or locally
        if (data.attempt?.score != null) {
          setScore(data.attempt.score);
        } else {
          const userAnswers = fullQuestions.map((_, i) => answers[i] || "");
          const correctAnswers = fullQuestions.map((q) => q.correctAnswer);
          setScore(calculateScore(userAnswers, correctAnswers));
        }

        setViewState("submitted");
      } catch (error) {
        console.error("Submit error:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [attempt, isSubmitting, questions, answers]
  );

  const handleSubmitClick = useCallback(() => {
    const unanswered = calculateUnanswered(answers, questions.length);
    if (unanswered > 0) {
      setShowConfirmDialog(true);
    } else {
      submitExam("user_submitted");
    }
  }, [answers, questions.length, submitExam]);

  const handleExpire = useCallback(() => {
    submitExam("time_expired");
  }, [submitExam]);

  // Calculate remaining time based on server startedAt
  const getRemainingSeconds = useCallback((): number => {
    if (!session || !attempt) return 0;
    const startedAt = new Date(attempt.startedAt).getTime();
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(session.durationSeconds - elapsed, 0);
  }, [session, attempt]);

  // --- Loading State ---
  if (viewState === "loading") {
    return (
      <div className="flex min-h-[400px] items-center justify-center" data-testid="shared-quiz-loading">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-green-600" />
          <p className="mt-3 text-sm text-zinc-500">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // --- Expired State ---
  if (viewState === "expired") {
    return (
      <div className="flex min-h-[400px] items-center justify-center" data-testid="shared-quiz-expired">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-amber-900">Link Expired</h2>
          <p className="mt-2 text-sm text-amber-700">
            This quiz link has expired. Shared links are valid for 1 hour after creation.
          </p>
        </div>
      </div>
    );
  }

  // --- Invalid State ---
  if (viewState === "invalid") {
    return (
      <div className="flex min-h-[400px] items-center justify-center" data-testid="shared-quiz-invalid">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-900">Invalid Link</h2>
          <p className="mt-2 text-sm text-red-700">
            This quiz link is invalid or no longer available.
          </p>
        </div>
      </div>
    );
  }

  // --- Submitted / Results State ---
  if (viewState === "submitted") {
    const totalQuestions = reviewQuestions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    return (
      <div className="space-y-6" data-testid="shared-quiz-results">
        {/* Score Summary */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900">Quiz Results</h2>
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="text-3xl font-bold text-green-600">
              {score}/{totalQuestions}
            </div>
            <div className="text-lg text-zinc-500">({percentage}%)</div>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            You answered {score} out of {totalQuestions} questions correctly.
          </p>
        </div>

        {/* Questions in review mode */}
        <MCQCardUI
          questions={reviewQuestions}
          answers={answers}
          onAnswer={() => {}}
          mode="review"
        />
      </div>
    );
  }

  // --- Active Exam State ---
  const remainingSeconds = getRemainingSeconds();

  // Build QuizQuestion array for MCQCardUI (exam mode doesn't need correctAnswer/explanation but the type requires them)
  const examQuestions: QuizQuestion[] = questions.map((q) => ({
    question: q.question,
    options: q.options,
    correctAnswer: "",
    explanation: "",
  }));

  return (
    <div className="space-y-4" data-testid="shared-quiz-active">
      {/* Header with timer and submit */}
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <ExamTimer
          durationSeconds={remainingSeconds}
          onExpire={handleExpire}
          startedAt={new Date()}
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {Object.keys(answers).length}/{questions.length} answered
          </span>
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={isSubmitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      {/* Questions in exam mode */}
      <MCQCardUI
        questions={examQuestions}
        answers={answers}
        onAnswer={handleAnswer}
        mode="exam"
      />

      {/* Confirmation dialog for unanswered questions */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit with unanswered questions?</AlertDialogTitle>
            <AlertDialogDescription>
              You have{" "}
              <span className="font-semibold">
                {calculateUnanswered(answers, questions.length)}
              </span>{" "}
              unanswered question
              {calculateUnanswered(answers, questions.length) !== 1 ? "s" : ""}.
              Unanswered questions will be marked as incorrect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitExam("user_submitted")}>
              Submit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
