import { QuizQuestion } from "./types";

/**
 * Callbacks for the StreamingParser to emit parsed questions, errors, and completion.
 */
export interface StreamingParserCallbacks {
  onQuestion: (question: QuizQuestion, index: number) => void;
  onError: (message: string) => void;
  onDone: (questions: QuizQuestion[], warnings: string[]) => void;
}

/** Maximum buffer size in bytes (512 KB) */
const MAX_BUFFER_SIZE = 512 * 1024;

/**
 * StreamingParser accumulates AI model tokens and detects complete JSON question objects.
 *
 * It strips markdown code fences, extracts valid question objects as they become complete,
 * and emits them via callbacks. Handles buffer overflow and malformed data gracefully.
 */
export class StreamingParser {
  private buffer: string;
  private questions: QuizQuestion[];
  private warnings: string[];
  private currentIndex: number;
  private callbacks: StreamingParserCallbacks;
  private overflowed: boolean;

  constructor(callbacks: StreamingParserCallbacks) {
    this.buffer = "";
    this.questions = [];
    this.warnings = [];
    this.currentIndex = 0;
    this.callbacks = callbacks;
    this.overflowed = false;
  }

  /**
   * Append a token to the buffer and attempt to extract complete question objects.
   */
  push(token: string): void {
    if (this.overflowed) return;

    this.buffer += token;

    // Check buffer overflow
    if (this.getBufferSize() > MAX_BUFFER_SIZE) {
      this.overflowed = true;
      this.callbacks.onError(
        "Buffer overflow: exceeded 512 KB without yielding a complete question object"
      );
      return;
    }

    // Try to extract questions from the buffer
    this.tryExtractQuestions();
  }

  /**
   * Signal end of stream. Flush remaining buffer, emit onDone with collected questions and warnings.
   */
  end(): void {
    if (this.overflowed) {
      // Already emitted error, just emit done with what we have
      this.callbacks.onDone(this.questions, this.warnings);
      return;
    }

    // Final attempt to extract any remaining questions
    this.tryExtractQuestions();

    // Check if there's remaining unparseable content
    const remaining = this.buffer.trim();
    if (remaining.length > 0) {
      this.warnings.push(
        `Skipped malformed content at end of stream: ${remaining.substring(0, 100)}${remaining.length > 100 ? "..." : ""}`
      );
    }

    this.callbacks.onDone(this.questions, this.warnings);
  }

  /**
   * Get current buffer size in bytes.
   */
  getBufferSize(): number {
    return new TextEncoder().encode(this.buffer).byteLength;
  }

  /**
   * Strip markdown code fences from the buffer content.
   */
  private stripMarkdownFences(text: string): string {
    // Remove opening fences: ```json, ```JSON, ```
    let result = text.replace(/```(?:json|JSON)?\s*/g, "");
    // Remove closing fences
    result = result.replace(/```/g, "");
    return result;
  }

  /**
   * Try to extract complete question objects from the buffer.
   * Looks for JSON objects with the required fields and emits them via callback.
   */
  private tryExtractQuestions(): void {
    // Strip markdown fences before attempting extraction
    const cleaned = this.stripMarkdownFences(this.buffer);

    // Try to find complete JSON objects in the cleaned buffer
    let searchStart = 0;

    while (searchStart < cleaned.length) {
      // Find the start of a JSON object
      const objStart = cleaned.indexOf("{", searchStart);
      if (objStart === -1) break;

      // Try to find the matching closing brace
      const result = this.findCompleteObject(cleaned, objStart);

      if (result === null) {
        // No complete object found yet, stop searching
        break;
      }

      const { jsonStr, endIndex } = result;

      try {
        const parsed = JSON.parse(jsonStr);

        if (this.isValidQuizQuestion(parsed)) {
          const question: QuizQuestion = {
            question: parsed.question,
            options: parsed.options,
            correctAnswer: parsed.correctAnswer,
            explanation: parsed.explanation,
          };

          this.questions.push(question);
          this.callbacks.onQuestion(question, this.currentIndex);
          this.currentIndex++;

          // Remove consumed portion from the original buffer
          // We need to map back from cleaned position to original buffer
          // Simpler approach: rebuild buffer from remaining cleaned content
          const remaining = cleaned.substring(endIndex + 1);
          this.buffer = remaining;
          // Restart extraction on the new buffer
          this.tryExtractQuestions();
          return;
        } else {
          // Valid JSON but not a valid question - record warning and skip
          this.warnings.push(
            `Skipped malformed question object: missing required fields`
          );
          // Move past this object and continue searching
          const remaining = cleaned.substring(endIndex + 1);
          this.buffer = remaining;
          this.tryExtractQuestions();
          return;
        }
      } catch {
        // JSON parse failed - might be incomplete, try next position
        searchStart = objStart + 1;
      }
    }

    // Update buffer to the cleaned version minus any fully consumed content
    // Only update if we haven't recursed
    if (searchStart > 0 && searchStart <= cleaned.length) {
      // Keep the buffer as-is since we couldn't extract anything complete
      // but update it to the fence-stripped version for cleaner subsequent parsing
      this.buffer = cleaned;
    } else {
      this.buffer = cleaned;
    }
  }

  /**
   * Find a complete JSON object starting at the given position.
   * Uses brace counting to handle nested objects.
   * Returns the JSON string and end index, or null if incomplete.
   */
  private findCompleteObject(
    text: string,
    startIndex: number
  ): { jsonStr: string; endIndex: number } | null {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\" && inString) {
        escaped = true;
        continue;
      }

      if (char === '"' && !escaped) {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          return {
            jsonStr: text.substring(startIndex, i + 1),
            endIndex: i,
          };
        }
      }
    }

    return null; // Incomplete object
  }

  /**
   * Validate that a parsed object has all required QuizQuestion fields.
   */
  private isValidQuizQuestion(obj: unknown): boolean {
    if (typeof obj !== "object" || obj === null) return false;

    const record = obj as Record<string, unknown>;

    return (
      typeof record.question === "string" &&
      Array.isArray(record.options) &&
      record.options.every((opt: unknown) => typeof opt === "string") &&
      typeof record.correctAnswer === "string" &&
      typeof record.explanation === "string"
    );
  }
}
