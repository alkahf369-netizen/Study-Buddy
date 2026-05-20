import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetText = vi.fn();
const mockDestroy = vi.fn().mockResolvedValue(undefined);

vi.mock("pdf-parse", () => {
  return {
    PDFParse: class MockPDFParse {
      constructor() {
        // constructor
      }
      getText = mockGetText;
      destroy = mockDestroy;
    },
  };
});

import { getPageCount } from "../pdf-extractor";

describe("getPageCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDestroy.mockResolvedValue(undefined);
  });

  it("returns the total page count for a valid PDF", async () => {
    mockGetText.mockResolvedValue({
      text: "Page 1 content",
      total: 42,
      pages: [{ text: "Page 1 content" }],
    });

    const base64Data = Buffer.from("Hello PDF content").toString("base64");
    const result = await getPageCount(base64Data);

    expect(result).toBe(42);
  });

  it("uses getText with first:1, last:1 for efficiency", async () => {
    mockGetText.mockResolvedValue({
      text: "Page 1",
      total: 10,
      pages: [{ text: "Page 1" }],
    });

    const base64Data = Buffer.from("test").toString("base64");
    await getPageCount(base64Data);

    expect(mockGetText).toHaveBeenCalledWith({ first: 1, last: 1 });
  });

  it("throws descriptive error for corrupted PDF", async () => {
    mockGetText.mockRejectedValue(new Error("Invalid PDF structure"));

    const base64Data = Buffer.from("not a pdf").toString("base64");

    await expect(getPageCount(base64Data)).rejects.toThrow(
      "Failed to process PDF: Invalid PDF structure"
    );
  });

  it("throws specific error for password-protected PDF", async () => {
    mockGetText.mockRejectedValue(new Error("PDF requires a password to open"));

    const base64Data = Buffer.from("encrypted pdf").toString("base64");

    await expect(getPageCount(base64Data)).rejects.toThrow(
      "Failed to process PDF: password required"
    );
  });

  it("throws specific error for encrypted PDF", async () => {
    mockGetText.mockRejectedValue(new Error("Document is encrypted"));

    const base64Data = Buffer.from("encrypted pdf").toString("base64");

    await expect(getPageCount(base64Data)).rejects.toThrow(
      "Failed to process PDF: password required"
    );
  });

  it("throws error for zero-page PDF", async () => {
    mockGetText.mockResolvedValue({
      text: "",
      total: 0,
      pages: [],
    });

    const base64Data = Buffer.from("empty pdf").toString("base64");

    await expect(getPageCount(base64Data)).rejects.toThrow(
      "PDF has no extractable pages"
    );
  });

  it("always calls destroy on the parser (cleanup)", async () => {
    mockGetText.mockResolvedValue({
      text: "content",
      total: 5,
      pages: [{ text: "content" }],
    });

    const base64Data = Buffer.from("test").toString("base64");
    await getPageCount(base64Data);

    expect(mockDestroy).toHaveBeenCalled();
  });

  it("calls destroy even when getText throws", async () => {
    mockGetText.mockRejectedValue(new Error("some error"));

    const base64Data = Buffer.from("test").toString("base64");

    await expect(getPageCount(base64Data)).rejects.toThrow();
    expect(mockDestroy).toHaveBeenCalled();
  });
});
