/**
 * Computes the remaining time in seconds for a test attempt.
 * Returns max(0, durationSeconds - elapsed), where elapsed = (nowMs - startedAtMs) / 1000.
 * Never returns a negative number.
 */
export function computeRemaining(
  durationSeconds: number,
  startedAtMs: number,
  nowMs: number
): number {
  return Math.max(0, durationSeconds - (nowMs - startedAtMs) / 1000);
}
