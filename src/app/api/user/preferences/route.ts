import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/preferences
 * Returns the authenticated user's preferences (defaultModelId, sendOnEnter).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (!prefs) {
      return NextResponse.json({
        defaultModelId: null,
        sendOnEnter: true,
      });
    }

    return NextResponse.json({
      defaultModelId: prefs.defaultModelId,
      sendOnEnter: prefs.sendOnEnter,
    });
  } catch (error: any) {
    console.error("[preferences GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/user/preferences
 * Updates the authenticated user's preferences.
 * Body: { defaultModelId?: string, sendOnEnter?: boolean }
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { defaultModelId, sendOnEnter } = body;

    const data: { defaultModelId?: string | null; sendOnEnter?: boolean } = {};
    if (defaultModelId !== undefined) data.defaultModelId = defaultModelId || null;
    if (sendOnEnter !== undefined) data.sendOnEnter = !!sendOnEnter;

    const prefs = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        defaultModelId: data.defaultModelId ?? null,
        sendOnEnter: data.sendOnEnter ?? true,
      },
    });

    return NextResponse.json({
      defaultModelId: prefs.defaultModelId,
      sendOnEnter: prefs.sendOnEnter,
    });
  } catch (error: any) {
    console.error("[preferences PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
