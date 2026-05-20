"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import TimerDisplay from './TimerDisplay';
import ProctoringClient from './ProctoringClient';
import { computeRemaining } from '@/lib/test/timer';
import type { ViolationReason, RunnerQuestion } from '@/lib/test/types';

type RunnerState =
  | 'loading'
  | 'invalid'
  | 'expired'
  | 'notice'
  | 'in_progress'
  | 'submitting'
  | 'result';

type SessionData = {
  session: { durationSeconds: number; status: string; expiresAt: string | null };
  durationSeconds: number;
  attempt: { id: string; startedAt: string; status: string };
  questions: RunnerQuestion[];
  savedAnswers: Record<string, string>;
  isResume: boolean;
};

export default function TestRunner({ token }: { token: string }) {
  const [state, setState] = useState<RunnerState>('loading');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

  // Detect mobile UA
  const isMobile = typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  // Fetch session data on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/test-session/${token}`);
        if (res.status === 404) {
          setState('invalid');
          return;
        }
        if (res.status === 410) {
          setState('expired');
          return;
        }
        if (!res.ok) {
          setState('invalid');
          return;
        }
        const data = await res.json();
        setSessionData(data);
        setAnswers(data.savedAnswers || {});

        // Check if time already expired on resume
        const startedAt = new Date(data.attempt.startedAt);
        const remaining = computeRemaining(
          data.session.durationSeconds,
          startedAt.getTime(),
          Date.now()
        );
        if (remaining <= 0 && data.attempt.status === 'in_progress') {
          // Auto-submit with time_expired
          await submitAttempt(data.attempt.id, data.savedAnswers || {}, 'submitted', 'time_expired');
          return;
        }

        if (isMobile) {
          setState('notice');
        } else {
          requestFullscreenAndStart();
        }
      } catch {
        setState('invalid');
      }
    };
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const requestFullscreenAndStart = () => {
    const el = document.documentElement;
    if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => {
        // Fullscreen not available, continue anyway
      });
    }
    setState('in_progress');
  };

  const handleNoticeAccept = () => {
    requestFullscreenAndStart();
  };

  // Submit attempt helper
  const submitAttempt = async (
    attemptId: string,
    currentAnswers: Record<string, string>,
    status: 'submitted' | 'disqualified',
    reason: string
  ) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setState('submitting');

    try {
      const res = await fetch(`/api/test-attempt/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: currentAnswers, status, reason }),
      });

      if (res.ok || res.status === 410) {
        // Navigate to result page
        window.location.href = `/test/${token}/result/${attemptId}`;
      } else {
        setErrorMessage('Failed to submit. Please try again.');
        setState('in_progress');
        submittingRef.current = false;
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setState('in_progress');
      submittingRef.current = false;
    }
  };

  // Save answers to server (debounced)
  const saveAnswersToServer = useCallback((newAnswers: Record<string, string>) => {
    if (!sessionData) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/test-attempt/${sessionData.attempt.id}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: newAnswers }),
          keepalive: true,
        });
      } catch {
        // Silent fail — localStorage is the fallback
      }
    }, 250);
  }, [sessionData]);

  // Save to localStorage
  const saveToLocalStorage = useCallback((newAnswers: Record<string, string>) => {
    try {
      const key = `test_answers_${token}`;
      localStorage.setItem(key, JSON.stringify(newAnswers));
    } catch {
      // Silent fail
    }
  }, [token]);

  const handleAnswer = (questionId: string, option: string) => {
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);
    saveAnswersToServer(newAnswers);
    saveToLocalStorage(newAnswers);
  };

  const handleTimerExpire = useCallback(() => {
    if (!sessionData || submittingRef.current) return;
    submitAttempt(sessionData.attempt.id, answers, 'submitted', 'time_expired');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, answers]);

  const handleViolation = useCallback((reason: ViolationReason) => {
    if (!sessionData || submittingRef.current) return;
    submitAttempt(sessionData.attempt.id, answers, 'disqualified', reason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, answers]);

  const handleSubmit = () => {
    if (!sessionData) return;
    submitAttempt(sessionData.attempt.id, answers, 'submitted', 'user_submitted');
  };

  // Prevent in-app navigation via capture-phase click handler
  useEffect(() => {
    if (state !== 'in_progress') return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href && !anchor.href.includes('/test/')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [state]);

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800" />
          <p className="mt-4 text-sm text-zinc-600">Loading test...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (state === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">Invalid test link</h1>
          <p className="mt-2 text-sm text-zinc-600">This test link is not valid. Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  // Expired
  if (state === 'expired') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">This test link has expired</h1>
          <p className="mt-2 text-sm text-zinc-600">The test session is no longer available. Please contact the quiz owner for a new link.</p>
        </div>
      </div>
    );
  }

  // Mobile notice
  if (state === 'notice') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
          <h1 className="text-lg font-semibold text-zinc-900">Before you begin</h1>
          <p className="mt-3 text-sm text-zinc-600">This is a proctored test. The following actions will immediately disqualify you:</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Switching to another app or tab
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Minimizing the browser
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Using copy, cut, or paste
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              Right-clicking on the test
            </li>
          </ul>
          <button
            onClick={handleNoticeAccept}
            className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            I understand, start the test
          </button>
        </div>
      </div>
    );
  }

  // Submitting
  if (state === 'submitting') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800" />
          <p className="mt-4 text-sm text-zinc-600">Submitting your answers...</p>
        </div>
      </div>
    );
  }

  // In progress
  if (state !== 'in_progress' || !sessionData) return null;

  const { questions } = sessionData;
  const currentQuestion = questions[currentIndex];
  const startedAt = new Date(sessionData.attempt.startedAt);
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div ref={containerRef} className="flex min-h-screen flex-col">
      {/* Header bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="text-sm font-medium text-zinc-700">
          Question {currentIndex + 1} of {questions.length}
        </div>
        <TimerDisplay
          startedAt={startedAt}
          durationSeconds={sessionData.session.durationSeconds}
          onExpire={handleTimerExpire}
        />
      </header>

      {/* Question content */}
      <main className="flex flex-1 flex-col items-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <h2 className="text-lg font-semibold text-zinc-900 leading-relaxed">
            {currentQuestion.question}
          </h2>

          <div className="mt-6 space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = answers[currentQuestion.id] === option;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                    isSelected
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                      isSelected
                        ? 'border-white bg-white text-zinc-900'
                        : 'border-zinc-300 text-zinc-600'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="sticky bottom-0 flex items-center justify-between border-t border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Submit
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Next
          </button>
        )}
      </footer>

      {/* Proctoring client (headless) */}
      <ProctoringClient
        attemptId={sessionData.attempt.id}
        containerRef={containerRef}
        onViolation={handleViolation}
      />
    </div>
  );
}
