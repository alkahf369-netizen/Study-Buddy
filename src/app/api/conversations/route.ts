import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET — list all conversations (for sidebar, scoped to user)
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind');

    const where: any = { userId: session.user.id };
    if (kind) where.kind = kind;

    const conversations = await prisma.conversation.findMany({
      where,
      select: {
        id: true,
        title: true,
        kind: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(conversations);
  } catch (error: any) {
    console.error("[conversations] GET error:", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}

// POST — create a new conversation (linked to user)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, kind } = await req.json();

    const conversation = await prisma.conversation.create({
      data: {
        title: title || "New conversation",
        kind: kind || "chat",
        userId: session.user.id,
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error: any) {
    console.error("[conversations] POST error:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

// DELETE — bulk delete conversations by kind or all
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind');

    const where: any = { userId: session.user.id };
    if (kind) where.kind = kind;

    // Messages cascade-delete via Prisma relation (onDelete: Cascade)
    // So we only need to delete conversations
    const result = await prisma.conversation.deleteMany({ where });

    return NextResponse.json({ deleted: result.count });
  } catch (error: any) {
    console.error("[conversations] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete conversations" }, { status: 500 });
  }
}
