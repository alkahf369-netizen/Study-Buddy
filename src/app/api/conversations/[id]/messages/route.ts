import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// POST — save a new message to a conversation (ownership check)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.userId && conversation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { role, content, model, provider, files } = await req.json();

    if (!role || content === undefined) {
      return NextResponse.json({ error: "role and content are required" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        role,
        content: content || "",
        model: model || null,
        provider: provider || null,
        files: files ? JSON.stringify(files) : null,
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error("[messages] POST error:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
