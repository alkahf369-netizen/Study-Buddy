/**
 * Computes the score and percentage for a set of answers against questions.
 * - score: count of questions where answers[q.id] === q.correctAnswer
 * - percentage: Math.round((score / questions.length) * 1000) / 10 (one decimal place)
 * - If questions.length === 0, returns { score: 0, percentage: 0 }
 */
export function computeScore(
  answers: Record<string, string>,
  questions: Array<{ id: string; correctAnswer: string }>
): { score: number; percentage: number } {
  if (questions.length === 0) {
    return { score: 0, percentage: 0 };
  }

  const score = questions.filter((q) => answers[q.id] === q.correctAnswer).length;
  const percentage = Math.round((score / questions.length) * 1000) / 10;

  return { score, percentage };
}
