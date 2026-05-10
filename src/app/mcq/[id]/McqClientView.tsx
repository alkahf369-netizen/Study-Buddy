"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, X, Target, Lightbulb, Zap, Plus, RefreshCw, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

/* ---------------- Best-score memory ---------------- */
const GRADE_TABLE = [
  { min: 97, grade: "A+", remark: "Outstanding work!" },
  { min: 93, grade: "A",  remark: "Excellent — very well done." },
  { min: 90, grade: "A-", remark: "Great job, nearly perfect." },
  { min: 87, grade: "B+", remark: "Strong performance." },
  { min: 83, grade: "B",  remark: "Solid effort, keep it up." },
  { min: 80, grade: "B-", remark: "Good attempt — a bit more to polish." },
  { min: 77, grade: "C+", remark: "Decent, keep practicing." },
  { min: 73, grade: "C",  remark: "Room to improve — you can do it." },
  { min: 70, grade: "C-", remark: "Needs more review." },
  { min: 67, grade: "D+", remark: "Revise the basics and try again." },
  { min: 63, grade: "D",  remark: "Keep at it — review and retry." },
  { min: 60, grade: "D-", remark: "Don't give up — practice helps." },
  { min: 0,  grade: "F",  remark: "Review the material and try once more." },
];

const gradeFor = (pct: number) => GRADE_TABLE.find((g) => pct >= g.min) || GRADE_TABLE[GRADE_TABLE.length - 1];

const RED_PEN = "#c42a30";
const HAND_FONT = "'Edu VIC WA NT Beginner', 'Comic Sans MS', cursive";

const BEST_SCORES_KEY = "sa.bestscores.v1";

