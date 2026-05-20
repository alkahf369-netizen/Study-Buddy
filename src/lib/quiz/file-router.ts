/**
 * File Router — validates and formats file payloads based on MIME type.
 *
 * Routes:
 * - application/pdf → DocumentPart (base64 data + mimeType)
 * - image/* → ImageUrlPart (data URI)
 * - other/missing → throws unsupported file type error
 *
 * Also enforces file size limits per file:
 * - 10 MB (10,485,760 bytes) for images and PDFs without page range
 * - 50 MB (52,428,800 bytes) for PDFs with page range selection
 */

import type { FilePayload, FormattedFilePart, DocumentPart, ImageUrlPart } from "./types";

/** Maximum allowed decoded file size: 10 MB (default) */
const MAX_FILE_SIZE_BYTES = 10_485_760;

/** Maximum allowed decoded file size for PDFs with page range: 50 MB */
const MAX_PDF_PAGE_RANGE_SIZE_BYTES = 52_428_800;

/**
 * Formats a single file payload into the appropriate AI API content part
 * based on its MIME type.
 *
 * @throws Error if mimeType is missing, empty, or unsupported
 */
export function formatFilePart(file: FilePayload): FormattedFilePart {
  const mimeType = file.inlineData?.mimeType;

  if (!mimeType) {
    throw new Error("Unsupported file type: mimeType is missing");
  }

  if (mimeType === "application/pdf") {
    const part: DocumentPart = {
      type: "document",
      document: {
        mimeType: mimeType,
        data: file.inlineData.data,
      },
    };
    return part;
  }

  if (mimeType.startsWith("image/")) {
    const part: ImageUrlPart = {
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${file.inlineData.data}`,
      },
    };
    return part;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Validates file size and formats all files in a request payload.
 *
 * Validation:
 * - Each file's base64-decoded size must be within the applicable limit
 * - PDF files with hasPageRange: 50 MB (52,428,800 bytes)
 * - All other files (images, PDFs without page range): 10 MB (10,485,760 bytes)
 * - Each file must have a supported mimeType (application/pdf or image/*)
 *
 * @throws Error with HTTP 413 semantics if a file exceeds the size limit
 * @throws Error if a file has an unsupported or missing mimeType
 */
export function validateAndFormatFiles(
  files: FilePayload[],
  options?: { hasPageRange?: boolean }
): FormattedFilePart[] {
  return files.map((file, index) => {
    // Validate file size (base64 decoded)
    const base64Data = file.inlineData?.data ?? "";
    const decodedSize = getDecodedBase64Size(base64Data);

    // Determine the applicable size limit
    const mimeType = file.inlineData?.mimeType ?? "";
    const isPdf = mimeType === "application/pdf";
    const maxSize = (isPdf && options?.hasPageRange)
      ? MAX_PDF_PAGE_RANGE_SIZE_BYTES
      : MAX_FILE_SIZE_BYTES;
    const limitLabel = maxSize === MAX_PDF_PAGE_RANGE_SIZE_BYTES ? "50 MB" : "10 MB";

    if (decodedSize > maxSize) {
      throw new FileSizeError(
        `File ${index + 1} exceeds the maximum allowed size of ${limitLabel} (${formatBytes(decodedSize)} decoded)`,
      );
    }

    // Format the file part (will throw for unsupported mimeType)
    return formatFilePart(file);
  });
}

/**
 * Calculates the decoded byte size of a base64 string without actually decoding it.
 * Accounts for padding characters ('=').
 */
function getDecodedBase64Size(base64: string): number {
  if (!base64) return 0;

  // Remove any whitespace/newlines that might be in the base64 string
  const cleaned = base64.replace(/\s/g, "");
  const len = cleaned.length;

  if (len === 0) return 0;

  // Count padding characters
  let padding = 0;
  if (cleaned[len - 1] === "=") padding++;
  if (cleaned[len - 2] === "=") padding++;

  // Decoded size = (base64 length / 4) * 3 - padding
  return (len * 3) / 4 - padding;
}

/**
 * Formats byte count into a human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Custom error class for file size violations (HTTP 413 semantics).
 */
export class FileSizeError extends Error {
  public readonly statusCode = 413;

  constructor(message: string) {
    super(message);
    this.name = "FileSizeError";
  }
}
