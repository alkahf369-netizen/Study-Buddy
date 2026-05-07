import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET — load a single conversation with all its messages (ownership check)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Ownership check
    if (conversation.userId && conversation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(conversation);
  } catch (error: any) {
    console.error("[conversation] GET error:", error);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}

// DELETE — delete a conversation and all its messages (ownership check)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (conversation.userId && conversation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[conversation] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