const loadBestScores = () => {
  try {
    const raw = window.localStorage.getItem(BEST_SCORES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveBestScores = (obj: any) => {
  try {
    window.localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
};

const quizKeyOf = (title: string, total: number) => `${(title || "quiz").trim()}::${total}`;

/* ---------------- MCQ Card Component ---------------- */
const MCQCard = ({ q, index, selected, onSelect }: any) => {
  const answered = selected !== null && selected !== undefined;

  return (
    <div
      data-testid={`mcq-card-${index}`}
      className="group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 sm:p-6"
      style={{
        background: "linear-gradient(180deg, #fbf4de 0%, #f4ead0 60%, #eeddb6 100%)",
        borderColor: "#c7ad78",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(90,60,20,0.06), 0 10px 28px rgba(120,85,30,0.10)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(139,101,45,0.18) 27px, rgba(139,101,45,0.18) 28px)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-8"
        style={{ background: "linear-gradient(90deg, rgba(139,101,45,0.10), transparent)" }}
      />

      <div className="relative mb-5 flex items-start gap-3">
        <div
          className="flex h-8 min-w-[32px] shrink-0 items-center justify-center rounded-md px-2 text-[12px] font-semibold"
          style={{ background: "#2a2218", color: "#fbf4de", boxShadow: "0 1px 0 rgba(255,255,255,0.15) inset" }}
        >
          Q{index + 1}
        </div>
        <h3 className="flex-1 text-[15px] leading-relaxed md:text-[17px]" style={{ color: "#2a2218", fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 650, letterSpacing: "-0.005em" }}>
          {q.question}
        </h3>
        <span className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: "#fff9e8", borderColor: "#c7ad78", color: "#6b5434" }}>
          <Target className="h-[10px] w-[10px]" />
          1 pt
        </span>
      </div>

      <div className="relative grid gap-2 sm:grid-cols-2">
        {q.options && typeof q.options === 'string' ? JSON.parse(q.options).map((opt: string, i: number) => renderOption(opt, i)) : q.options.map((opt: string, i: number) => renderOption(opt, i))}
      </div>

      <div className={cn("relative grid overflow-hidden transition-all duration-500 ease-out", answered ? "mt-5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0")}>
        <div className="min-h-0">
          <div className="flex gap-3 rounded-xl border p-4" style={{ background: "rgba(255,249,220,0.75)", borderColor: "#c7ad78" }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(234,179,8,0.18)", color: "#8a6a10", boxShadow: "inset 0 0 0 1px rgba(234,179,8,0.35)" }}>
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8a6a10", fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 700 }}>
                Explanation
              </div>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "#3a2f1e", fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 500 }}>
                {q.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function renderOption(opt: string, i: number) {
    const isSelected = selected === opt;
    const isCorrect = opt === q.correctAnswer;
    const showTick = answered && isCorrect;
    const showCross = answered && isSelected && !isCorrect;

    return (
      <button
        key={i}
        disabled={answered}
        onClick={() => onSelect(opt)}
        className={cn(
          "group/opt relative flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[13.5px] transition-all duration-200",
          !answered && "hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(120,85,30,0.15)]",
          answered && !isSelected && !isCorrect && "opacity-55"
        )}
        style={{
          borderColor: showCross ? "#b23939" : showTick ? "#2a2218" : "rgba(139,101,45,0.35)",
          background: showCross ? "rgba(223,92,92,0.08)" : showTick ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.35)",
          color: "#2a2218",
          fontFamily: "'Edu VIC WA NT Beginner', 'Comic Sans MS', cursive",
          fontWeight: 500, fontSize: "15px", lineHeight: "1.4",
        }}
      >
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] transition-colors"
          style={{
            borderColor: showCross ? "#b23939" : showTick ? "#2a2218" : "#8a7348",
            background: showTick ? "#fbf4de" : showCross ? "#fff" : "rgba(255,255,255,0.6)",
          }}
        >
          {showTick && <Check className="h-[14px] w-[14px]" strokeWidth={3} style={{ color: "#2a2218" }} />}
          {showCross && <X className="h-[14px] w-[14px]" strokeWidth={3} style={{ color: "#b23939" }} />}
        </div>
        <span className="flex-1 leading-snug">
          <span className="mr-1.5 font-semibold" style={{ color: "#6b5434", fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 650 }}>
            {String.fromCharCode(65 + i)}.
          </span>
          {opt}
        </span>
      </button>
    );
  }
};

/* ---------------- Quiz Result Component ---------------- */
const QuizResult = ({ correct, total, onRetry, onClose, title, quizId, initialIsSaved, isLoggedIn }: any) => {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const { grade, remark } = gradeFor(pct);
  const dateStr = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  
  const [compare, setCompare] = useState<any>(null);
  const persistedRef = useRef(false);

  // Save UI state
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [saveTitle, setSaveTitle] = useState(title);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (persistedRef.current) return;
    persistedRef.current = true;

    const all = loadBestScores();
    const key = quizKeyOf(title, total);
    const prior = all[key];
    const attemptsNow = (prior?.attempts || 0) + 1;

    let status;
    if (!prior) status = "first";
    else if (correct > prior.bestCorrect) status = "new-best";
    else if (correct === prior.bestCorrect) status = "matched";
    else status = "below";

    setCompare({
      status, attempts: attemptsNow,
      priorBest: prior ? { bestCorrect: prior.bestCorrect, bestGrade: prior.bestGrade, bestPct: prior.bestPct } : null,
      delta: prior ? correct - prior.bestCorrect : null,
    });

    const shouldUpdateBest = !prior || correct > prior.bestCorrect;
    all[key] = {
      bestCorrect: shouldUpdateBest ? correct : prior.bestCorrect,
      bestPct: shouldUpdateBest ? pct : prior.bestPct,
      bestGrade: shouldUpdateBest ? grade : prior.bestGrade,
      attempts: attemptsNow, lastAt: new Date().toISOString(),
    };
    saveBestScores(all);
  }, [correct, title, total, pct, grade]);

  const handleSave = async () => {
    if (!isLoggedIn) {
      alert("Please log in to save exams.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: saveTitle }),
      });
      if (res.ok) setIsSaved(true);
      else alert("Failed to save quiz");
    } catch (e) {
      alert("Error saving quiz");
    }
    setIsSaving(false);
  };

  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl border p-5 sm:p-7" style={{ background: "linear-gradient(180deg, #fbf4de 0%, #f4ead0 60%, #eeddb6 100%)", borderColor: "#c7ad78", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(90,60,20,0.06), 0 10px 28px rgba(120,85,30,0.12)" }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.35]" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(139,101,45,0.18) 27px, rgba(139,101,45,0.18) 28px)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-8" style={{ background: "linear-gradient(90deg, rgba(139,101,45,0.10), transparent)" }} />

      {compare?.status === "new-best" && (
        <div className="sa-stamp-in pointer-events-none absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
          <div className="flex flex-col items-center justify-center rounded-full px-3 py-2 text-center" style={{ border: `2.5px solid ${RED_PEN}`, color: RED_PEN, background: "rgba(255,249,220,0.92)", fontFamily: HAND_FONT, fontWeight: 700, lineHeight: 1, boxShadow: "0 4px 12px rgba(196,42,48,0.22)" }}>
            <span style={{ fontSize: "11px", letterSpacing: "0.1em" }}>★ NEW ★</span>
            <span style={{ fontSize: "18px", marginTop: 2 }}>BEST!</span>
          </div>
        </div>
      )}

      <div className="relative mb-4 flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#8a6a10", fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 700 }}>Result sheet</div>
          <div className="mt-1 text-[11.5px]" style={{ color: "#8a7348", fontFamily: "'Manrope', system-ui, sans-serif" }}>Graded on {dateStr}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition hover:-translate-y-0.5" style={{ borderColor: "#c7ad78", background: "rgba(255,255,255,0.55)", color: "#3a2f1e", fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 650 }}>
            <RefreshCw className="h-[13px] w-[13px]" /> Retry
          </button>
          {onClose && (
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border transition hover:-translate-y-0.5" style={{ borderColor: "#c7ad78", background: "rgba(255,255,255,0.55)", color: "#3a2f1e" }}>
              <X className="h-[15px] w-[15px]" />
            </button>
          )}
        </div>
      </div>

      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
        <div className="relative flex h-[128px] w-[128px] shrink-0 items-center justify-center self-center sm:self-auto">
          <svg viewBox="0 0 128 128" className="absolute inset-0" aria-hidden="true">
            <ellipse cx="64" cy="64" rx="56" ry="52" fill="none" stroke={RED_PEN} strokeWidth="2.4" strokeLinecap="round" transform="rotate(-6 64 64)" style={{ opacity: 0.92 }} />
            <ellipse cx="64" cy="64" rx="54" ry="50" fill="none" stroke={RED_PEN} strokeWidth="1.6" strokeLinecap="round" transform="rotate(-2 64 64)" style={{ opacity: 0.55 }} />
          </svg>
          <span style={{ color: RED_PEN, fontFamily: HAND_FONT, fontWeight: 700, fontSize: grade.length > 1 ? "64px" : "78px", lineHeight: 1, transform: "rotate(-4deg)", textShadow: "0 1px 0 rgba(196,42,48,0.15)" }}>{grade}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[13px] uppercase tracking-wider" style={{ color: "#6b5434", fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: 650 }}>Score</span>
            <span style={{ color: RED_PEN, fontFamily: HAND_FONT, fontWeight: 700, fontSize: "40px", lineHeight: 1, transform: "rotate(-2deg)", display: "inline-block" }}>{correct}/{total}</span>
            <span style={{ color: RED_PEN, fontFamily: HAND_FONT, fontWeight: 600, fontSize: "24px", lineHeight: 1, transform: "rotate(-1deg)", display: "inline-block", opacity: 0.9 }}>({pct}%)</span>
          </div>
          <svg viewBox="0 0 240 10" preserveAspectRatio="none" className="mt-1 h-[8px] w-[180px] max-w-full" aria-hidden="true">
            <path d="M 2 6 Q 60 2, 120 5 T 238 4" fill="none" stroke={RED_PEN} strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.85 }} />
          </svg>
          <p className="mt-4 leading-snug" style={{ color: RED_PEN, fontFamily: HAND_FONT, fontWeight: 600, fontSize: "19px", transform: "rotate(-0.8deg)", transformOrigin: "left center", display: "inline-block" }}>{remark}</p>
        </div>
      </div>

      {/* Save Exam Section */}
      <div className="mt-8 pt-6 border-t border-[#c7ad78]/40 relative">
        <h4 className="text-[14px] font-semibold text-[#6b5434] mb-3">Save Exam to Profile</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            disabled={isSaved || isSaving}
            className="flex-1 rounded-lg border border-[#c7ad78] bg-white/70 px-3 py-2 text-[14px] text-[#2a2218] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#c7ad78]/50 disabled:opacity-60"
            placeholder="Name this exam (e.g. History Midterm)"
          />
          <button
            onClick={handleSave}
            disabled={isSaved || isSaving}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[14px] font-semibold transition-all",
              isSaved
                ? "bg-[#8a7348] text-white opacity-90"
                : "bg-black text-white hover:bg-[#2a2218] shadow-[0_4px_10px_rgba(0,0,0,0.15)]"
            )}
          >
            {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving..." : isSaved ? "Saved" : "Save Exam"}
          </button>
        </div>
        {!isLoggedIn && <p className="mt-2 text-[12px] text-red-600 font-medium">You must be logged in to save exams.</p>}
      </div>
    </div>
  );
};

