"use client";

import { useState, useEffect, useRef } from "react";
import { formatTime } from "@/lib/quiz/exam-utils";

type ExamTimerProps = {
  durationSeconds: number;
  onExpire: () => void;
  startedAt?: Date;
};

export default function ExamTimer({
  durationSeconds,
  onExpire,
  startedAt,
}: ExamTimerProps) {
  const startTimeRef = useRef<number>(
    startedAt ? startedAt.getTime() : Date.now()
  );
  const expiredRef = useRef(false);

  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor(
      (Date.now() - startTimeRef.current) / 1000
    );
    return Math.max(durationSeconds - elapsed, 0);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      const r = Math.max(durationSeconds - elapsed, 0);
      setRemaining(r);

      if (r <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [durationSeconds, onExpire]);

  const isUrgent = remaining <= 60;

  return (
    <div
      className={`font-mono text-lg font-bold tabular-nums ${
        isUrgent ? "text-red-600" : "text-zinc-800"
      }`}
      aria-live="polite"
      aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}
    >
      {formatTime(remaining)}
    </div>
  );
}
