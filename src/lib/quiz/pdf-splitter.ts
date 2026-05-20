import { PDFDocument } from "pdf-lib";

/**
 * Splits a PDF by extracting specific pages into a new, smaller PDF.
 * Uses pdf-lib (pure JS, no native dependencies).
 *
 * @param base64Data - The base64-encoded source PDF
 * @param startPage - First page to include (1-indexed, inclusive)
 * @param endPage - Last page to include (1-indexed, inclusive)
 * @returns base64-encoded PDF containing only the selected pages
 */
export async function splitPdfPages(
  base64Data: string,
  startPage: number,
  endPage: number
): Promise<{ base64: string; pageCount: number; totalPages: number }> {
  // Decode the source PDF
  const sourceBytes = Buffer.from(base64Data, "base64");
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const totalPages = sourcePdf.getPageCount();

  // Validate page range
  if (startPage < 1) {
    throw new Error("Start page must be at least 1");
  }
  if (endPage > totalPages) {
    throw new Error(
      `End page (${endPage}) exceeds total pages (${totalPages})`
    );
  }
  if (startPage > endPage) {
    throw new Error("Start page must be ≤ end page");
  }

  // Create a new PDF with only the selected pages
  const newPdf = await PDFDocument.create();

  // pdf-lib uses 0-indexed pages
  const pageIndices: number[] = [];
  for (let i = startPage - 1; i < endPage; i++) {
    pageIndices.push(i);
  }

  const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
  for (const page of copiedPages) {
    newPdf.addPage(page);
  }

  // Serialize the new PDF to bytes
  const newPdfBytes = await newPdf.save();
  const newBase64 = Buffer.from(newPdfBytes).toString("base64");

  return {
    base64: newBase64,
    pageCount: copiedPages.length,
    totalPages,
  };
}

/**
 * Gets the total page count of a PDF using pdf-lib.
 * More reliable than pdf-parse for page counting.
 */
export async function getPdfPageCount(base64Data: string): Promise<number> {
  const bytes = Buffer.from(base64Data, "base64");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}
