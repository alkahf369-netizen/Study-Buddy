"use client";

import { useState, useEffect, useCallback } from "react";
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

type ExamModeViewProps = {
  questions: QuizQuestion[];
  durationSeconds: number;
  onExit: () => void;
};

type ExamState = "in_progress" | "submitted";

export default function ExamModeView({
  questions,
  durationSeconds,
  onExit,
}: ExamModeViewProps) {
  const [examState, setExamState] = useState<ExamState>("in_progress");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [score, setScore] = useState(0);

  // beforeunload warning during active exam
  useEffect(() => {
    if (examState !== "in_progress") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [examState]);

  const handleAnswer = useCallback(
    (questionIndex: number, option: string) => {
      if (examState !== "in_progress") return;
      setAnswers((prev) => ({ ...prev, [questionIndex]: option }));
    },
    [examState]
  );

  const submitExam = useCallback(() => {
    // Build user answers array aligned with questions
    const userAnswers = questions.map((_, i) => answers[i] || "");
    const correctAnswers = questions.map((q) => q.correctAnswer);
    const calculatedScore = calculateScore(userAnswers, correctAnswers);

    setScore(calculatedScore);
    setExamState("submitted");
    setShowConfirmDialog(false);
  }, [answers, questions]);

  const handleSubmitClick = useCallback(() => {
    const unanswered = calculateUnanswered(answers, questions.length);
    if (unanswered > 0) {
      setShowConfirmDialog(true);
    } else {
      submitExam();
    }
  }, [answers, questions.length, submitExam]);

  const handleExpire = useCallback(() => {
    submitExam();
  }, [submitExam]);

  const percentage = questions.length > 0
    ? Math.round((score / questions.length) * 100)
    : 0;

  // --- Results View ---
  if (examState === "submitted") {
    return (
      <div className="space-y-6" data-testid="exam-results">
        {/* Score Summary */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900">Exam Results</h2>
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="text-3xl font-bold text-green-600">
              {score}/{questions.length}
            </div>
            <div className="text-lg text-zinc-500">({percentage}%)</div>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            You answered {score} out of {questions.length} questions correctly.
          </p>
        </div>

        {/* Questions in review mode */}
        <MCQCardUI
          questions={questions}
          answers={answers}
          onAnswer={() => {}}
          mode="review"
        />

        {/* Exit button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  // --- In-Progress View ---
  return (
    <div className="space-y-4" data-testid="exam-in-progress">
      {/* Header with timer and submit */}
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <ExamTimer durationSeconds={durationSeconds} onExpire={handleExpire} />
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {Object.keys(answers).length}/{questions.length} answered
          </span>
          <button
            type="button"
            onClick={handleSubmitClick}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Questions in exam mode */}
      <MCQCardUI
        questions={questions}
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
            <AlertDialogAction onClick={submitExam}>
              Submit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
