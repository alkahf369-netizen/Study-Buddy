/**
 * Shared TypeScript interfaces for quiz streaming.
 * Used across file-router, streaming-parser, generate-quiz route, and client hook.
 */

export interface FilePayload {
  inlineData: {
    mimeType: string;
    data: string; // base64-encoded
  };
}

export interface DocumentPart {
  type: "document";
  document: {
    mimeType: string;
    data: string; // base64
  };
}

export interface ImageUrlPart {
  type: "image_url";
  image_url: {
    url: string; // data:mimeType;base64,data
  };
}

export type FormattedFilePart = DocumentPart | ImageUrlPart;

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuestionEvent {
  index: number;
  data: QuizQuestion;
}

export interface DoneEvent {
  id: string | null;
  totalCount: number;
  incomplete: boolean;
  warnings?: string[];
  fallbackData?: QuizQuestion[];
}

export interface ErrorEvent {
  message: string;
}

export type SSEEventType = "question" | "done" | "error";

export interface PageRange {
  startPage: number;  // 1-indexed, inclusive
  endPage: number;    // 1-indexed, inclusive
}

export interface PdfMetadataRequest {
  base64Data: string;
  mimeType: string;
  startPage?: number;
  endPage?: number;
}

export interface PdfMetadataResponse {
  pageCount: number;
  charCount?: number;
}
