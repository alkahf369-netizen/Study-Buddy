/**
 * Utility functions for exam mode calculations and formatting.
 * All functions are pure with no side effects.
 */

/**
 * Calculates the exam duration in seconds based on the number of questions.
 * Each question is allocated 60 seconds.
 *
 * @param n - Positive integer representing the number of questions
 * @returns Duration in seconds (n * 60)
 */
export function calculateDuration(n: number): number {
  return n * 60;
}

/**
 * Formats a number of seconds into a zero-padded MM:SS string.
 *
 * @param seconds - Non-negative integer of seconds
 * @returns Formatted string in MM:SS format (e.g., 65 → "01:05", 3600 → "60:00")
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(remainingSeconds).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Calculates the number of unanswered questions.
 *
 * @param answers - Record mapping question index to selected answer
 * @param totalQuestions - Total number of questions in the quiz
 * @returns Number of unanswered questions
 */
export function calculateUnanswered(
  answers: Record<number, string>,
  totalQuestions: number
): number {
  return totalQuestions - Object.keys(answers).length;
}

/**
 * Calculates the score by counting matching answers at each index.
 *
 * @param userAnswers - Array of user's selected answers
 * @param correctAnswers - Array of correct answers
 * @returns Number of correct answers (matching indices)
 */
export function calculateScore(
  userAnswers: string[],
  correctAnswers: string[]
): number {
  let score = 0;
  const length = Math.min(userAnswers.length, correctAnswers.length);
  for (let i = 0; i < length; i++) {
    if (userAnswers[i] === correctAnswers[i]) {
      score++;
    }
  }
  return score;
}

/**
 * Determines if a session has expired based on creation time and access time.
 * Sessions expire after 3,600,000 milliseconds (1 hour).
 *
 * @param createdAt - Timestamp (ms) when the session was created
 * @param accessTime - Timestamp (ms) when the session is being accessed
 * @returns true if the session is expired (accessTime > createdAt + 3600000)
 */
export function isSessionExpired(
  createdAt: number,
  accessTime: number
): boolean {
  return accessTime > createdAt + 3600000;
}
