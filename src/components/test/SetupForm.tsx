"use client";
import { useState } from 'react';

type Props = {
  quizId: string;
  mcqCount: number;
  onCreated: (link: string) => void;
  onClose: () => void;
};

export default function SetupForm({ quizId, mcqCount, onCreated, onClose }: Props) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testLink, setTestLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const durationSeconds = mcqCount * 60;

    setLoading(true);
    try {
      const res = await fetch('/api/test-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, durationSeconds }),
      });

      if (res.status === 401) {
        setError('Please sign in to share a quiz.');
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        setError("You don't own this quiz.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to generate share link.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      const fullLink = `${window.location.origin}${data.testLink}`;
      setTestLink(fullLink);
      onCreated(fullLink);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(testLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = testLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show link after creation
  if (testLink) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-zinc-900">Link ready!</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Share this link with your friends. The link expires in 1 hour.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <input
              type="text"
              readOnly
              value={testLink}
              className="flex-1 bg-transparent text-sm text-zinc-800 outline-none"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Share with Friends</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-sm text-zinc-600">
          Generate a temporary link for your friends to take this quiz ({mcqCount} questions, {mcqCount} min). The link expires in 1 hour.
        </p>

        <form onSubmit={handleSubmit} className="mt-5">
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
