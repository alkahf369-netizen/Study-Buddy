import type { PageRange } from "./types";

export interface PageRangeValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a page range against constraints.
 * Rules:
 * - startPage and endPage must be integers
 * - startPage >= 1
 * - endPage >= startPage
 * - endPage <= totalPages (when totalPages is provided)
 */
export function validatePageRange(
  range: PageRange,
  totalPages?: number
): PageRangeValidationResult {
  const { startPage, endPage } = range;

  // Check that startPage is an integer
  if (!Number.isInteger(startPage)) {
    return { valid: false, error: "Page values must be integers" };
  }

  // Check that endPage is an integer
  if (!Number.isInteger(endPage)) {
    return { valid: false, error: "Page values must be integers" };
  }

  // startPage must be >= 1
  if (startPage < 1) {
    return {
      valid: false,
      error: "Invalid page range: startPage must be ≥ 1",
    };
  }

  // endPage must be >= startPage
  if (endPage < startPage) {
    return {
      valid: false,
      error: "Invalid page range: startPage must be ≤ endPage and ≥ 1",
    };
  }

  // endPage must be <= totalPages (when provided)
  if (totalPages !== undefined && endPage > totalPages) {
    return {
      valid: false,
      error: `Page range out of bounds: document has ${totalPages} pages`,
    };
  }

  return { valid: true };
}
