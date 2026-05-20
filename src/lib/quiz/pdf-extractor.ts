import { PDFParse } from "pdf-parse";
import { FilePayload } from "./types";
import { validatePageRange } from "./page-range-validator";

/**
 * Result of extracting text from a single PDF file.
 */
export interface ExtractionResult {
  text: string;
  pageCount: number;
}

/**
 * Gets the total page count of a PDF without extracting all text.
 * Uses getText({ first: 1, last: 1 }) for efficiency — only processes page 1
 * but still returns the total page count via textResult.total.
 *
 * @param base64Data - The base64-encoded PDF file data
 * @returns The total number of pages in the PDF
 * @throws Error if the PDF is corrupted, password-protected, or has zero pages
 */
export async function getPageCount(base64Data: string): Promise<number> {
  let textResult;
  let parser: PDFParse | undefined;
  try {
    const buffer = Buffer.from(base64Data, "base64");
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    textResult = await parser.getText({ first: 1, last: 1 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    if (
      message.toLowerCase().includes("password") ||
      message.toLowerCase().includes("encrypted")
    ) {
      throw new Error("Failed to process PDF: password required");
    }
    throw new Error(`Failed to process PDF: ${message}`);
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }

  const total = textResult.total;

  if (total === 0) {
    throw new Error("PDF has no extractable pages");
  }

  return total;
}

/**
 * Decodes base64-encoded PDF data and extracts text content using pdf-parse.
 *
 * @param base64Data - The base64-encoded PDF file data
 * @returns The extracted text and page count
 * @throws Error with descriptive message if pdf-parse fails or text is empty/whitespace-only
 */
export async function extractTextFromPdf(
  base64Data: string
): Promise<ExtractionResult> {
  let textResult;
  let parser: PDFParse | undefined;
  try {
    const buffer = Buffer.from(base64Data, "base64");
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    textResult = await parser.getText();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to process PDF: ${message}`
    );
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }

  const text = textResult.text;

  if (!text || text.trim().length === 0) {
    throw new Error(
      "PDF has no extractable text content"
    );
  }

  return {
    text: text,
    pageCount: textResult.total,
  };
}

/**
 * Extracts text from a specific page range of a PDF (1-indexed, inclusive).
 * Uses pdf-parse v2 ParseParameters.first and ParseParameters.last to extract
 * only the specified pages.
 *
 * @param base64Data - The base64-encoded PDF file data
 * @param startPage - The first page to extract (1-indexed, inclusive)
 * @param endPage - The last page to extract (1-indexed, inclusive)
 * @returns The extracted text and total page count of the document
 * @throws Error if the page range is invalid, out of bounds, or selected pages have no text
 */
export async function extractTextFromPdfRange(
  base64Data: string,
  startPage: number,
  endPage: number
): Promise<ExtractionResult> {
  // Validate page range (without totalPages — we'll check bounds after parsing)
  const validation = validatePageRange({ startPage, endPage });
  if (!validation.valid) {
    throw new Error(validation.error!);
  }

  let textResult;
  let parser: PDFParse | undefined;
  try {
    const buffer = Buffer.from(base64Data, "base64");
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    textResult = await parser.getText({ first: startPage, last: endPage });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    if (
      message.toLowerCase().includes("password") ||
      message.toLowerCase().includes("encrypted")
    ) {
      throw new Error("Failed to process PDF: password required");
    }
    throw new Error(`Failed to process PDF: ${message}`);
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }

  const totalPages = textResult.total;

  // Validate that the page range is within bounds
  if (endPage > totalPages) {
    throw new Error(
      `Page range out of bounds: document has ${totalPages} pages`
    );
  }

  const text = textResult.text;

  if (!text || text.trim().length === 0) {
    throw new Error("Selected pages contain no extractable text");
  }

  return {
    text: text,
    pageCount: totalPages,
  };
}

/**
 * Estimates the character count for a specific page range of a PDF.
 * Reuses extractTextFromPdfRange internally and returns the text length.
 *
 * @param base64Data - The base64-encoded PDF file data
 * @param startPage - The first page to extract (1-indexed, inclusive)
 * @param endPage - The last page to extract (1-indexed, inclusive)
 * @returns The number of characters in the extracted text
 * @throws Error if the page range is invalid or extraction fails
 */
export async function estimateCharCount(
  base64Data: string,
  startPage: number,
  endPage: number
): Promise<number> {
  const result = await extractTextFromPdfRange(base64Data, startPage, endPage);
  return result.text.length;
}

/**
 * Extracts text from multiple PDF files and concatenates the results
 * separated by newline characters.
 *
 * @param files - Array of FilePayload objects containing base64-encoded PDF data
 * @returns Concatenated extracted text from all PDFs, joined by newline
 * @throws Error if any individual PDF extraction fails or yields empty text
 */
export async function extractTextFromMultiplePdfs(
  files: FilePayload[]
): Promise<string> {
  const results: string[] = [];

  for (const file of files) {
    const extraction = await extractTextFromPdf(file.inlineData.data);
    results.push(extraction.text);
  }

  return results.join("\n");
}
