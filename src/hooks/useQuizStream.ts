"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { QuizQuestion, DoneEvent } from "@/lib/quiz/types";

export interface QuizGeneratePayload {
  text?: string;
  files?: Array<{ inlineData: { mimeType: string; data: string } }>;
  modelId?: string;
  pageRanges?: Record<number, { startPage: number; endPage: number }>;
}

export interface UseQuizStreamOptions {
  onQuestion?: (question: QuizQuestion, index: number) => void;
  onDone?: (event: DoneEvent) => void;
  onError?: (message: string) => void;
}

export interface UseQuizStreamReturn {
  questions: QuizQuestion[];
  isStreaming: boolean;
  error: string | null;
  totalCount: number | null;
  quizId: string | null;
  startStream: (payload: QuizGeneratePayload) => void;
  abort: () => void;
}

const CONNECTION_TIMEOUT_MS = 30_000;

/**
 * Parses raw SSE text into individual events.
 * SSE events are separated by double newlines.
 * Each event has optional `event:` and `data:` lines.
 */
function parseSSEEvents(
  raw: string
): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = raw.split("\n\n");

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    let eventType = "message";
    let data = "";

    const lines = trimmed.split("\n");
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice("data:".length).trim();
      }
    }

    if (data) {
      events.push({ event: eventType, data });
    }
  }

  return events;
}

export function useQuizStream(
  options?: UseQuizStreamOptions
): UseQuizStreamReturn {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref up to date without causing re-renders
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const clearTimeout_ = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetTimeout = useCallback(() => {
    clearTimeout_();
    timeoutRef.current = setTimeout(() => {
      // Timeout fired — no events received within 30s
      setError("Connection failed: no response received within 30 seconds");
      setIsStreaming(false);
      // Abort the fetch
      abortControllerRef.current?.abort();
    }, CONNECTION_TIMEOUT_MS);
  }, [clearTimeout_]);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    clearTimeout_();
    setIsStreaming(false);
  }, [clearTimeout_]);

  const startStream = useCallback(
    (payload: QuizGeneratePayload) => {
      // Reset state for new stream
      setQuestions([]);
      setIsStreaming(true);
      setError(null);
      setTotalCount(null);
      setQuizId(null);

      // Abort any existing stream
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Start connection timeout
      resetTimeout();

      (async () => {
        try {
          const response = await fetch("/api/generate-quiz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          // Handle pre-stream errors (JSON error responses)
          if (!response.ok) {
            clearTimeout_();
            let message = `Server error: ${response.status}`;
            try {
              const errorBody = await response.json();
              if (errorBody.error) {
                message = errorBody.error;
              }
            } catch {
              // Could not parse error body, use default message
            }
            setError(message);
            setIsStreaming(false);
            optionsRef.current?.onError?.(message);
            return;
          }

          if (!response.body) {
            clearTimeout_();
            const message = "No response body received";
            setError(message);
            setIsStreaming(false);
            optionsRef.current?.onError?.(message);
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Stream ended — process any remaining buffer
              if (buffer.trim()) {
                const events = parseSSEEvents(buffer);
                processEvents(events);
              }
              clearTimeout_();
              // If we're still streaming (no done event received), finalize
              setIsStreaming((current) => {
                if (current) {
                  // Stream ended without a done event
                  return false;
                }
                return current;
              });
              break;
            }

            // Reset timeout on each chunk received
            resetTimeout();

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE events (separated by \n\n)
            const lastDoubleNewline = buffer.lastIndexOf("\n\n");
            if (lastDoubleNewline !== -1) {
              const complete = buffer.slice(0, lastDoubleNewline + 2);
              buffer = buffer.slice(lastDoubleNewline + 2);

              const events = parseSSEEvents(complete);
              processEvents(events);
            }
          }
        } catch (err: unknown) {
          clearTimeout_();
          if (err instanceof Error && err.name === "AbortError") {
            // Intentional abort — don't set error
            setIsStreaming(false);
            return;
          }
          const message =
            err instanceof Error
              ? err.message
              : "Connection failed unexpectedly";
          setError(message);
          setIsStreaming(false);
          optionsRef.current?.onError?.(message);
        }
      })();

      function processEvents(
        events: Array<{ event: string; data: string }>
      ) {
        for (const evt of events) {
          try {
            const parsed = JSON.parse(evt.data);

            switch (evt.event) {
              case "question": {
                const question = parsed.data as QuizQuestion;
                const index = parsed.index as number;
                setQuestions((prev) => [...prev, question]);
                optionsRef.current?.onQuestion?.(question, index);
                break;
              }
              case "done": {
                const doneEvent = parsed as DoneEvent;
                setTotalCount(doneEvent.totalCount);
                setQuizId(doneEvent.id);
                setIsStreaming(false);
                clearTimeout_();
                optionsRef.current?.onDone?.(doneEvent);
                break;
              }
              case "error": {
                const errorMessage = parsed.message as string;
                setError(errorMessage);
                setIsStreaming(false);
                clearTimeout_();
                controller.abort();
                optionsRef.current?.onError?.(errorMessage);
                break;
              }
            }
          } catch {
            // Skip malformed event data
          }
        }
      }
    },
    [resetTimeout, clearTimeout_]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    questions,
    isStreaming,
    error,
    totalCount,
    quizId,
    startStream,
    abort,
  };
}
