import { z } from 'zod';

/**
 * Validates a duration value expressed in minutes.
 * Accepts integers in [1, 240].
 */
export function validateDurationMinutes(value: unknown): { ok: true; minutes: number } | { ok: false; error: string } {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return { ok: false, error: 'Duration must be a whole number of minutes' };
  }
  if (value < 1 || value > 240) {
    return { ok: false, error: 'Duration must be between 1 and 240 minutes' };
  }
  return { ok: true, minutes: value };
}

/** Zod schema for duration in seconds: integers in [60, 14400] */
export const durationSecondsSchema = z.number().int().min(60).max(14400);

/** Zod schema for the create-session request body */
export const createSessionRequestSchema = z.object({
  quizId: z.string().min(1),
  durationSeconds: z.number().int().min(60).max(14400).optional(),
});

/** Zod schema for the answers-update request body */
export const answersUpdateSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

/** Zod schema for the submit request body */
export const submitRequestSchema = z.object({
  answers: z.record(z.string(), z.string()),
  status: z.enum(['submitted', 'disqualified']),
  reason: z.enum([
    'user_submitted',
    'time_expired',
    'tab_hidden',
    'window_blur',
    'fullscreen_exited',
    'app_backgrounded',
    'right_click',
    'clipboard_use',
  ]),
});
