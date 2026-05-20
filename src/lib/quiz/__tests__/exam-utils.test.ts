import { describe, it, expect } from "vitest";
import {
  calculateDuration,
  formatTime,
  calculateUnanswered,
  calculateScore,
  isSessionExpired,
} from "../exam-utils";

describe("calculateDuration", () => {
  it("returns 60 for 1 question", () => {
    expect(calculateDuration(1)).toBe(60);
  });

  it("returns 600 for 10 questions", () => {
    expect(calculateDuration(10)).toBe(600);
  });

  it("returns 1500 for 25 questions", () => {
    expect(calculateDuration(25)).toBe(1500);
  });
});

describe("formatTime", () => {
  it("formats 0 seconds as 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats 65 seconds as 01:05", () => {
    expect(formatTime(65)).toBe("01:05");
  });

  it("formats 3600 seconds as 60:00", () => {
    expect(formatTime(3600)).toBe("60:00");
  });

  it("formats 59 seconds as 00:59", () => {
    expect(formatTime(59)).toBe("00:59");
  });

  it("formats 600 seconds as 10:00", () => {
    expect(formatTime(600)).toBe("10:00");
  });

  it("zero-pads single digit minutes and seconds", () => {
    expect(formatTime(61)).toBe("01:01");
  });
});

describe("calculateUnanswered", () => {
  it("returns total when no answers provided", () => {
    expect(calculateUnanswered({}, 10)).toBe(10);
  });

  it("returns 0 when all questions answered", () => {
    const answers = { 0: "A", 1: "B", 2: "C" };
    expect(calculateUnanswered(answers, 3)).toBe(0);
  });

  it("returns correct count for partial answers", () => {
    const answers = { 0: "A", 2: "C" };
    expect(calculateUnanswered(answers, 5)).toBe(3);
  });
});

describe("calculateScore", () => {
  it("returns 0 when no answers match", () => {
    expect(calculateScore(["A", "B", "C"], ["D", "E", "F"])).toBe(0);
  });

  it("returns full score when all answers match", () => {
    expect(calculateScore(["A", "B", "C"], ["A", "B", "C"])).toBe(3);
  });

  it("returns correct count for partial matches", () => {
    expect(calculateScore(["A", "B", "C", "D"], ["A", "X", "C", "Y"])).toBe(2);
  });

  it("handles empty arrays", () => {
    expect(calculateScore([], [])).toBe(0);
  });

  it("handles arrays of different lengths", () => {
    expect(calculateScore(["A", "B"], ["A", "B", "C"])).toBe(2);
  });
});

describe("isSessionExpired", () => {
  it("returns false when access time equals creation time", () => {
    const createdAt = 1000000;
    expect(isSessionExpired(createdAt, createdAt)).toBe(false);
  });

  it("returns false when access time is within 1 hour", () => {
    const createdAt = 1000000;
    expect(isSessionExpired(createdAt, createdAt + 3600000)).toBe(false);
  });

  it("returns true when access time exceeds 1 hour", () => {
    const createdAt = 1000000;
    expect(isSessionExpired(createdAt, createdAt + 3600001)).toBe(true);
  });

  it("returns false when access time is before creation time", () => {
    const createdAt = 1000000;
    expect(isSessionExpired(createdAt, createdAt - 1)).toBe(false);
  });
});
