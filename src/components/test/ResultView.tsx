"use client";
import { useState, useEffect } from 'react';
import type { AttemptResultPayload } from '@/lib/test/types';

type AttemptSummary = {
  id: string;
  takerIdentifier: string;
  status: string;
  reason: string | null;
  score: number | null;
  percentage: number | null;
  elapsedSeconds: number | null;
  submittedAt: string | null;
};

export default function ResultView({ token, attemptId }: { token: string; attemptId: string }) {
  const [data, setData] = useState<AttemptResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<AttemptSummary[] | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/test-attempt/${attemptId}`);
        if (res.status === 403) {
          setError('You do not have permission to view this result.');
          return;
        }
        if (res.status === 404) {
          setError('Result not found.');
          return;
        }
        if (!res.ok) {
          setError('Failed to load result.');
          return;
        }
        const payload: AttemptResultPayload = await res.json();
        setData(payload);

        // If owner view, fetch leaderboard
        if (payload.isOwnerView) {
          try {
            const lbRes = await fetch(`/api/test-session/${token}/attempts`);
            if (lbRes.ok) {
              const lbData = await lbRes.json();
              setLeaderboard(Array.isArray(lbData) ? lbData : lbData.attempts || []);
            }
          } catch {
            // Non-critical
          }
        }
      } catch {
        setError('Network error. Please try again.');
      }
    };
    fetchResult();
  }, [attemptId, token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">{error}</h1>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800" />
          <p className="mt-4 text-sm text-zinc-600">Loading results...</p>
        </div>
      </div>
    );
  }

  const { attempt, quiz, questions } = data;
  const isDisqualified = attempt.status === 'disqualified';
  const totalQuestions = questions.length;

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const reasonLabel = (reason: string | null) => {
    if (!reason) return '';
    const labels: Record<string, string> = {
      user_submitted: 'Submitted by user',
      time_expired: 'Time expired',
      tab_hidden: 'Switched tab',
      window_blur: 'Window lost focus',
      fullscreen_exited: 'Exited fullscreen',
      app_backgrounded: 'App backgrounded',
      right_click: 'Right-click detected',
      clipboard_use: 'Clipboard use detected',
    };
    return labels[reason] || reason;
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Disqualification banner */}
        {isDisqualified && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-red-800">Disqualified</h2>
                <p className="text-sm text-red-700">Reason: {reasonLabel(attempt.reason)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Score summary */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">{quiz.title || 'Test Result'}</h1>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-50 p-3 text-center">
              <div className="text-2xl font-bold text-zinc-900">
                {attempt.score ?? 0}/{totalQuestions}
              </div>
              <div className="mt-1 text-xs text-zinc-500">Score</div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-center">
              <div className="text-2xl font-bold text-zinc-900">
                {attempt.percentage !== null ? `${attempt.percentage}%` : '—'}
              </div>
              <div className="mt-1 text-xs text-zinc-500">Percentage</div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-center">
              <div className="text-2xl font-bold text-zinc-900">
                {formatTime(attempt.elapsedSeconds)}
              </div>
              <div className="mt-1 text-xs text-zinc-500">Time taken</div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 text-center">
              <div className={`text-2xl font-bold ${isDisqualified ? 'text-red-600' : attempt.status === 'submitted' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                {isDisqualified ? 'DQ' : attempt.status === 'submitted' ? '✓' : '—'}
              </div>
              <div className="mt-1 text-xs text-zinc-500">Status</div>
            </div>
          </div>
        </div>

        {/* Questions review */}
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Question Review</h2>
          {questions.map((q, idx) => {
            const isCorrect = q.selected === q.correctAnswer;
            const hasAnswer = q.selected !== null;
            return (
              <div key={q.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className={`flex h-6 min-w-[24px] items-center justify-center rounded-md px-1.5 text-xs font-semibold text-white ${
                    !hasAnswer ? 'bg-zinc-400' : isCorrect ? 'bg-emerald-600' : 'bg-red-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <h3 className="flex-1 text-sm font-medium text-zinc-900">{q.question}</h3>
                </div>

                <div className="mt-3 space-y-2 pl-9">
                  {q.options.map((option, oi) => {
                    const isSelected = q.selected === option;
                    const isCorrectOption = q.correctAnswer === option;
                    let optionClass = 'border-zinc-200 bg-white text-zinc-700';
                    if (isCorrectOption) optionClass = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                    if (isSelected && !isCorrectOption) optionClass = 'border-red-300 bg-red-50 text-red-800';

                    return (
                      <div
                        key={oi}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${optionClass}`}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                        <span className="flex-1">{option}</span>
                        {isCorrectOption && (
                          <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {isSelected && !isCorrectOption && (
                          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 pl-9">
                    <p className="text-xs text-zinc-600">
                      <span className="font-semibold text-zinc-800">Explanation: </span>
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Owner leaderboard */}
        {data.isOwnerView && leaderboard && leaderboard.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-900">All Attempts</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-600">#</th>
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-600">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-600">Score</th>
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-600">Percentage</th>
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-600">Time</th>
                    <th className="px-4 py-2.5 text-left font-medium text-zinc-600">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-4 py-2.5 text-zinc-700">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.status === 'disqualified'
                            ? 'bg-red-100 text-red-700'
                            : entry.status === 'submitted'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {entry.status === 'disqualified' ? 'DQ' : entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-700">{entry.score ?? '—'}</td>
                      <td className="px-4 py-2.5 text-zinc-700">
                        {entry.percentage !== null ? `${entry.percentage}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-700">{formatTime(entry.elapsedSeconds)}</td>
                      <td className="px-4 py-2.5 text-zinc-500">
                        {entry.submittedAt
                          ? new Date(entry.submittedAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
