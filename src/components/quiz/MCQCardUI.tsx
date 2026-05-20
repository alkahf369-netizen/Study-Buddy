"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, X, Lightbulb } from "lucide-react";
import { MathMarkdown } from "@/components/ui/MathMarkdown";

// --- Types ---

export type MCQCardMode = "practice" | "exam" | "review";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type MCQCardUIProps = {
  questions: QuizQuestion[];
  answers: Record<number, string>;
  onAnswer: (questionIndex: number, option: string) => void;
  mode: MCQCardMode;
};

// --- Single Question Card ---

function QuestionCard({
  question,
  questionIndex,
  selectedAnswer,
  onAnswer,
  mode,
}: {
  question: QuizQuestion;
  questionIndex: number;
  selectedAnswer: string | undefined;
  onAnswer: (option: string) => void;
  mode: MCQCardMode;
}) {
  const hasAnswered = selectedAnswer !== undefined;

  // Determine if we should show correct/incorrect feedback
  const showFeedback = mode === "practice" && hasAnswered;
  const showReview = mode === "review";
  const showExplanation = showFeedback || showReview;

  return (
    <div
      data-testid={`mcq-card-${questionIndex}`}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
    >
      {/* Question header with badge */}
      <div className="mb-4 flex items-start gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white"
          aria-label={`Question ${questionIndex + 1}`}
        >
          Q{questionIndex + 1}
        </span>
        <h3 className="flex-1 text-[15px] font-semibold leading-relaxed text-zinc-900 sm:text-base">
          <MathMarkdown content={question.question} inline />
        </h3>
      </div>

      {/* Options grid: 2x2 on sm+, 1 column on mobile */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === question.correctAnswer;

          // Determine option styling based on mode
          let optionClasses = "";
          let indicatorContent: React.ReactNode = null;

          if (showReview) {
            // Review mode: highlight all correct answers
            if (isCorrect) {
              optionClasses =
                "border-green-500 bg-green-50 text-green-900";
              indicatorContent = (
                <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={3} />
              );
            } else if (isSelected && !isCorrect) {
              optionClasses =
                "border-red-400 bg-red-50 text-red-900";
              indicatorContent = (
                <X className="h-3.5 w-3.5 text-red-500" strokeWidth={3} />
              );
            } else {
              optionClasses = "border-zinc-200 bg-zinc-50 text-zinc-600 opacity-60";
            }
          } else if (showFeedback) {
            // Practice mode after answering
            if (isCorrect) {
              optionClasses =
                "border-green-500 bg-green-50 text-green-900";
              indicatorContent = (
                <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={3} />
              );
            } else if (isSelected && !isCorrect) {
              optionClasses =
                "border-red-400 bg-red-50 text-red-900";
              indicatorContent = (
                <X className="h-3.5 w-3.5 text-red-500" strokeWidth={3} />
              );
            } else {
              optionClasses = "border-zinc-200 bg-zinc-50 text-zinc-500 opacity-55";
            }
          } else if (mode === "exam" && isSelected) {
            // Exam mode: only highlight selection
            optionClasses =
              "border-blue-500 bg-blue-50 text-blue-900";
            indicatorContent = (
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            );
          } else {
            // Default unselected state
            optionClasses =
              "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50";
          }

          const isDisabled =
            mode === "review" || (mode === "practice" && hasAnswered);

          return (
            <button
              key={optionIndex}
              data-testid={`mcq-${questionIndex}-option-${optionIndex}`}
              type="button"
              disabled={isDisabled}
              onClick={() => onAnswer(option)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                isDisabled ? "cursor-default" : "cursor-pointer",
                optionClasses
              )}
            >
              {/* Radio-style indicator */}
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  showReview && isCorrect
                    ? "border-green-500 bg-green-100"
                    : showReview && isSelected && !isCorrect
                    ? "border-red-400 bg-red-100"
                    : showFeedback && isCorrect
                    ? "border-green-500 bg-green-100"
                    : showFeedback && isSelected && !isCorrect
                    ? "border-red-400 bg-red-100"
                    : mode === "exam" && isSelected
                    ? "border-blue-500 bg-blue-100"
                    : "border-zinc-300 bg-white"
                )}
              >
                {indicatorContent}
              </span>

              {/* Option text */}
              <span className="flex-1 leading-snug"><MathMarkdown content={option} inline /></span>
            </button>
          );
        })}
      </div>

      {/* Explanation (practice mode after answer, or review mode) */}
      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-out",
          showExplanation
            ? "mt-4 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0">
          <div
            data-testid={`mcq-${questionIndex}-explanation`}
            className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                Explanation
              </p>
              <div className="mt-1 text-sm leading-relaxed text-amber-900">
                <MathMarkdown content={question.explanation} inline />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main MCQCardUI Component ---

export function MCQCardUI({ questions, answers, onAnswer, mode }: MCQCardUIProps) {
  return (
    <div className="space-y-4" data-testid="mcq-card-ui">
      {questions.map((question, index) => (
        <QuestionCard
          key={index}
          question={question}
          questionIndex={index}
          selectedAnswer={answers[index]}
          onAnswer={(option) => onAnswer(index, option)}
          mode={mode}
        />
      ))}
    </div>
  );
}

export default MCQCardUI;
