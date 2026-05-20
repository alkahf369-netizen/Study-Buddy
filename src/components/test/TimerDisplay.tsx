"use client";
import { useState, useEffect, useRef } from 'react';
import { computeRemaining } from '@/lib/test/timer';

type Props = {
  startedAt: Date;
  durationSeconds: number;
  onExpire: () => void;
};

export default function TimerDisplay({ startedAt, durationSeconds, onExpire }: Props) {
  const [remaining, setRemaining] = useState(() =>
    computeRemaining(durationSeconds, startedAt.getTime(), Date.now())
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const r = computeRemaining(durationSeconds, startedAt.getTime(), Date.now());
      setRemaining(r);
      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [startedAt, durationSeconds, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const isLow = remaining <= 60;

  return (
    <div
      className={`font-mono text-lg font-bold tabular-nums ${isLow ? 'text-red-600 animate-pulse' : 'text-zinc-800'}`}
      aria-live="polite"
      aria-label={`${mins} minutes ${secs} seconds remaining`}
    >
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}
