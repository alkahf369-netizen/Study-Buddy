import { NextResponse } from 'next/server';
import { getPdfPageCount } from '@/lib/quiz/pdf-splitter';
import { validatePageRange } from '@/lib/quiz/page-range-validator';

export async function POST(req: Request) {
  try {
    const { base64Data, mimeType, startPage, endPage } = await req.json();

    // Validate required fields
    if (!base64Data || typeof base64Data !== 'string') {
      return NextResponse.json(
        { error: 'base64Data is required and must be a string' },
        { status: 400 }
      );
    }

    if (mimeType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'mimeType must be application/pdf' },
        { status: 400 }
      );
    }

    // Get page count using pdf-lib (reliable, no worker issues)
    let pageCount: number;
    try {
      pageCount = await getPdfPageCount(base64Data);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to process PDF' },
        { status: 422 }
      );
    }

    if (pageCount === 0) {
      return NextResponse.json(
        { error: 'PDF has no pages' },
        { status: 422 }
      );
    }

    // If startPage/endPage provided, validate the range
    if (startPage !== undefined && endPage !== undefined) {
      const validation = validatePageRange({ startPage, endPage }, pageCount);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ pageCount });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
