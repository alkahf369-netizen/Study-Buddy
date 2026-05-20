/**
 * Applies a single option selection to the answers map.
 * Returns a new object (immutable, last-write-wins for the given questionId).
 */
export function applySelectOption(
  map: Record<string, string>,
  questionId: string,
  option: string
): Record<string, string> {
  return { ...map, [questionId]: option };
}
