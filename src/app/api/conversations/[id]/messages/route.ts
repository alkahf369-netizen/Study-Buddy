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

    // Update conversation timestamp in background — don't block response
    prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    }).catch(() => {});

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error("[messages] POST error:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}

// PATCH — update message feedback (reaction) by message index
export async function PATCH(
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

    const { messageIndex, feedback } = await req.json();

    if (typeof messageIndex !== "number") {
      return NextResponse.json({ error: "messageIndex is required" }, { status: 400 });
    }

    // Get the message at the specified index (ordered by createdAt)
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (messageIndex < 0 || messageIndex >= messages.length) {
      return NextResponse.json({ error: "Invalid messageIndex" }, { status: 400 });
    }

    const targetMessageId = messages[messageIndex].id;

    // Update the reaction field (null/like/dislike)
    const validFeedback = feedback === "like" || feedback === "dislike" ? feedback : null;
    const updated = await prisma.message.update({
      where: { id: targetMessageId },
      data: { reaction: validFeedback },
    });

    return NextResponse.json({ ok: true, reaction: updated.reaction });
  } catch (error: any) {
    console.error("[messages] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}