/* ---------------- Main Client View ---------------- */
export default function McqClientView({ initialQuiz, isSaved: initialIsSaved, isLoggedIn }: any) {
  const router = useRouter();
  const questions = initialQuiz.questions;
  const total = questions.length;
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  const answeredCount = Object.keys(answers).length;
  const correct = Object.entries(answers).filter(
    ([idx, ans]) => questions[Number(idx)].correctAnswer === ans
  ).length;
  const completed = total > 0 && answeredCount === total;

  const [resultOpen, setResultOpen] = useState(false);
  const prevCompletedRef = useRef(false);

  useEffect(() => {
    if (completed && !prevCompletedRef.current) {
      const t = setTimeout(() => setResultOpen(true), 350);
      prevCompletedRef.current = true;
      return () => clearTimeout(t);
    }
    if (!completed) prevCompletedRef.current = false;
  }, [completed]);

  const handleAnswer = (index: number, opt: string) => {
    setAnswers(prev => ({ ...prev, [index]: opt }));
  };

  const handleReset = () => {
    setAnswers({});
    setResultOpen(false);
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-700">
            <Zap className="h-3 w-3 text-amber-500" />
            Study AI Quiz
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-black">
            {initialQuiz.title}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {total} questions · Pick an option to reveal the explanation
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-black"
          >
            Back to Chat
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-black"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Progress: <span className="font-semibold text-black">{answeredCount}/{total}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Target className="h-[12px] w-[12px] text-zinc-700" />
            Score: <span className="font-semibold text-black tabular-nums">{correct}</span>
            <span className="text-zinc-400">/ {total} pts</span>
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-black transition-all duration-500 ease-out"
            style={{ width: `${(answeredCount / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q: any, i: number) => (
          <MCQCard
            key={i}
            q={q}
            index={i}
            selected={answers[i]}
            onSelect={(opt: string) => handleAnswer(i, opt)}
          />
        ))}
      </div>

      {completed && !resultOpen && (
        <button
          onClick={() => setResultOpen(true)}
          className="fixed bottom-12 right-4 z-30 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold shadow-lg transition hover:-translate-y-0.5 sm:bottom-12 sm:right-6"
          style={{ background: "linear-gradient(180deg, #fbf4de 0%, #eeddb6 100%)", borderColor: "#c7ad78", color: RED_PEN, fontFamily: HAND_FONT, fontWeight: 700, boxShadow: "0 10px 28px rgba(120,85,30,0.22)" }}
        >
          <Target className="h-[14px] w-[14px]" style={{ color: RED_PEN }} />
          View Result
        </button>
      )}

      {resultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResultOpen(false)} />
          <div className="relative z-10 w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl [scrollbar-width:none]">
            <QuizResult
              correct={correct}
              total={total}
              onRetry={() => { setResultOpen(false); handleReset(); }}
              onClose={() => setResultOpen(false)}
              title={initialQuiz.title}
              quizId={initialQuiz.id}
              initialIsSaved={initialIsSaved}
              isLoggedIn={isLoggedIn}
            />
          </div>
        </div>
      )}
    </section>
  );
}
