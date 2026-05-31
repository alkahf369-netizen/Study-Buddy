import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: imagePath } = await req.json();

    if (!imagePath || typeof imagePath !== 'string') {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Security: only allow deleting from /uploads/images/ and only from user's own folder
    const userId = session.user.id;
    const userFolder = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 12);

    // Validate the path belongs to this user
    if (!imagePath.startsWith(`/uploads/images/${userFolder}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent path traversal
    const normalizedPath = path.normalize(imagePath);
    if (normalizedPath.includes('..')) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', normalizedPath);

    if (existsSync(filePath)) {
      await unlink(filePath);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[delete-image] Error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
