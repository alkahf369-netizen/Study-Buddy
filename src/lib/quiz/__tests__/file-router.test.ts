import { describe, it, expect } from "vitest";
import { formatFilePart, validateAndFormatFiles, FileSizeError } from "../file-router";
import type { FilePayload } from "../types";

describe("formatFilePart", () => {
  it("formats application/pdf as DocumentPart", () => {
    const file: FilePayload = {
      inlineData: {
        mimeType: "application/pdf",
        data: "SGVsbG8gV29ybGQ=", // "Hello World" in base64
      },
    };

    const result = formatFilePart(file);

    expect(result).toEqual({
      type: "document",
      document: {
        mimeType: "application/pdf",
        data: "SGVsbG8gV29ybGQ=",
      },
    });
  });

  it("formats image/png as ImageUrlPart", () => {
    const file: FilePayload = {
      inlineData: {
        mimeType: "image/png",
        data: "iVBORw0KGgo=",
      },
    };

    const result = formatFilePart(file);

    expect(result).toEqual({
      type: "image_url",
      image_url: {
        url: "data:image/png;base64,iVBORw0KGgo=",
      },
    });
  });

  it("formats image/jpeg as ImageUrlPart", () => {
    const file: FilePayload = {
      inlineData: {
        mimeType: "image/jpeg",
        data: "abc123",
      },
    };

    const result = formatFilePart(file);

    expect(result).toEqual({
      type: "image_url",
      image_url: {
        url: "data:image/jpeg;base64,abc123",
      },
    });
  });

  it("throws for unsupported mimeType", () => {
    const file: FilePayload = {
      inlineData: {
        mimeType: "text/plain",
        data: "SGVsbG8=",
      },
    };

    expect(() => formatFilePart(file)).toThrow("Unsupported file type: text/plain");
  });

  it("throws for missing mimeType", () => {
    const file = {
      inlineData: {
        mimeType: "",
        data: "SGVsbG8=",
      },
    } as FilePayload;

    expect(() => formatFilePart(file)).toThrow("Unsupported file type: mimeType is missing");
  });
});

describe("validateAndFormatFiles", () => {
  it("validates and formats multiple files", () => {
    const files: FilePayload[] = [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: "SGVsbG8=", // small file
        },
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: "iVBORw0KGgo=",
        },
      },
    ];

    const result = validateAndFormatFiles(files);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("document");
    expect(result[1].type).toBe("image_url");
  });

  it("rejects files exceeding 10 MB with FileSizeError", () => {
    // Create a base64 string that decodes to > 10 MB
    // 10,485,760 bytes decoded = ceil(10485760 * 4/3) = 13,981,014 base64 chars (approx)
    // We'll use a string of 'A' repeated enough to exceed the limit
    // Each 4 base64 chars = 3 bytes, so we need > 13,981,014 chars
    const oversizedBase64 = "A".repeat(14_000_000); // decodes to ~10.5 MB

    const files: FilePayload[] = [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: oversizedBase64,
        },
      },
    ];

    expect(() => validateAndFormatFiles(files)).toThrow(FileSizeError);
    expect(() => validateAndFormatFiles(files)).toThrow(/exceeds the maximum allowed size/);
  });

  it("accepts files at exactly 10 MB boundary", () => {
    // 10,485,760 bytes = (base64_len * 3) / 4
    // base64_len = (10,485,760 * 4) / 3 = 13,981,013.33 → need 13,981,016 chars (multiple of 4)
    // But with padding, let's compute: 10,485,760 bytes → base64 length without padding
    // Actually, let's just use a size that's exactly at the boundary
    // 13,981,012 base64 chars (no padding) = 10,485,759 bytes → should pass
    const exactBoundaryBase64 = "A".repeat(13_981_012);

    const files: FilePayload[] = [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: exactBoundaryBase64,
        },
      },
    ];

    // Should not throw
    expect(() => validateAndFormatFiles(files)).not.toThrow();
  });

  it("throws for unsupported mimeType during validation", () => {
    const files: FilePayload[] = [
      {
        inlineData: {
          mimeType: "video/mp4",
          data: "SGVsbG8=",
        },
      },
    ];

    expect(() => validateAndFormatFiles(files)).toThrow("Unsupported file type: video/mp4");
  });

  it("returns empty array for empty input", () => {
    const result = validateAndFormatFiles([]);
    expect(result).toEqual([]);
  });
});
