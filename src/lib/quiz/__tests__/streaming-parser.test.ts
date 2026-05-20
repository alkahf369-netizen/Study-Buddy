import { describe, it, expect, vi } from "vitest";
import { StreamingParser, StreamingParserCallbacks } from "../streaming-parser";
import { QuizQuestion } from "../types";

function createCallbacks() {
  const onQuestion = vi.fn();
  const onError = vi.fn();
  const onDone = vi.fn();
  const callbacks: StreamingParserCallbacks = { onQuestion, onError, onDone };
  return { callbacks, onQuestion, onError, onDone };
}

const validQuestion: QuizQuestion = {
  question: "What is 2+2?",
  options: ["3", "4", "5", "6"],
  correctAnswer: "4",
  explanation: "Basic arithmetic",
};

describe("StreamingParser", () => {
  describe("push() and question extraction", () => {
    it("should extract a complete question object from a single push", () => {
      const { callbacks, onQuestion } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      parser.push(JSON.stringify(validQuestion));
      parser.end();

      expect(onQuestion).toHaveBeenCalledWith(validQuestion, 0);
    });

    it("should extract a question from tokens pushed incrementally", () => {
      const { callbacks, onQuestion } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      const json = JSON.stringify(validQuestion);
      // Push one character at a time
      for (const char of json) {
        parser.push(char);
      }
      parser.end();

      expect(onQuestion).toHaveBeenCalledWith(validQuestion, 0);
    });

    it("should track sequential index starting at 0", () => {
      const { callbacks, onQuestion } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      const q1 = { ...validQuestion, question: "Q1?" };
      const q2 = { ...validQuestion, question: "Q2?" };

      parser.push(JSON.stringify(q1) + JSON.stringify(q2));
      parser.end();

      expect(onQuestion).toHaveBeenCalledTimes(2);
      expect(onQuestion).toHaveBeenCalledWith(q1, 0);
      expect(onQuestion).toHaveBeenCalledWith(q2, 1);
    });

    it("should handle questions within a JSON array", () => {
      const { callbacks, onQuestion } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      const questions = [
        { ...validQuestion, question: "Q1?" },
        { ...validQuestion, question: "Q2?" },
      ];
      parser.push(JSON.stringify(questions));
      parser.end();

      expect(onQuestion).toHaveBeenCalledTimes(2);
      expect(onQuestion).toHaveBeenCalledWith(questions[0], 0);
      expect(onQuestion).toHaveBeenCalledWith(questions[1], 1);
    });
  });

  describe("markdown fence stripping", () => {
    it("should strip ```json fences", () => {
      const { callbacks, onQuestion } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      parser.push("```json\n" + JSON.stringify(validQuestion) + "\n```");
      parser.end();

      expect(onQuestion).toHaveBeenCalledWith(validQuestion, 0);
    });

    it("should strip ```JSON fences", () => {
      const { callbacks, onQuestion } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      parser.push("```JSON\n" + JSON.stringify(validQuestion) + "\n```");
      parser.end();

      expect(onQuestion).toHaveBeenCalledWith(validQuestion, 0);
    });

    it("should strip plain ``` fences", () => {
      const { callbacks, onQuestion } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      parser.push("```\n" + JSON.stringify(validQuestion) + "\n```");
      parser.end();

      expect(onQuestion).toHaveBeenCalledWith(validQuestion, 0);
    });
  });

  describe("buffer overflow", () => {
    it("should emit error when buffer exceeds 512 KB", () => {
      const { callbacks, onError } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      // Push more than 512 KB of data
      const largeToken = "x".repeat(512 * 1024 + 1);
      parser.push(largeToken);

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining("Buffer overflow")
      );
    });

    it("should stop processing after overflow", () => {
      const { callbacks, onQuestion, onError } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      const largeToken = "x".repeat(512 * 1024 + 1);
      parser.push(largeToken);
      parser.push(JSON.stringify(validQuestion));
      parser.end();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onQuestion).not.toHaveBeenCalled();
    });
  });

  describe("end() and malformed content", () => {
    it("should emit onDone with collected questions", () => {
      const { callbacks, onDone } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      parser.push(JSON.stringify(validQuestion));
      parser.end();

      expect(onDone).toHaveBeenCalledWith([validQuestion], []);
    });

    it("should add warning for remaining unparseable content", () => {
      const { callbacks, onDone } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      parser.push(JSON.stringify(validQuestion) + '{"incomplete": true');
      parser.end();

      expect(onDone).toHaveBeenCalledWith(
        [validQuestion],
        expect.arrayContaining([expect.stringContaining("Skipped")])
      );
    });

    it("should warn about malformed question objects (missing fields)", () => {
      const { callbacks, onDone, onQuestion } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      const malformed = JSON.stringify({ question: "Q?", options: ["A"] });
      parser.push(malformed);
      parser.end();

      expect(onQuestion).not.toHaveBeenCalled();
      expect(onDone).toHaveBeenCalledWith(
        [],
        expect.arrayContaining([expect.stringContaining("malformed")])
      );
    });

    it("should emit onDone with empty arrays when no content is pushed", () => {
      const { callbacks, onDone } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      parser.end();

      expect(onDone).toHaveBeenCalledWith([], []);
    });
  });

  describe("getBufferSize()", () => {
    it("should return 0 for empty buffer", () => {
      const { callbacks } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      expect(parser.getBufferSize()).toBe(0);
    });

    it("should return byte size of buffer content", () => {
      const { callbacks } = createCallbacks();
      const parser = new StreamingParser(callbacks);

      parser.push("hello");
      // After push, buffer gets cleaned (fence-stripped) but "hello" stays
      expect(parser.getBufferSize()).toBe(5);
    });
  });
});
