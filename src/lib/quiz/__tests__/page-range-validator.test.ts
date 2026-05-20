import { describe, it, expect } from "vitest";
import { validatePageRange } from "../page-range-validator";

describe("validatePageRange", () => {
  describe("valid ranges", () => {
    it("accepts a valid range within bounds", () => {
      const result = validatePageRange({ startPage: 1, endPage: 10 }, 42);
      expect(result).toEqual({ valid: true });
    });

    it("accepts start equal to end (single page)", () => {
      const result = validatePageRange({ startPage: 5, endPage: 5 }, 10);
      expect(result).toEqual({ valid: true });
    });

    it("accepts range without totalPages constraint", () => {
      const result = validatePageRange({ startPage: 1, endPage: 100 });
      expect(result).toEqual({ valid: true });
    });

    it("accepts endPage equal to totalPages", () => {
      const result = validatePageRange({ startPage: 1, endPage: 42 }, 42);
      expect(result).toEqual({ valid: true });
    });
  });

  describe("integer validation", () => {
    it("rejects non-integer startPage", () => {
      const result = validatePageRange({ startPage: 1.5, endPage: 10 }, 42);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("integers");
    });

    it("rejects non-integer endPage", () => {
      const result = validatePageRange({ startPage: 1, endPage: 10.5 }, 42);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("integers");
    });

    it("rejects NaN startPage", () => {
      const result = validatePageRange({ startPage: NaN, endPage: 10 }, 42);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("integers");
    });

    it("rejects Infinity endPage", () => {
      const result = validatePageRange({ startPage: 1, endPage: Infinity }, 42);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("integers");
    });
  });

  describe("startPage >= 1", () => {
    it("rejects startPage of 0", () => {
      const result = validatePageRange({ startPage: 0, endPage: 10 }, 42);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("startPage must be ≥ 1");
    });

    it("rejects negative startPage", () => {
      const result = validatePageRange({ startPage: -1, endPage: 10 }, 42);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("startPage must be ≥ 1");
    });
  });

  describe("endPage >= startPage", () => {
    it("rejects endPage less than startPage", () => {
      const result = validatePageRange({ startPage: 10, endPage: 5 }, 42);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("startPage must be ≤ endPage");
    });
  });

  describe("endPage <= totalPages", () => {
    it("rejects endPage exceeding totalPages", () => {
      const result = validatePageRange({ startPage: 1, endPage: 50 }, 42);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("document has 42 pages");
    });

    it("does not check totalPages when not provided", () => {
      const result = validatePageRange({ startPage: 1, endPage: 10000 });
      expect(result).toEqual({ valid: true });
    });
  });
});
