import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = await params;
    const pathArray = resolvedParams.path || [];
    
    // Defensive check to avoid path traversal
    if (pathArray.some(p => p.includes('..'))) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', 'images', ...pathArray);

    if (!existsSync(filePath)) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);

    // Get search params to check if it's a download request
    const url = new URL(req.url);
    const isDownload = url.searchParams.has('download');
    const filename = pathArray[pathArray.length - 1] || 'image.png';

    const headers = new Headers();
    headers.set('Content-Type', 'image/png');
    // Set cache control for performance
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    if (isDownload) {
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      headers.set('Content-Disposition', 'inline');
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("[api/uploads] Error serving file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
